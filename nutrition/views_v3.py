"""Appointments, packages, the client phone app and the Today screen."""
from datetime import time as dtime, timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Appointment, AppointmentType, Calendar, CheckInLink, ClientPackage, DayLog, UserProfile,
)
from .scheduling import (
    adherence, appointment_json, appointments_for, calendars_for, create_calendar, free_slots, last_log_date,
    latest_plan, local_now, package_json, parse_day, phone_digits, plan_meals, today_summary,
)
from .serializers import WorkoutTemplateSerializer
from .services import client_qs, describe_week, smart_grocery

CAL_FIELDS = ('name', 'color', 'timezone', 'hours', 'break_start', 'break_end', 'slot_minutes', 'currency',
              'pay_online', 'pay_at_clinic', 'booking_open', 'reminders', 'active')
TYPE_FIELDS = ('name', 'name_ar', 'minutes', 'price', 'color', 'online', 'order', 'active')


def _money(value, default=Decimal('0')):
    try:
        return max(Decimal(str(value)), Decimal('0')).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _time(value):
    try:
        h, m = str(value).split(':')[:2]
        return dtime(int(h), int(m))
    except (TypeError, ValueError):
        return None


def _bool(value):
    return str(value).lower() in ('true', '1', 'yes', 'on')


def online_payment_ready():
    """Online card payment needs a payment provider account; until one is connected it stays off."""
    import os
    return bool(os.getenv('PAYMENT_PROVIDER'))


def calendar_json(cal):
    return {
        **{f: getattr(cal, f) for f in CAL_FIELDS}, 'id': cal.id, 'slug': cal.slug, 'owner': cal.user_id,
        'types': [type_json(t) for t in cal.types.all()],
        'online_payment_ready': online_payment_ready(),
    }


def type_json(t):
    return {**{f: getattr(t, f) for f in TYPE_FIELDS}, 'id': t.id, 'price': float(t.price)}


def _clean_hours(raw, fallback):
    out = {}
    for d in range(7):
        day = (raw or {}).get(str(d)) or (fallback or {}).get(str(d)) or {}
        start, end = str(day.get('start') or '10:00')[:5], str(day.get('end') or '17:00')[:5]
        out[str(d)] = {'on': bool(day.get('on')), 'start': start if _time(start) else '10:00',
                       'end': end if _time(end) else '17:00'}
    return out


def _apply_calendar(cal, data):
    for f in CAL_FIELDS:
        if f not in data:
            continue
        v = data[f]
        if f == 'hours':
            v = _clean_hours(v, cal.hours)
        elif f in ('pay_online', 'pay_at_clinic', 'booking_open', 'reminders', 'active'):
            v = _bool(v)
        elif f == 'slot_minutes':
            v = min(max(int(v or 30), 10), 120)
        elif f in ('break_start', 'break_end'):
            v = str(v or '')[:5] if (not v or _time(v)) else getattr(cal, f)
        else:
            v = str(v or '')[:100] or getattr(cal, f)
        setattr(cal, f, v)
    if not cal.pay_online and not cal.pay_at_clinic:
        cal.pay_at_clinic = True


# ------------------------------------------------------------ calendars ---

class CalendarListView(APIView):
    def get(self, request):
        cals = calendars_for(request.user).prefetch_related('types').order_by('created_at')
        if not cals.exists():
            name = (request.user.first_name or 'My') + ("'s calendar" if request.user.first_name else ' calendar')
            create_calendar(request.user, name)
            cals = calendars_for(request.user).prefetch_related('types').order_by('created_at')
        return Response([calendar_json(c) for c in cals])

    def post(self, request):
        name = str(request.data.get('name') or '').strip()[:100]
        if not name:
            return Response({'detail': 'name_required'}, status=400)
        cal = create_calendar(request.user, name)
        _apply_calendar(cal, {k: v for k, v in request.data.items() if k != 'name'})
        cal.save()
        return Response(calendar_json(cal), status=201)


class CalendarDetailView(APIView):
    def put(self, request, calendar_id):
        cal = get_object_or_404(calendars_for(request.user), id=calendar_id)
        _apply_calendar(cal, request.data)
        cal.save()
        return Response(calendar_json(cal))

    def delete(self, request, calendar_id):
        cal = get_object_or_404(calendars_for(request.user), id=calendar_id)
        if cal.appointments.exclude(status='cancelled').exists():
            cal.active = False  # keep the history
            cal.booking_open = False
            cal.save(update_fields=['active', 'booking_open'])
        else:
            cal.delete()
        return Response(status=204)


class AppointmentTypeListView(APIView):
    def post(self, request, calendar_id):
        cal = get_object_or_404(calendars_for(request.user), id=calendar_id)
        t = AppointmentType(calendar=cal, order=cal.types.count())
        _apply_type(t, request.data)
        if not t.name:
            return Response({'detail': 'name_required'}, status=400)
        t.save()
        return Response(type_json(t), status=201)


def _apply_type(t, data):
    for f in TYPE_FIELDS:
        if f not in data:
            continue
        v = data[f]
        if f == 'price':
            v = _money(v)
        elif f in ('minutes', 'order'):
            v = min(max(int(v or 0), 0 if f == 'order' else 5), 480)
        elif f in ('online', 'active'):
            v = _bool(v)
        else:
            v = str(v or '')[:100]
        setattr(t, f, v)


class AppointmentTypeDetailView(APIView):
    def put(self, request, type_id):
        t = get_object_or_404(AppointmentType, id=type_id, calendar__in=calendars_for(request.user))
        _apply_type(t, request.data)
        t.save()
        return Response(type_json(t))

    def delete(self, request, type_id):
        t = get_object_or_404(AppointmentType, id=type_id, calendar__in=calendars_for(request.user))
        if t.appointments.exists():
            t.active = False
            t.save(update_fields=['active'])
        else:
            t.delete()
        return Response(status=204)


# --------------------------------------------------------- appointments ---

def _apply_appointment(a, data, user):
    """Set fields from the request. Returns an error code or None."""
    if 'calendar' in data:
        a.calendar = get_object_or_404(calendars_for(user), id=data['calendar'])
    if 'type' in data:
        a.type = AppointmentType.objects.filter(id=data['type'], calendar=a.calendar).first() if data['type'] else None
        if a.type and 'minutes' not in data:
            a.minutes = a.type.minutes
        if a.type and 'price' not in data and not a.paid:
            a.price = a.type.price
    if 'client' in data:
        a.client = client_qs(user).filter(id=data['client']).first() if data['client'] else None
    for f in ('guest_name', 'guest_phone', 'notes'):
        if f in data:
            setattr(a, f, str(data[f] or '')[:5000 if f == 'notes' else 100])
    if 'date' in data:
        d = parse_day(data['date'])
        if not d:
            return 'bad_date'
        a.date = d
    if 'time' in data:
        t = _time(data['time'])
        if not t:
            return 'bad_time'
        a.time = t
    if 'minutes' in data:
        a.minutes = min(max(int(data['minutes'] or 30), 5), 480)
    if 'price' in data:
        a.price = _money(data['price'])
    if 'status' in data and data['status'] in dict(Appointment.STATUS):
        a.status = data['status']
    if 'pay_method' in data and data['pay_method'] in dict(Appointment.PAY_METHODS):
        a.pay_method = data['pay_method']
    if 'paid' in data:
        a.paid = _bool(data['paid'])
        if not a.paid:
            a.paid_via = ''
    if 'paid_via' in data and data['paid_via'] in dict(Appointment.PAID_VIA):
        a.paid_via = data['paid_via']
        if a.paid_via:
            a.paid = True
    if 'package' in data:
        a.package = ClientPackage.objects.filter(id=data['package'], client=a.client).first() if data['package'] and a.client_id else None
        if a.package:
            a.paid, a.paid_via = True, 'package'
    if not a.client_id and not a.guest_name:
        return 'name_required'
    return None


class AppointmentListView(APIView):
    def get(self, request):
        today = timezone.localdate()
        start = parse_day(request.query_params.get('start'), today)
        end = parse_day(request.query_params.get('end'), start + timedelta(days=6))
        qs = appointments_for(request.user).filter(date__gte=start, date__lte=end).select_related('calendar', 'type', 'client')
        if request.query_params.get('client'):
            qs = appointments_for(request.user).filter(client_id=request.query_params['client']).select_related(
                'calendar', 'type', 'client').order_by('-date', '-time')
        return Response([appointment_json(a) for a in qs])

    def post(self, request):
        data = request.data
        cal = get_object_or_404(calendars_for(request.user), id=data.get('calendar'))
        a = Appointment(calendar=cal, source='dietitian', date=timezone.localdate(), time=dtime(10, 0))
        error = _apply_appointment(a, data, request.user)
        if error:
            return Response({'detail': error}, status=400)
        a.save()
        return Response(appointment_json(a), status=201)


class AppointmentDetailView(APIView):
    def _get(self, request, appointment_id):
        return get_object_or_404(appointments_for(request.user).select_related('calendar', 'type', 'client'), id=appointment_id)

    def get(self, request, appointment_id):
        return Response(appointment_json(self._get(request, appointment_id)))

    def put(self, request, appointment_id):
        a = self._get(request, appointment_id)
        error = _apply_appointment(a, request.data, request.user)
        if error:
            return Response({'detail': error}, status=400)
        a.save()
        return Response(appointment_json(a))

    def delete(self, request, appointment_id):
        self._get(request, appointment_id).delete()
        return Response(status=204)


class AppointmentReminderView(APIView):
    """The dietitian pressed 'Send on WhatsApp': remember it so the button shows 'sent'."""

    def post(self, request, appointment_id):
        a = get_object_or_404(appointments_for(request.user), id=appointment_id)
        a.reminder_sent_at = timezone.now()
        a.save(update_fields=['reminder_sent_at'])
        return Response({'reminder_sent_at': a.reminder_sent_at, 'phone': phone_digits(a.phone)})


class FreeSlotsView(APIView):
    def get(self, request, calendar_id):
        cal = get_object_or_404(calendars_for(request.user), id=calendar_id)
        day = parse_day(request.query_params.get('date'), timezone.localdate())
        minutes = int(request.query_params.get('minutes') or 30)
        return Response({'slots': free_slots(cal, day, minutes, ignore_id=request.query_params.get('ignore'))})


# ------------------------------------------------------------- packages ---

class PackageListView(APIView):
    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        return Response([package_json(p) for p in client.packages.order_by('-start')])

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        d = request.data
        p = ClientPackage.objects.create(
            client=client, name=str(d.get('name') or 'Package')[:100], visits=max(int(d.get('visits') or 1), 1),
            start=parse_day(d.get('start'), timezone.localdate()), end=parse_day(d.get('end')),
            price=_money(d.get('price')), paid_amount=_money(d.get('paid_amount')))
        return Response(package_json(p), status=201)


class PackageDetailView(APIView):
    def put(self, request, package_id):
        p = get_object_or_404(ClientPackage, id=package_id, client__in=client_qs(request.user))
        d = request.data
        if 'name' in d:
            p.name = str(d['name'] or p.name)[:100]
        if 'visits' in d:
            p.visits = max(int(d['visits'] or 1), 1)
        if 'start' in d:
            p.start = parse_day(d['start'], p.start)
        if 'end' in d:
            p.end = parse_day(d['end'])
        if 'price' in d:
            p.price = _money(d['price'])
        if 'paid_amount' in d:
            p.paid_amount = _money(d['paid_amount'])
        p.save()
        return Response(package_json(p))

    def delete(self, request, package_id):
        get_object_or_404(ClientPackage, id=package_id, client__in=client_qs(request.user)).delete()
        return Response(status=204)


# ---------------------------------------------------------------- today ---

class TodayView(APIView):
    def get(self, request):
        today = parse_day(request.query_params.get('date'), timezone.localdate())
        return Response(today_summary(request.user, today))


# ----------------------------------------------------------- client app ---

class ClientAppLinkView(APIView):
    """The client's private phone page (same key as their check-in link) and how they are doing."""

    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        today = parse_day(request.query_params.get('date'), timezone.localdate())
        link = CheckInLink.objects.filter(client=client).first()
        logs = client.day_logs.filter(date__gt=today - timedelta(days=14))
        return Response({
            'token': str(link.token) if link and link.active else None,
            'phone': phone_digits(client.phone),
            'adherence': adherence(client, today),
            'last_log': last_log_date(client),
            'meals_per_day': len(plan_meals(latest_plan(client))),
            'logs': [{'date': l.date.isoformat(), 'meals': l.meals, 'water': l.water} for l in logs],
        })

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        link, _ = CheckInLink.objects.get_or_create(client=client)
        if request.data.get('new'):
            link.delete()
            link = CheckInLink.objects.create(client=client)
        elif not link.active:
            link.active = True
            link.save(update_fields=['active'])
        return Response({'token': str(link.token)})

    def delete(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        CheckInLink.objects.filter(client=client).update(active=False)
        return Response(status=204)


def _clinic(owner):
    profile = UserProfile.objects.filter(user=owner).first()
    return {
        'clinic_name': (profile.clinic_name if profile else '') or (owner.clinic.name if owner.clinic_id else ''),
        'logo_url': profile.logo_data if profile and profile.logo_data else None,
    }


def _shared_blood_advice(client):
    """Food advice from blood tests the dietitian chose to share with the client."""
    from .views_v4 import blood_advice
    shared = list(client.blood_tests.filter(shared=True).prefetch_related('results'))
    if not shared:
        return None
    return {'date': shared[0].date.isoformat(), 'items': blood_advice(client, shared)}


class PublicClientAppView(APIView):
    """The client's own phone page. No login; the long random token is the key."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def _client(self, token):
        link = get_object_or_404(CheckInLink.objects.select_related('client', 'client__user'), token=token, active=True)
        return link.client

    def _day(self, request, client):
        """The client's 'today' comes from their phone; only accept dates close to the server's."""
        server = timezone.localdate()
        day = parse_day(request.data.get('date') or request.query_params.get('date'), server)
        if not (server - timedelta(days=7) <= day <= server + timedelta(days=1)):
            day = server
        return day

    def get(self, request, token):
        client = self._client(token)
        today = self._day(request, client)
        plan = latest_plan(client)
        logs = {l.date: l for l in client.day_logs.filter(date__gt=today - timedelta(days=7), date__lte=today)}
        nxt = (Appointment.objects.filter(client=client, date__gte=today, status='booked')
               .select_related('type', 'calendar').order_by('date', 'time').first())
        week = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            log = logs.get(d)
            week.append({'date': d.isoformat(), 'meals': log.meals if log else {}, 'water': log.water if log else 0})
        return Response({
            **_clinic(client.user),
            'first_name': (client.name or '').split(' ')[0],
            'date': today.isoformat(),
            'targets': {'kcal': round(client.target_calories or 0)},
            'plan': None if plan is None else {
                'id': plan.id, 'name': plan.name, 'notes': plan.notes,
                'meals': plan_meals(plan),
                'weekly': describe_week(plan.weekly),
                'grocery': smart_grocery(plan),
                'grocery2': smart_grocery(plan, weeks=2),
                'workout': WorkoutTemplateSerializer(plan.workout).data if plan.workout else None,
                'kcal': round(plan.total_protein * 4 + plan.total_carb * 4 + plan.total_fat * 9),
            },
            'week': week,
            'adherence': adherence(client, today),
            'blood_advice': _shared_blood_advice(client),
            'next_appointment': None if nxt is None else {
                'date': nxt.date.isoformat(), 'time': nxt.time.strftime('%H:%M'),
                'type_name': nxt.type.name if nxt.type else '', 'type_name_ar': nxt.type.name_ar if nxt.type else '',
                'with': nxt.calendar.name, 'online': bool(nxt.type and nxt.type.online),
            },
        })

    def post(self, request, token):
        client = self._client(token)
        day = self._day(request, client)
        with transaction.atomic():
            log, _ = DayLog.objects.select_for_update().get_or_create(client=client, date=day)
            meals = request.data.get('meals')
            if isinstance(meals, dict):
                clean = {}
                for k, v in meals.items():
                    try:
                        v = float(v)
                    except (TypeError, ValueError):
                        continue
                    if v in (0.5, 1.0) and len(str(k)) <= 10:
                        clean[str(k)] = v
                log.meals = clean
            if 'water' in request.data:
                try:
                    log.water = min(max(int(request.data['water']), 0), 20)
                except (TypeError, ValueError):
                    pass
            log.save()
        return Response({'date': day.isoformat(), 'meals': log.meals, 'water': log.water,
                         'adherence': adherence(client, day)})


# ------------------------------------------------------------- booking ---

def _booking_calendar(slug):
    return get_object_or_404(Calendar.objects.select_related('user'), slug=slug, active=True, booking_open=True)


class PublicBookingView(APIView):
    """The booking link a clinic shares. No login."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        cal = _booking_calendar(slug)
        siblings = calendars_for(cal.user).filter(active=True, booking_open=True).prefetch_related('types').order_by('created_at')
        return Response({
            **_clinic(cal.user),
            'selected': cal.slug,
            'calendars': [{
                'slug': c.slug, 'name': c.name, 'color': c.color, 'currency': c.currency,
                'open_days': [int(d) for d, h in (c.hours or {}).items() if h.get('on')],
                'pay_online': c.pay_online and online_payment_ready(), 'pay_at_clinic': c.pay_at_clinic or not online_payment_ready(),
                'types': [{'id': t.id, 'name': t.name, 'name_ar': t.name_ar, 'minutes': t.minutes,
                           'price': float(t.price), 'online': t.online} for t in c.types.filter(active=True)],
            } for c in siblings],
            'today': local_now(cal).date().isoformat(),
        })


class PublicBookingSlotsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        cal = _booking_calendar(slug)
        t = get_object_or_404(cal.types, id=request.query_params.get('type'), active=True)
        today = local_now(cal).date()
        day = parse_day(request.query_params.get('date'), today)
        if not (today <= day <= today + timedelta(days=60)):
            return Response({'slots': []})
        return Response({'slots': free_slots(cal, day, t.minutes)})

    def post(self, request, slug):
        cal = _booking_calendar(slug)
        d = request.data
        t = get_object_or_404(cal.types, id=d.get('type'), active=True)
        name, phone = str(d.get('name') or '').strip()[:100], str(d.get('phone') or '').strip()[:30]
        day, at = parse_day(d.get('date')), _time(d.get('time'))
        if not name or len(phone_digits(phone)) < 8:
            return Response({'detail': 'name_phone_required'}, status=400)
        if not day or not at:
            return Response({'detail': 'bad_time'}, status=400)
        recent = Appointment.objects.filter(guest_phone=phone, created_at__gte=timezone.now() - timedelta(hours=24))
        if recent.count() >= 3:
            return Response({'detail': 'too_many'}, status=429)
        pay = 'online' if d.get('pay') == 'online' and cal.pay_online and online_payment_ready() else 'clinic'
        with transaction.atomic():
            Calendar.objects.select_for_update().filter(id=cal.id).first()  # one booking at a time per calendar
            if at.strftime('%H:%M') not in free_slots(cal, day, t.minutes):
                return Response({'detail': 'slot_taken'}, status=409)
            digits = phone_digits(phone)
            match = next((c for c in client_qs(cal.user).exclude(phone='') if phone_digits(c.phone) == digits), None)
            a = Appointment.objects.create(
                calendar=cal, type=t, client=match, guest_name=name, guest_phone=phone, date=day, time=at,
                minutes=t.minutes, price=t.price, pay_method=pay, source='booking_link')
        return Response({'ok': True, 'id': a.id, 'date': a.date.isoformat(), 'time': a.time.strftime('%H:%M'),
                         'pay': pay}, status=201)


# ------------------------------------------------------- workout suggestions ---

def _workout_card(w):
    first = next((e for d in (w.days or []) for e in d.get('exercises', [])), None)
    return {'id': w.id, 'name': w.name, 'name_ar': w.name_ar, 'goal': w.goal, 'level': w.level, 'place': w.place,
            'is_draft': w.is_draft, 'training_days': len(w.days or []),
            'sets_reps': f"{first.get('sets')} × {first.get('reps')}" if first else '',
            'kind': next((e.get('kind') for d in (w.days or []) for e in d.get('exercises', []) if e.get('kind')), '')}


class WorkoutSuggestionsView(APIView):
    """The 3 workouts that best fit this plan's client (goal, level, place from the interview).
    ?goal= &level= &place= let the dietitian change the guess."""

    def get(self, request, plan_id):
        from .scheduling import suggest_workouts, training_profile
        from .services import plan_qs
        plan = get_object_or_404(plan_qs(request.user).select_related('client'), id=plan_id)
        profile = training_profile(plan.client)
        for key in ('goal', 'level', 'place'):
            value = request.query_params.get(key)
            if value:
                profile[key] = None if value == 'none' else value
                profile['source'] = 'changed'
        picks = [] if profile['place'] is None else suggest_workouts(
            request.user, plan.client, profile['goal'], profile['level'], profile['place'])
        return Response({'profile': profile, 'workouts': [_workout_card(w) for w in picks]})

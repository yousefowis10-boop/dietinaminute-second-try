"""Appointments, the client phone app and the Today screen: the calculations behind them."""
import re
import secrets
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils.text import slugify

from .services import DEFAULT_MEAL_NAMES, MEAL_KEY_RE, client_qs, split_plan, team_user_ids

MEAL_ORDER = ['meal1', 'snack1', 'meal2', 'snack2', 'meal3', 'snack3', 'meal4']

DEFAULT_TYPES = [
    dict(name='First visit', name_ar='زيارة أولى', minutes=60, price=35, color='#1f6f5c'),
    dict(name='Follow-up', name_ar='متابعة', minutes=30, price=20, color='#2f5fb3'),
    dict(name='InBody + follow-up', name_ar='InBody + متابعة', minutes=30, price=25, color='#6a4fc2'),
    dict(name='Online follow-up', name_ar='متابعة أونلاين', minutes=20, price=15, color='#b9770e', online=True),
]


def calendars_for(user):
    from .models import Calendar
    return Calendar.objects.filter(user_id__in=team_user_ids(user))


def appointments_for(user):
    from .models import Appointment
    return Appointment.objects.filter(calendar__user_id__in=team_user_ids(user))


def new_slug(name):
    from .models import Calendar
    base = (slugify(name) or 'calendar')[:40]
    while True:
        slug = f'{base}-{secrets.token_hex(2)}'
        if not Calendar.objects.filter(slug=slug).exists():
            return slug


def create_calendar(user, name, **fields):
    from .models import AppointmentType, Calendar
    cal = Calendar.objects.create(user=user, name=name, slug=new_slug(name), **fields)
    for i, t in enumerate(DEFAULT_TYPES):
        AppointmentType.objects.create(calendar=cal, order=i, **t)
    return cal


def phone_digits(phone):
    """International digits for a WhatsApp link. A local Jordanian 07... number gets 962 in front."""
    digits = re.sub(r'\D', '', phone or '')
    if digits.startswith('00'):
        digits = digits[2:]
    if digits.startswith('07') and len(digits) == 10:
        digits = '962' + digits[1:]
    return digits


def _hm(value):
    try:
        h, m = str(value).split(':')[:2]
        return int(h) * 60 + int(m)
    except (ValueError, AttributeError):
        return None


def local_now(calendar):
    try:
        return datetime.now(ZoneInfo(calendar.timezone))
    except Exception:
        return datetime.now(ZoneInfo('Asia/Amman'))


def free_slots(calendar, day, minutes, ignore_id=None):
    """Start times ('HH:MM') on this day where a visit of `minutes` fits inside working hours,
    outside the break, not in the past and not overlapping another visit."""
    hours = (calendar.hours or {}).get(str(day.weekday())) or {}
    if not hours.get('on'):
        return []
    start, end = _hm(hours.get('start')), _hm(hours.get('end'))
    if start is None or end is None:
        return []
    busy = []
    qs = calendar.appointments.filter(date=day).exclude(status='cancelled')
    if ignore_id:
        qs = qs.exclude(id=ignore_id)
    for a in qs:
        s = a.time.hour * 60 + a.time.minute
        busy.append((s, s + a.minutes))
    bs, be = _hm(calendar.break_start), _hm(calendar.break_end)
    if bs is not None and be is not None and be > bs:
        busy.append((bs, be))
    now = local_now(calendar)
    earliest = -1
    if day == now.date():
        earliest = now.hour * 60 + now.minute + 60  # at least one hour's notice
    elif day < now.date():
        return []
    step = max(calendar.slot_minutes or 30, 10)
    out = []
    t = start
    while t + minutes <= end:
        if t >= earliest and all(t + minutes <= s or t >= e for s, e in busy):
            out.append(f'{t // 60:02d}:{t % 60:02d}')
        t += step
    return out


# ---------------------------------------------------------------- client app ---

def latest_plan(client):
    return client.diet_plans.order_by('-created_at').first()


def plan_meals(plan):
    """Meals in the dietitian's order: [{key, name, time, items}] (name '' = use the default name)."""
    if plan is None:
        return []
    split, _ = split_plan(plan)
    saved = [s for s in (plan.meal_slots or []) if isinstance(s, dict) and MEAL_KEY_RE.match(str(s.get('key', '')))]
    keys = [s['key'] for s in saved] + [k for k in MEAL_ORDER if k in split and k not in {s['key'] for s in saved}]
    keys += [k for k in split if k not in keys]
    names = {s['key']: s for s in saved}
    out = []
    for key in keys:
        if key not in split:
            continue
        slot = names.get(key, {})
        name = slot.get('name') or ''
        out.append({'key': key, 'name': '' if name == DEFAULT_MEAL_NAMES.get(key) else name,
                    'time': slot.get('time') or '', 'items': split[key]})
    return out


def meals_count(plan):
    """How many meals a day the plan has (cheap: only the meal tags of its foods)."""
    if plan is None:
        return 0
    from .models import Tag
    keys = set(Tag.objects.filter(diet_items__plan=plan).values_list('name', flat=True))
    return sum(1 for k in keys if MEAL_KEY_RE.match(k))


def adherence(client, today, days=7):
    """Share of planned meals the client ticked over the last `days` days (half = 0.5).
    None when the client has never ticked anything."""
    logs = {l.date: l for l in client.day_logs.filter(date__gt=today - timedelta(days=days), date__lte=today)}
    if not client.day_logs.exists():
        return None
    plan = latest_plan(client)
    meals = meals_count(plan)
    if not meals:
        return None
    first = client.day_logs.order_by('date').first().date
    start = max(today - timedelta(days=days - 1), first, plan.created_at.date())
    span = (today - start).days + 1
    if span <= 0:
        return None
    done = sum(min(sum(float(v) for v in (logs[d].meals or {}).values()), meals)
               for d in logs if d >= start)
    return round(100 * done / (meals * span))


def last_log_date(client):
    log = client.day_logs.filter(Q(water__gt=0) | ~Q(meals={})).order_by('-date').first()
    return log.date if log else None


# ---------------------------------------------------------------- today ---

def appointment_json(a):
    return {
        'id': a.id, 'calendar': a.calendar_id, 'calendar_name': a.calendar.name, 'color': a.type.color if a.type else a.calendar.color,
        'type': a.type_id, 'type_name': a.type.name if a.type else '', 'type_name_ar': a.type.name_ar if a.type else '',
        'online': bool(a.type and a.type.online),
        'client': a.client_id, 'name': a.display_name, 'phone': a.phone, 'guest_name': a.guest_name,
        'guest_phone': a.guest_phone, 'date': a.date.isoformat(), 'time': a.time.strftime('%H:%M'), 'minutes': a.minutes,
        'status': a.status, 'source': a.source, 'price': float(a.price), 'pay_method': a.pay_method, 'paid': a.paid,
        'paid_via': a.paid_via, 'package': a.package_id, 'notes': a.notes,
        'reminder_sent_at': a.reminder_sent_at, 'currency': a.calendar.currency,
    }


def package_json(p, today=None):
    used = p.appointments.filter(status='attended').count()
    return {'id': p.id, 'client': p.client_id, 'name': p.name, 'visits': p.visits, 'used': used,
            'left': max(p.visits - used, 0), 'start': p.start.isoformat(), 'end': p.end.isoformat() if p.end else None,
            'price': float(p.price), 'paid_amount': float(p.paid_amount),
            'balance': float(p.price - p.paid_amount)}


def today_summary(user, today):
    from .models import ClientPackage, ClientProfileRevision
    clients = client_qs(user)
    appts = appointments_for(user).select_related('calendar', 'type', 'client')
    todays = [appointment_json(a) for a in appts.filter(date=today).exclude(status='cancelled')]

    checkins = (ClientProfileRevision.objects.filter(client__in=clients, reviewed=False)
                .select_related('client').order_by('-created_at')[:10])

    using_app = clients.filter(day_logs__isnull=False).distinct()
    adherence_rows, stopped = [], []
    for c in using_app:
        pct = adherence(c, today)
        last = last_log_date(c)
        if pct is not None:
            adherence_rows.append({'id': c.id, 'name': c.name, 'pct': pct})
        if last and (today - last).days >= 3:
            stopped.append({'id': c.id, 'name': c.name, 'phone': c.phone, 'days': (today - last).days})
    adherence_rows.sort(key=lambda r: -r['pct'])

    from django.db.models import Max
    booked_ahead = set(appts.filter(date__gte=today, status='booked').values_list('client_id', flat=True))
    last_visit = dict(appts.filter(status='attended', client__isnull=False).values('client_id')
                      .annotate(m=Max('date')).values_list('client_id', 'm'))
    last_check = dict(ClientProfileRevision.objects.filter(client__in=clients).values('client_id')
                      .annotate(m=Max('created_at')).values_list('client_id', 'm'))
    follow = []
    for c in clients:
        if c.id in booked_ahead:
            continue
        dates = [d for d in (last_visit.get(c.id), last_check[c.id].date() if c.id in last_check else None) if d]
        last = max(dates) if dates else c.created_at.date()
        gap = (today - last).days
        if gap >= 14:
            follow.append({'id': c.id, 'name': c.name, 'phone': c.phone, 'days': gap})
    follow.sort(key=lambda r: -r['days'])

    ending = []
    for p in ClientPackage.objects.filter(client__in=clients).select_related('client'):
        j = package_json(p)
        soon = p.end and today <= p.end <= today + timedelta(days=7)
        if (j['left'] <= 1 and (not p.end or p.end >= today)) or soon:
            ending.append({**j, 'client_name': p.client.name})

    unpaid = []
    # Visits that happened (or should have) and were not paid; today's upcoming visits are not owed yet.
    owed = appts.filter(paid=False, price__gt=0, package__isnull=True).filter(
        Q(status='attended', date__lte=today) | Q(status='booked', date__lt=today))
    for a in owed.order_by('-date')[:30]:
        unpaid.append({'id': a.id, 'name': a.display_name, 'client': a.client_id, 'date': a.date.isoformat(),
                       'amount': float(a.price), 'currency': a.calendar.currency})
    for p in ClientPackage.objects.filter(client__in=clients).select_related('client'):
        if p.price > p.paid_amount:
            unpaid.append({'package': p.id, 'name': p.client.name, 'client': p.client_id, 'date': p.start.isoformat(),
                           'amount': float(p.price - p.paid_amount), 'currency': ''})

    return {
        'date': today.isoformat(),
        'appointments': todays,
        'checkins': [{'id': r.id, 'client_id': r.client_id, 'name': r.client.name, 'date': r.created_at,
                      'weight': r.weight, 'source': r.source} for r in checkins],
        'adherence': adherence_rows[:12],
        'stopped_logging': sorted(stopped, key=lambda r: -r['days']),
        'follow_ups': follow[:12],
        'packages_ending': ending,
        'unpaid': unpaid,
        'unpaid_total': round(sum(u['amount'] for u in unpaid), 2),
        'interviews_waiting': list(clients.filter(interview_status='submitted').values('id', 'name')),
    }


def parse_day(value, fallback=None):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return fallback


# ------------------------------------------------------- workout suggestions ---

GOAL_TO_WORKOUT = {'loss': 'fat_loss', 'gain': 'muscle_gain', 'maintain': 'muscle_gain'}
LEVELS = ('beginner', 'intermediate', 'advanced')


def training_profile(client):
    """Goal, level and place for workouts, from the client file and the interview.
    place None = the client does not want to train (suggest walking)."""
    from .models import DetailedProfile
    d = DetailedProfile.objects.filter(client=client).first()
    goal = GOAL_TO_WORKOUT.get(client.goal, 'fat_loss')
    level, place, source = None, 'gym', 'guess'
    if d is not None:
        own = (d.exercise_level or '').lower() or None
        if d.exercise is True:
            place = 'home' if d.exercise_place == 'Home' else 'gym'
            level, source = own, 'interview'
        elif d.exercise is False:
            source = 'interview'
            if d.willing_gym is True:
                place, level = 'gym', own or 'beginner'
            elif d.willing_home is True:
                place, level = 'home', own or 'beginner'
            elif d.willing_home is False:
                place, level = None, 'beginner'
            else:
                level = 'beginner'
        if level is None:  # older interviews: guess from how often and how hard they train
            times = int(d.exercise_times_per_week or 0) if str(d.exercise_times_per_week or '').isdigit() else 0
            hard = d.workout_intensity in ('High', 'Very High')
            level = 'advanced' if times >= 5 and hard else 'intermediate' if times >= 3 else 'beginner'
            if d.exercise is not True and d.exercise is not False:
                source = 'guess'
    return {'goal': goal, 'level': level or 'beginner', 'place': place, 'source': source}


def suggest_workouts(user, client, goal, level, place, count=3):
    """Best matches first: same goal, level and place; then nearby levels; one home option for gym fat-loss clients."""
    from .models import WorkoutTemplate
    from django.db.models import Q
    used = set(client.diet_plans.exclude(workout=None).values_list('workout_id', flat=True))
    pool = list(WorkoutTemplate.objects.filter(Q(user__isnull=True) | Q(user_id__in=team_user_ids(user)))
                .filter(goal=goal).exclude(id__in=used).order_by('id'))
    lv = LEVELS.index(level) if level in LEVELS else 0

    def rank(w):
        same_place = (w.place == place) if place else (w.place == 'home')
        level_gap = abs((LEVELS.index(w.level) if w.level in LEVELS else lv) - lv) if w.level != 'all_levels' else 1
        return (0 if same_place else 1, level_gap, w.id)

    ranked = sorted(pool, key=rank)
    picks = ranked[:count]
    if place == 'gym' and goal == 'fat_loss' and count >= 3 and all(w.place == 'gym' for w in picks):
        home = next((w for w in ranked if w.place == 'home'), None)
        if home:
            picks = picks[:count - 1] + [home]
    return picks

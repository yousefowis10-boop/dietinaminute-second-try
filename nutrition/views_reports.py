"""Finances & reports (revenue, paid, unpaid, payments, reminders) and Contacts (clients with their subscription dates)."""
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Appointment, ClientPackage, ClientProfile, Payment
from .scheduling import calendars_for, package_json
from .services import client_qs, team_user_ids


def _day(value, default):
    try:
        return date.fromisoformat(value) if value else default
    except ValueError:
        return default


def _month_start(d):
    return d.replace(day=1)


def _payments(user):
    return Payment.objects.filter(user_id__in=team_user_ids(user)).select_related('client', 'appointment__type', 'package')


def _received_parts(appts, packages, payments, start, end):
    """Money received between start and end, as rows. Recorded payments count on their own date; visits ticked
    "paid" without a payment record count on the visit date; what was paid when a package was created counts
    on its start date."""
    rows = []
    for pay in payments.filter(date__gte=start, date__lte=end):
        what = (pay.package.name if pay.package else (pay.appointment.type.name if pay.appointment and pay.appointment.type else '')) or pay.note
        rows.append({'kind': 'payment', 'id': pay.id, 'date': pay.date.isoformat(), 'client': pay.client_id,
                     'name': pay.client.name if pay.client else '', 'phone': '', 'what': what, 'what_ar': what,
                     'for': 'package' if pay.package_id else 'visit' if pay.appointment_id else 'other',
                     'amount': float(pay.amount), 'paid_amount': float(pay.amount), 'state': 'paid', 'via': pay.method, 'note': pay.note})
    for a in appts.filter(paid=True, date__gte=start, date__lte=end, payments__isnull=True):
        rows.append({'kind': 'visit', 'id': a.id, 'date': a.date.isoformat(), 'client': a.client_id, 'name': a.display_name,
                     'phone': '', 'what': (a.type.name if a.type else '') or 'visit', 'what_ar': (a.type.name_ar if a.type else '') or '',
                     'amount': float(a.price), 'paid_amount': float(a.price), 'state': 'paid', 'via': a.paid_via or ''})
    for p in packages.filter(start__gte=start, start__lte=end).annotate(recorded=Sum('payments__amount')):
        first = float(p.paid_amount - (p.recorded or 0))
        if first > 0:
            rows.append({'kind': 'package', 'id': p.id, 'date': p.start.isoformat(), 'client': p.client_id, 'name': p.client.name,
                         'phone': '', 'what': p.name, 'what_ar': p.name, 'amount': float(p.price), 'paid_amount': first,
                         'state': 'paid', 'via': 'package'})
    return rows


class FinanceView(APIView):
    """Money for a period (default: this month): revenue received, still unpaid (with phone for a reminder),
    expected from booked visits, by payment method, payments list, and the last 6 months for a simple report."""

    def get(self, request):
        today = timezone.localdate()
        start = _day(request.query_params.get('from'), _month_start(today))
        end = _day(request.query_params.get('to'), today)
        clients = client_qs(request.user)
        cals = calendars_for(request.user)
        currency = cals.first().currency if cals.exists() else 'JOD'
        appts = Appointment.objects.filter(calendar__in=cals, price__gt=0, package__isnull=True).select_related('client', 'type', 'calendar')
        packages = ClientPackage.objects.filter(client__in=clients).select_related('client')
        payments = _payments(request.user)

        received_rows = _received_parts(appts, packages, payments, start, end)

        # Billed in the period: visits that happened (or should have) and packages started; expected = booked ahead.
        billed, unpaid_in_period, expected = 0.0, 0.0, 0.0
        visits_paid = 0
        for a in appts.filter(date__gte=start, date__lte=end).exclude(status='cancelled'):
            due = a.status in ('attended', 'no_show') or (a.status == 'booked' and a.date < today)
            if a.paid:
                billed += float(a.price)
                visits_paid += 1
            elif due:
                billed += float(a.price)
                unpaid_in_period += float(a.price)
            else:
                expected += float(a.price)
        new_packages = 0
        for p in packages.filter(start__gte=start, start__lte=end):
            new_packages += 1
            billed += float(p.price)
            unpaid_in_period += float(max(p.price - p.paid_amount, 0))

        # Everything still owed, whatever its date (so old debts are not forgotten).
        owed = []
        for a in appts.filter(paid=False).filter(Q(status='attended', date__lte=today) | Q(status__in=['booked', 'no_show'], date__lt=today)):
            owed.append({'kind': 'visit', 'id': a.id, 'date': a.date.isoformat(), 'client': a.client_id, 'name': a.display_name,
                         'phone': (a.client.phone if a.client else a.guest_phone) or '', 'amount': float(a.price),
                         'what': (a.type.name if a.type else '') or ''})
        for p in packages:
            if p.price > p.paid_amount:
                owed.append({'kind': 'package', 'id': p.id, 'date': p.start.isoformat(), 'client': p.client_id, 'name': p.client.name,
                             'phone': p.client.phone or '', 'amount': float(p.price - p.paid_amount), 'what': p.name})
        owed.sort(key=lambda r: r['date'])

        by_via = defaultdict(float)
        for r in received_rows:
            by_via[r['via'] or 'other'] += r['paid_amount']

        months = []
        m = _month_start(today)
        for _ in range(6):
            nxt = (m + timedelta(days=32)).replace(day=1)
            got = sum(r['paid_amount'] for r in _received_parts(appts, packages, payments, m, nxt - timedelta(days=1)))
            months.append({'month': m.isoformat(), 'received': round(got, 2),
                           'visits': appts.filter(date__gte=m, date__lt=nxt, status='attended').count()})
            m = (m - timedelta(days=1)).replace(day=1)
        months.reverse()

        received_rows.sort(key=lambda r: r['date'], reverse=True)
        return Response({
            'from': start.isoformat(), 'to': end.isoformat(), 'currency': currency,
            'received': round(sum(r['paid_amount'] for r in received_rows), 2),
            'unpaid_in_period': round(unpaid_in_period, 2), 'expected': round(expected, 2), 'billed': round(billed, 2),
            'owed_total': round(sum(o['amount'] for o in owed), 2),
            'visits_paid': visits_paid, 'new_packages': new_packages,
            'clients_paying': len({r['client'] for r in received_rows if r['client']}),
            'by_via': [{'via': k, 'amount': round(v, 2)} for k, v in sorted(by_via.items(), key=lambda x: -x[1])],
            'rows': received_rows, 'owed': owed, 'months': months,
        })


def _money(v):
    try:
        d = Decimal(str(v)).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return d if d > 0 else None


class OpenItemsView(APIView):
    """What a client still owes, to pick from when recording a payment."""

    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        today = timezone.localdate()
        items = []
        for a in client.appointments.filter(paid=False, price__gt=0, package__isnull=True).exclude(status='cancelled').select_related('type').order_by('date'):
            items.append({'kind': 'visit', 'id': a.id, 'date': a.date.isoformat(), 'what': (a.type.name if a.type else '') or '',
                          'what_ar': (a.type.name_ar if a.type else '') or '', 'amount': float(a.price), 'upcoming': a.date > today})
        for p in client.packages.order_by('start'):
            if p.price > p.paid_amount:
                items.append({'kind': 'package', 'id': p.id, 'date': p.start.isoformat(), 'what': p.name, 'what_ar': p.name,
                              'amount': float(p.price - p.paid_amount), 'price': float(p.price), 'paid': float(p.paid_amount)})
        return Response(items)


class PaymentView(APIView):
    """Record money received (POST) or undo a recorded payment (DELETE).
    For a package the amount can be part of the balance; for a visit it marks the visit paid."""

    @transaction.atomic
    def post(self, request):
        d = request.data
        amount = _money(d.get('amount'))
        if not amount:
            return Response({'amount': 'required'}, status=400)
        client = get_object_or_404(client_qs(request.user), id=d.get('client')) if d.get('client') else None
        method = d.get('method') if d.get('method') in dict(Payment.METHODS) else 'cash'
        pay = Payment(user=request.user, client=client, amount=amount, method=method,
                      date=_day(d.get('date'), timezone.localdate()), note=(d.get('note') or '')[:200])
        if d.get('package'):
            pkg = get_object_or_404(ClientPackage.objects.filter(client__in=client_qs(request.user)), id=d['package'])
            pay.package, pay.client = pkg, pkg.client
            pkg.paid_amount = min(pkg.paid_amount + amount, pkg.price) if pkg.price else pkg.paid_amount + amount
            pkg.save(update_fields=['paid_amount'])
        elif d.get('appointment'):
            a = get_object_or_404(Appointment.objects.filter(calendar__in=calendars_for(request.user)), id=d['appointment'])
            pay.appointment, pay.client = a, a.client or client
            a.paid, a.paid_via = True, method
            a.save(update_fields=['paid', 'paid_via'])
        pay.save()
        return Response({'id': pay.id}, status=201)

    @transaction.atomic
    def delete(self, request, payment_id):
        pay = get_object_or_404(_payments(request.user), id=payment_id)
        if pay.package_id:
            p = pay.package
            p.paid_amount = max(p.paid_amount - pay.amount, Decimal('0'))
            p.save(update_fields=['paid_amount'])
        if pay.appointment_id and not pay.appointment.payments.exclude(id=pay.id).exists():
            Appointment.objects.filter(id=pay.appointment_id).update(paid=False, paid_via='')
        pay.delete()
        return Response(status=204)


def _contact(c, pkg, today):
    p = package_json(pkg) if pkg else None
    status = 'none'
    if p:
        end = pkg.end
        if end and end < today:
            status = 'ended'
        elif (end and end <= today + timedelta(days=7)) or p['left'] <= 1:
            status = 'ending'
        else:
            status = 'active'
    return {'id': c.id, 'name': c.name, 'phone': c.phone, 'goal': c.goal, 'notes': c.contact_notes,
            'since': c.created_at.date().isoformat(), 'package': p, 'status': status,
            'days_left': (pkg.end - today).days if pkg and pkg.end else None}


class ContactsView(APIView):
    """Every client with phone, current subscription (start, end, visits left), status and notes."""

    def get(self, request):
        today = timezone.localdate()
        clients = client_qs(request.user).order_by('name')
        latest = {}
        for p in ClientPackage.objects.filter(client__in=clients).order_by('client_id', '-start', '-id'):
            latest.setdefault(p.client_id, p)
        order = {'ending': 0, 'ended': 1, 'active': 2, 'none': 3}
        rows = [_contact(c, latest.get(c.id), today) for c in clients]
        rows.sort(key=lambda r: (order[r['status']], r['days_left'] if r['days_left'] is not None else 9999, r['name'].lower()))
        return Response(rows)


class ContactNotesView(APIView):
    def put(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        notes = (request.data.get('notes') or '')[:2000]
        ClientProfile.objects.filter(pk=client.pk).update(contact_notes=notes)
        return Response({'notes': notes})

"""Finances & reports (revenue, paid, unpaid, reminders) and Contacts (clients with their subscription dates)."""
from collections import defaultdict
from datetime import date, timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Appointment, ClientPackage, ClientProfile
from .scheduling import calendars_for, package_json
from .services import client_qs


def _day(value, default):
    try:
        return date.fromisoformat(value) if value else default
    except ValueError:
        return default


def _month_start(d):
    return d.replace(day=1)


class FinanceView(APIView):
    """Money for a period (default: this month): revenue received, still unpaid (with phone for a reminder),
    expected from booked visits, by payment method, and the last 6 months for a simple report."""

    def get(self, request):
        today = timezone.localdate()
        start = _day(request.query_params.get('from'), _month_start(today))
        end = _day(request.query_params.get('to'), today)
        clients = client_qs(request.user)
        cals = calendars_for(request.user)
        currency = cals.first().currency if cals.exists() else 'JOD'
        appts = Appointment.objects.filter(calendar__in=cals, price__gt=0, package__isnull=True).select_related('client', 'type', 'calendar')
        packages = ClientPackage.objects.filter(client__in=clients).select_related('client')

        rows = []
        for a in appts.filter(date__gte=start, date__lte=end).exclude(status__in=['cancelled']):
            if a.paid:
                state = 'paid'
            elif a.status == 'attended' or (a.status == 'booked' and a.date < today):
                state = 'unpaid'
            elif a.status == 'no_show':
                state = 'unpaid'
            else:
                state = 'expected'
            rows.append({'kind': 'visit', 'id': a.id, 'date': a.date.isoformat(), 'client': a.client_id, 'name': a.display_name,
                         'phone': (a.client.phone if a.client else a.guest_phone) or '',
                         'what': (a.type.name if a.type else '') or 'visit', 'what_ar': (getattr(a.type, 'name_ar', '') if a.type else '') or '',
                         'amount': float(a.price), 'paid_amount': float(a.price) if a.paid else 0.0, 'state': state, 'via': a.paid_via or ''})
        for p in packages.filter(start__gte=start, start__lte=end):
            state = 'paid' if p.paid_amount >= p.price else 'unpaid'
            rows.append({'kind': 'package', 'id': p.id, 'date': p.start.isoformat(), 'client': p.client_id, 'name': p.client.name,
                         'phone': p.client.phone or '', 'what': p.name, 'what_ar': p.name, 'amount': float(p.price),
                         'paid_amount': float(p.paid_amount), 'state': state, 'via': ''})
        rows.sort(key=lambda r: r['date'], reverse=True)

        # Everything still owed, whatever its date (so old debts are not forgotten).
        owed = []
        for a in appts.filter(paid=False).filter(Q(status='attended', date__lte=today) | Q(status__in=['booked', 'no_show'], date__lt=today)):
            owed.append({'kind': 'visit', 'id': a.id, 'date': a.date.isoformat(), 'client': a.client_id, 'name': a.display_name,
                         'phone': (a.client.phone if a.client else a.guest_phone) or '', 'amount': float(a.price)})
        for p in packages:
            if p.price > p.paid_amount:
                owed.append({'kind': 'package', 'id': p.id, 'date': p.start.isoformat(), 'client': p.client_id, 'name': p.client.name,
                             'phone': p.client.phone or '', 'amount': float(p.price - p.paid_amount), 'what': p.name})
        owed.sort(key=lambda r: r['date'])

        by_via = defaultdict(float)
        for r in rows:
            if r['paid_amount']:
                by_via[r['via'] or ('package' if r['kind'] == 'package' else 'other')] += r['paid_amount']

        # Simple report: received per month for the last 6 months.
        months = []
        m = _month_start(today)
        for _ in range(6):
            nxt = (m + timedelta(days=32)).replace(day=1)
            paid = sum(float(a.price) for a in appts.filter(paid=True, date__gte=m, date__lt=nxt))
            paid += sum(float(p.paid_amount) for p in packages.filter(start__gte=m, start__lt=nxt))
            visits = appts.filter(date__gte=m, date__lt=nxt, status='attended').count()
            months.append({'month': m.isoformat(), 'received': round(paid, 2), 'visits': visits})
            m = (m - timedelta(days=1)).replace(day=1)
        months.reverse()

        received = round(sum(r['paid_amount'] for r in rows), 2)
        billed = round(sum(r['amount'] for r in rows if r['state'] != 'expected'), 2)
        return Response({
            'from': start.isoformat(), 'to': end.isoformat(), 'currency': currency,
            'received': received,
            'unpaid_in_period': round(sum(r['amount'] - r['paid_amount'] for r in rows if r['state'] == 'unpaid'), 2),
            'expected': round(sum(r['amount'] for r in rows if r['state'] == 'expected'), 2),
            'billed': billed,
            'owed_total': round(sum(o['amount'] for o in owed), 2),
            'visits_paid': sum(1 for r in rows if r['kind'] == 'visit' and r['state'] == 'paid'),
            'new_packages': sum(1 for r in rows if r['kind'] == 'package'),
            'clients_paying': len({r['client'] for r in rows if r['paid_amount'] and r['client']}),
            'by_via': [{'via': k, 'amount': round(v, 2)} for k, v in sorted(by_via.items(), key=lambda x: -x[1])],
            'rows': rows, 'owed': owed, 'months': months,
        })


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

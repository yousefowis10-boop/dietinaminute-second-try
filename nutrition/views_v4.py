"""Blood tests, the one-page measurement history and vitamins & minerals for plans."""
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from . import ai
from .bloodwork import MARKERS, NUTRIENTS, advice_for, best_sources, daily_needs, marker_range, match_marker, plan_micros, status_of
from .models import BloodResult, BloodTest, BloodTestFile, DetailedProfile, FoodItem
from .scheduling import latest_plan, parse_day
from .services import client_qs, plan_qs
from .views_v2 import _ai_error, _decode_file


def _num(v):
    try:
        return float(v) if v not in (None, '') else None
    except (TypeError, ValueError):
        return None


def result_json(r, gender):
    low, high = (r.ref_low, r.ref_high) if (r.ref_low is not None or r.ref_high is not None) else marker_range(r.code, gender)
    status, refer = status_of(r.code, r.value, low, high, gender)
    m = MARKERS.get(r.code)
    return {'id': r.id, 'code': r.code, 'name': r.name, 'name_en': m[0] if m else r.name, 'name_ar': m[1] if m else r.name,
            'value': r.value, 'unit': r.unit or (m[2] if m else ''), 'ref_low': low, 'ref_high': high, 'status': status, 'refer': refer}


def test_json(t, gender):
    results = [result_json(r, gender) for r in t.results.all()]
    return {'id': t.id, 'date': t.date.isoformat(), 'lab': t.lab, 'note': t.note, 'shared': t.shared,
            'has_file': hasattr(t, 'file'), 'results': results,
            'low': sum(1 for r in results if r['status'] == 'low'), 'high': sum(1 for r in results if r['status'] == 'high')}


def blood_advice(client, tests=None):
    """Food advice from the latest value of each test (newest report first)."""
    tests = tests if tests is not None else client.blood_tests.prefetch_related('results')
    latest = {}
    for t in tests:
        for r in t.results.all():
            key = r.code or r.name.lower()
            if key not in latest:
                latest[key] = (t, r)
    plan = latest_plan(client)
    in_plan = set(plan.items.values_list('food__name', flat=True)) if plan else set()
    in_plan = {n.strip().lower() for n in in_plan}
    excluded = set(client.excluded_foods.values_list('id', flat=True))
    foods_by_name = {f.name.strip().lower(): f for f in FoodItem.objects.all()}
    out = []
    for t, r in latest.values():
        res = result_json(r, client.gender)
        if res['status'] in (None, 'normal') and not res['refer']:
            continue
        advice = advice_for(r.code, res['status'])
        foods = []
        if advice:
            for name in advice[2]:
                f = foods_by_name.get(name)
                if f and f.id not in excluded:
                    foods.append({'id': f.id, 'name': f.name, 'name_ar': f.name_ar, 'in_plan': name in in_plan})
        out.append({**res, 'date': t.date.isoformat(), 'text_en': advice[0] if advice else '', 'text_ar': advice[1] if advice else '',
                    'foods': foods, 'nutrient': advice[3] if advice else None})
    order = {'low': 0, 'high': 1, 'normal': 2}
    return sorted(out, key=lambda a: (not a['refer'], order.get(a['status'], 3)))


def _save_results(test, rows):
    test.results.all().delete()
    for row in rows or []:
        value = _num(row.get('value'))
        name = str(row.get('name') or '').strip()[:120]
        code = row.get('code') if row.get('code') in MARKERS else match_marker(name)
        if value is None or not (name or code):
            continue
        BloodResult.objects.create(test=test, code=code or '', name=name or MARKERS[code][0], value=value,
                                   unit=str(row.get('unit') or (MARKERS[code][2] if code else ''))[:30],
                                   ref_low=_num(row.get('ref_low')), ref_high=_num(row.get('ref_high')))


class BloodTestListView(APIView):
    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        tests = list(client.blood_tests.prefetch_related('results').select_related('file'))
        return Response({
            'tests': [test_json(t, client.gender) for t in tests],
            'advice': blood_advice(client, tests),
            'markers': [{'code': c, 'name_en': m[0], 'name_ar': m[1], 'unit': m[2]} for c, m in MARKERS.items()],
        })

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        d = request.data
        date = parse_day(d.get('date'))
        if not date:
            return Response({'detail': 'date_required'}, status=400)
        try:
            file = _decode_file(d.get('file'))
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        with transaction.atomic():
            test = BloodTest.objects.create(client=client, date=date, lab=str(d.get('lab') or '')[:120], note=str(d.get('note') or ''))
            _save_results(test, d.get('results'))
            if file:
                BloodTestFile.objects.create(test=test, data=file[0], content_type=file[1], name=file[2])
        return Response(test_json(test, client.gender), status=201)


class BloodTestDetailView(APIView):
    def _get(self, request, test_id):
        return get_object_or_404(BloodTest.objects.select_related('client'), id=test_id, client__in=client_qs(request.user))

    def put(self, request, test_id):
        test = self._get(request, test_id)
        d = request.data
        if 'date' in d and parse_day(d['date']):
            test.date = parse_day(d['date'])
        for f in ('lab', 'note'):
            if f in d:
                setattr(test, f, str(d[f] or ''))
        if 'shared' in d:
            test.shared = str(d['shared']).lower() in ('true', '1')
        with transaction.atomic():
            test.save()
            if 'results' in d:
                _save_results(test, d['results'])
        return Response(test_json(test, test.client.gender))

    def delete(self, request, test_id):
        self._get(request, test_id).delete()
        return Response(status=204)


class BloodTestFileView(APIView):
    def get(self, request, test_id):
        test = get_object_or_404(BloodTest, id=test_id, client__in=client_qs(request.user))
        f = get_object_or_404(BloodTestFile, test=test)
        resp = HttpResponse(bytes(f.data), content_type=f.content_type)
        resp['Content-Disposition'] = f'inline; filename="{f.name or "blood-test"}"'
        return resp


class BloodReadView(APIView):
    """Read the results from an uploaded lab report (AI). Nothing is saved here."""

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        try:
            ai.check_allowed(request.user)
            file = _decode_file(request.data.get('file'))
            if not file:
                return Response({'detail': 'file_required'}, status=400)
            out = ai.read_blood_test(file[0], file[1], client)
        except ai.AIUnavailable as exc:
            return _ai_error(exc)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        for r in out['results']:
            r['code'] = match_marker(r['name']) or ''
        return Response(out)


# ----------------------------------------------------------------- history ---

BODY = [  # field, English, Arabic, unit
    ('weight', 'Weight', 'الوزن', 'kg'), ('pbf', 'Body fat', 'نسبة الدهون', '%'), ('smm', 'Muscle mass', 'الكتلة العضلية', 'kg'),
    ('body_fat_mass', 'Body fat mass', 'كتلة الدهون', 'kg'), ('visceral_fat', 'Visceral fat', 'الدهون الحشوية', ''),
    ('waist_hip', 'Waist-hip ratio', 'نسبة الخصر للورك', ''), ('inbody_bmr', 'BMR (InBody)', 'معدل الحرق (InBody)', 'kcal'),
    ('calorie_target', 'Calorie target', 'السعرات المستهدفة', 'kcal'),
]


class HistoryView(APIView):
    """Everything ever measured for the client, one row per measurement with all its past values."""

    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        revisions = list(client.profile_revisions.order_by('created_at'))
        body = []
        for field, en, ar, unit in BODY:
            pts = [{'date': r.created_at.date().isoformat(), 'value': round(getattr(r, field), 2), 'source': r.source}
                   for r in revisions if getattr(r, field) is not None]
            if pts:
                body.append({'key': field, 'name_en': en, 'name_ar': ar, 'unit': unit, 'points': pts})
        series = {}
        for t in client.blood_tests.order_by('date', 'id').prefetch_related('results'):
            for r in t.results.all():
                res = result_json(r, client.gender)
                key = r.code or r.name.lower()
                s = series.setdefault(key, {'key': key, 'name_en': res['name_en'], 'name_ar': res['name_ar'], 'unit': res['unit'],
                                            'ref_low': res['ref_low'], 'ref_high': res['ref_high'], 'points': []})
                s['points'].append({'date': t.date.isoformat(), 'value': r.value, 'status': res['status'], 'test': t.id})
        order = {c: i for i, c in enumerate(MARKERS)}
        blood = sorted(series.values(), key=lambda s: order.get(s['key'], 999))
        return Response({'body': body, 'blood': blood})


# ------------------------------------------------------- vitamins & minerals ---

def _needs(client):
    d = DetailedProfile.objects.filter(client=client).first()
    return daily_needs(client.gender, client.age, pregnant=bool(d and d.pregnant))


def _blood_lows(client):
    return sorted({a['nutrient'] for a in blood_advice(client) if a['nutrient'] and a['status'] == 'low'})


class MicroNeedsView(APIView):
    """Daily needs for this client + which nutrients their latest blood test shows low (for the plan builder)."""

    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        return Response({'needs': _needs(client), 'blood_low': _blood_lows(client),
                         'nutrients': [{'key': k, 'en': en, 'ar': ar, 'unit': u, 'kind': kind} for k, en, ar, u, kind in NUTRIENTS]})


class PlanMicrosView(APIView):
    """Vitamins & minerals of a saved plan vs the client's needs, with the best foods to close each gap."""

    def get(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user).select_related('client'), id=plan_id)
        client = plan.client
        needs = _needs(client)
        totals, missing = plan_micros(plan)
        excluded = set(client.excluded_foods.values_list('id', flat=True))
        foods = list(FoodItem.objects.exclude(micros={}))
        rows = []
        for key, en, ar, unit, kind in NUTRIENTS:
            value, need = totals.get(key, 0), needs[key]
            pct = round(100 * value / need) if need else 0
            status = ('high' if value > need else 'ok') if kind == 'max' else ('ok' if pct >= 90 else 'low' if pct < 50 else 'near')
            rows.append({'key': key, 'en': en, 'ar': ar, 'unit': unit, 'kind': kind, 'value': round(value, 1), 'need': need,
                         'pct': pct, 'status': status,
                         'sources': best_sources(key, foods, excluded) if status in ('low', 'near') else []})
        return Response({'rows': rows, 'missing': missing, 'blood_low': _blood_lows(client)})

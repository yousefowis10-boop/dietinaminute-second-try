"""Business rules shared by the API views.

Everything numeric (calories, macros, servings, meal split) is calculated here,
by the app. AI features may suggest foods, but never produce the numbers.
"""
import ast
import operator
from collections import defaultdict
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import BMRFormula, ClientProfile, DietPlan

User = get_user_model()

KCAL_PER_GRAM = {'protein': 4, 'carb': 4, 'fat': 9}


# ---------------------------------------------------------------- access ---

def team_user_ids(user):
    """The dietitian alone, or every dietitian in the same clinic."""
    if getattr(user, 'clinic_id', None):
        return list(User.objects.filter(clinic_id=user.clinic_id).values_list('id', flat=True))
    return [user.id]


def client_qs(user):
    return ClientProfile.objects.filter(user_id__in=team_user_ids(user))


def plan_qs(user):
    return DietPlan.objects.filter(client__user_id__in=team_user_ids(user))


# ------------------------------------------------------------- targets ---

_ALLOWED_OPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.Pow: operator.pow, ast.USub: operator.neg, ast.UAdd: operator.pos,
}


def safe_eval_formula(expression, **variables):
    """Evaluate a stored BMR formula using only numbers, + - * / ** and weight/height/age."""
    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.Name) and node.id in variables:
            return float(variables[node.id])
        if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPS:
            return _ALLOWED_OPS[type(node.op)](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPS:
            return _ALLOWED_OPS[type(node.op)](_eval(node.operand))
        raise ValueError('Formula contains something that is not allowed')
    return _eval(ast.parse(expression, mode='eval'))


def calculate_targets(*, formula_name, gender, weight, height, age, work_style,
                      adjustment=0, protein_pct=25, carb_pct=55, fat_pct=20):
    """BMR -> daily energy -> calorie target -> grams of protein/carbs/fat."""
    formula = BMRFormula.objects.prefetch_related('gender_formulas', 'activity_levels').filter(name=formula_name).first()
    if formula is None:
        formula = BMRFormula.objects.prefetch_related('gender_formulas', 'activity_levels').first()
    if formula is None:
        raise ValueError('No BMR formula is set up')
    gender_formula = next((g for g in formula.gender_formulas.all() if g.gender == gender), None)
    if gender_formula is None:
        raise ValueError('Formula has no expression for this gender')
    activity = next((a for a in formula.activity_levels.all() if a.level == work_style), None)
    multiplier = activity.multiplier if activity else 1.0

    pct_total = float(protein_pct) + float(carb_pct) + float(fat_pct)
    if abs(pct_total - 100) > 0.01:
        raise ValueError('Protein, carb and fat percentages must add up to 100')

    bmr = safe_eval_formula(gender_formula.expression, weight=weight, height=height, age=age)
    tdee = bmr * multiplier
    target = tdee + float(adjustment or 0)
    return {
        'formula': formula.name,
        'bmr': round(bmr),
        'multiplier': multiplier,
        'tdee': round(tdee),
        'target_calories': round(target),
        'protein_g': round(target * float(protein_pct) / 100 / 4, 1),
        'carb_g': round(target * float(carb_pct) / 100 / 4, 1),
        'fat_g': round(target * float(fat_pct) / 100 / 9, 1),
        'protein_pct': float(protein_pct), 'carb_pct': float(carb_pct), 'fat_pct': float(fat_pct),
    }


# ----------------------------------------------------------- meal split ---

def normalized_shares(item, tags):
    """Share of the item that goes to each meal. Falls back to an equal split."""
    if not tags:
        return {}
    raw = item.meal_shares or {}
    shares = {}
    for tag in tags:
        try:
            value = float(raw.get(str(tag.id), raw.get(tag.id, 0)) or 0)
        except (TypeError, ValueError):
            value = 0
        shares[tag.id] = max(value, 0)
    total = sum(shares.values())
    if total <= 0:
        return {tag.id: 1 / len(tags) for tag in tags}
    return {tag_id: value / total for tag_id, value in shares.items()}


TYPE_ORDER = {'protein': 0, 'carb': 1, 'fat': 2}


def split_plan(plan):
    """Amounts per meal, in real units, plus foods not assigned to any meal."""
    result = defaultdict(list)
    unassigned = []
    items = sorted(plan.items.select_related('food').prefetch_related('tags'),
                   key=lambda i: (TYPE_ORDER.get(i.food.food_type, 9), i.id))
    for item in items:
        tags = list(item.tags.all())
        if not tags:
            unassigned.append(item.food.name_ar or item.food.name)
            continue
        shares = normalized_shares(item, tags)
        factor = item.food.multiplying_factor or 1
        for tag in tags:
            amount = (Decimal(str(item.quantity)) * Decimal(str(factor)) * Decimal(str(shares[tag.id]))).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP)
            result[tag.name].append({
                'food': item.food.name_ar or item.food.name,
                'food_en': item.food.name,
                'amount': float(amount),
                'unit': item.food.unit_ar or '',
                'unit_en': item.food.unit or '',
                'factor': factor,
                'quantity': f"{amount} {item.food.unit_ar or ''}".strip(),
            })
    return dict(result), unassigned


def grocery_list(plan, days=7):
    """Weekly shopping amounts per food, in real units."""
    rows = []
    for item in plan.items.select_related('food'):
        factor = item.food.multiplying_factor or 1
        rows.append({
            'food': item.food.name_ar or item.food.name,
            'food_en': item.food.name,
            'per_day': round(item.quantity * factor, 1),
            'per_week': round(item.quantity * factor * days, 1),
            'unit': item.food.unit_ar or '',
            'unit_en': item.food.unit or '',
            'factor': factor,
            'type': item.food.food_type,
        })
    return sorted(rows, key=lambda r: (TYPE_ORDER.get(r['type'], 9), r['food_en']))


# -------------------------------------------------------- plan totals ---

def totals_for(items, foods_by_id):
    totals = {'protein': 0.0, 'carb': 0.0, 'fat': 0.0}
    for item in items:
        food = foods_by_id[item['food_id']]
        for macro in totals:
            totals[macro] += getattr(food, macro) * float(item['quantity'])
    totals['kcal'] = sum(totals[m] * KCAL_PER_GRAM[m] for m in KCAL_PER_GRAM)
    return {k: round(v, 1) for k, v in totals.items()}


def fit_servings(items, foods_by_id, targets, rounds=6, step=0.5, allow_drop=False):
    """Adjust servings so each macro lands near its target.

    Foods are grouped by their type (carb/protein/fat). Each round scales a
    group so its macro hits the target given what the other foods add,
    then rounds to half servings. Pure arithmetic: same input, same output.
    """
    items = [dict(i) for i in items]
    for _ in range(rounds):
        for macro in ('protein', 'carb', 'fat'):
            group = [i for i in items if foods_by_id[i['food_id']].food_type == macro]
            if not group:
                continue
            from_group = sum(getattr(foods_by_id[i['food_id']], macro) * i['quantity'] for i in group)
            from_others = sum(getattr(foods_by_id[i['food_id']], macro) * i['quantity'] for i in items if i not in group)
            needed = max(targets[macro] - from_others, 0)
            if from_group <= 0:
                continue
            scale = needed / from_group
            for i in group:
                i['quantity'] = max(step, round(i['quantity'] * scale / step) * step)
    refined = refine_servings(items, foods_by_id, targets, step=step, minimum=0 if allow_drop else step)
    return [i for i in refined if i['quantity'] > 0]


def _error(items, foods_by_id, targets):
    total = 0.0
    for macro in ('protein', 'carb', 'fat'):
        if not targets.get(macro):
            continue
        amount = sum(getattr(foods_by_id[i['food_id']], macro) * i['quantity'] for i in items)
        total += ((amount - targets[macro]) / targets[macro]) ** 2
    return total


def refine_servings(items, foods_by_id, targets, step=0.5, minimum=0.5, maximum=15, max_moves=400):
    """Step-by-step search: nudge one food by half a serving at a time while it gets closer.

    Balances all three macros together, so mixed foods (e.g. cheese = protein + fat)
    are handled. Deterministic and bounded.
    """
    items = [dict(i) for i in items]
    best = _error(items, foods_by_id, targets)
    for _ in range(max_moves):
        move = None
        for index, item in enumerate(items):
            for delta in (step, -step):
                new_q = round(item['quantity'] + delta, 2)
                if new_q < minimum or new_q > maximum:
                    continue
                old_q = item['quantity']
                item['quantity'] = new_q
                err = _error(items, foods_by_id, targets)
                item['quantity'] = old_q
                if err < best - 1e-9 and (move is None or err < move[2]):
                    move = (index, new_q, err)
        if move is None:
            break
        items[move[0]]['quantity'] = move[1]
        best = move[2]
    return items


def within(totals, targets, tolerance=0.05):
    return {m: abs(totals[m] - targets[m]) <= targets[m] * tolerance for m in ('protein', 'carb', 'fat') if targets.get(m)}


# ------------------------------------------------------------- safety ---

def safety_flags(client, detailed):
    """Rule-based warnings. Always on, on every plan, with or without AI."""
    flags = []

    def add(code, text_en, text_ar):
        flags.append({'code': code, 'en': text_en, 'ar': text_ar})

    if detailed is not None:
        diseases = [d for d in (detailed.diseases or []) if d]
        if diseases:
            add('diseases', f"Medical conditions reported: {', '.join(diseases)}",
                f"أمراض مذكورة: {', '.join(diseases)}")
        if detailed.food_allergies:
            add('allergies', f"Food allergies: {', '.join(detailed.food_allergies)}. Confirm excluded foods.",
                f"حساسية طعام: {', '.join(detailed.food_allergies)}. تأكد من استبعاد الأطعمة.")
        if (detailed.current_medications or '').strip():
            add('medications', 'Takes medication. Check for food interactions.', 'يتناول أدوية. تحقق من التداخلات مع الطعام.')
        if detailed.pregnant:
            add('pregnant', 'Pregnant. Use pregnancy-safe targets; avoid calorie deficit.', 'حامل. استخدم أهدافًا آمنة للحمل وتجنب العجز في السعرات.')
        if detailed.breastfeeding:
            add('breastfeeding', 'Breastfeeding. Extra energy needs.', 'مرضعة. احتياج إضافي للطاقة.')
        if (detailed.surgical_history or '').strip():
            add('surgery', 'Has surgical history. Review before planning.', 'لديه تاريخ جراحي. راجع قبل التخطيط.')
    if client.height and client.weight:
        bmi = client.weight / ((client.height / 100) ** 2)
        if bmi < 18.5:
            add('low_bmi', f'Low BMI ({bmi:.1f}). Avoid weight-loss plans; screen for eating concerns.',
                f'مؤشر كتلة منخفض ({bmi:.1f}). تجنب خطط إنقاص الوزن وانتبه لاضطرابات الأكل.')
        if bmi >= 40:
            add('high_bmi', f'Very high BMI ({bmi:.1f}). Consider medical follow-up.', f'مؤشر كتلة مرتفع جدًا ({bmi:.1f}). يُنصح بمتابعة طبية.')
    if client.target_calories and client.target_calories < (1200 if client.gender == 'F' else 1500):
        add('low_calories', f'Calorie target is very low ({round(client.target_calories)} kcal).',
            f'هدف السعرات منخفض جدًا ({round(client.target_calories)} سعرة).')
    if client.age and client.age < 18:
        add('minor', 'Client is under 18. Use paediatric guidance.', 'العميل دون 18 عامًا. اتبع إرشادات الأطفال.')
    return flags


# ------------------------------------------------------------ follow-up ---

def follow_up_due(client, days=21):
    last = client.profile_revisions.order_by('-created_at').first()
    last_date = last.created_at if last else client.created_at
    return last_date < timezone.now() - timedelta(days=days), last_date


def progress_change(client):
    revisions = list(client.profile_revisions.order_by('created_at'))
    if len(revisions) < 2:
        return None
    first, prev, last = revisions[0], revisions[-2], revisions[-1]

    def diff(a, b, field):
        x, y = getattr(a, field), getattr(b, field)
        return round(y - x, 1) if x is not None and y is not None else None

    return {
        'since_last': {f: diff(prev, last, f) for f in ('weight', 'pbf', 'smm', 'calorie_target')},
        'since_start': {f: diff(first, last, f) for f in ('weight', 'pbf', 'smm')},
        'visits': len(revisions),
        'last_date': last.created_at.isoformat(),
        'prev_date': prev.created_at.isoformat(),
    }

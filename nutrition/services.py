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


TYPE_ORDER = {'carb': 0, 'protein': 1, 'fat': 2}


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
                'kcal': round((item.food.protein * 4 + item.food.carb * 4 + item.food.fat * 9) * item.quantity * float(shares[tag.id])),
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

# Arabic names for interview options (stored in English).
OPTION_AR = {
    'Peanuts': 'فول سوداني', 'Shellfish': 'مأكولات بحرية قشرية', 'Dairy': 'ألبان', 'Eggs': 'بيض', 'Wheat': 'قمح',
    'Soy': 'صويا', 'Gluten': 'غلوتين', 'Other': 'أخرى', 'Asthma': 'ربو', 'Diabetes': 'سكري',
    'Heart Disease': 'أمراض قلب', 'High Blood Pressure': 'ضغط مرتفع', 'Cancer': 'سرطان',
    'Thyroid Disease': 'أمراض الغدة الدرقية',
}


def _ar_list(values):
    return '، '.join(OPTION_AR.get(v, v) for v in values)


def safety_flags(client, detailed):
    """Rule-based warnings. Always on, on every plan, with or without AI."""
    flags = []

    def add(code, text_en, text_ar):
        flags.append({'code': code, 'en': text_en, 'ar': text_ar})

    if detailed is not None:
        diseases = [d for d in (detailed.diseases or []) if d]
        if diseases:
            add('diseases', f"Medical conditions reported: {', '.join(diseases)}",
                f"أمراض مذكورة: {_ar_list(diseases)}")
        if detailed.food_allergies:
            add('allergies', f"Food allergies: {', '.join(detailed.food_allergies)}. Confirm excluded foods.",
                f"حساسية طعام: {_ar_list(detailed.food_allergies)}. تأكد من استبعاد الأطعمة.")
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


# ------------------------------------------------------------ meal names ---

import random  # noqa: E402
import re  # noqa: E402

MEAL_KEY_RE = re.compile(r'^(meal|snack)([1-9]|1[0-2])$')
DEFAULT_MEAL_NAMES = {'meal1': 'Breakfast', 'meal2': 'Lunch', 'meal3': 'Dinner', 'meal4': 'Meal 4',
                      'snack1': 'Morning snack', 'snack2': 'Afternoon snack', 'snack3': 'Evening snack'}


def ensure_tags(keys):
    """Meal keys are stored as tags; make sure a tag exists for each one (extra meals add new keys)."""
    from .models import Tag
    have = {t.name: t for t in Tag.objects.filter(name__in=keys)}
    for key in keys:
        if key not in have and MEAL_KEY_RE.match(key):
            have[key] = Tag.objects.create(name=key)
    return have


def clean_meal_slots(slots):
    """[{key, name, time}] in the order the dietitian set. Unknown keys are dropped."""
    out, seen = [], set()
    for slot in slots or []:
        if not isinstance(slot, dict):
            continue
        key = str(slot.get('key') or '')
        if not MEAL_KEY_RE.match(key) or key in seen:
            continue
        seen.add(key)
        time = str(slot.get('time') or '')[:5]
        out.append({'key': key, 'name': str(slot.get('name') or DEFAULT_MEAL_NAMES.get(key, key))[:40],
                    'time': time if re.match(r'^\d{1,2}:\d{2}$', time) else ''})
    return out


# ---------------------------------------------------------- common foods ---

# Used until the dietitian has made enough plans for the app to learn their favourites.
COMMON_FOOD_DEFAULTS = {
    'carb': ['white rice', 'oats', 'al reef barn bread', 'potato', 'sweet potato', 'banana', 'pasta', 'apple'],
    'protein': ['chicken breast', 'whole egg boiled', 'tuna in olive', 'steak', 'salmon', 'ground beef', 'turkey', 'shrimp'],
    'fat': ['olive oil', 'avocado', 'walnuts', 'almond', 'american garden peanut butter', 'tahini', 'labneh full fat', 'cashew'],
}


def common_foods(user, per_type=6):
    """The 6 foods of each group this dietitian uses most, filled up with sensible defaults."""
    from django.db.models import Count

    from .models import DietItem, FoodItem
    # A food counts as "favourite" once it has been used in at least 3 plans.
    used = (DietItem.objects.filter(plan__user_id__in=team_user_ids(user))
            .values('food_id', 'food__food_type').annotate(n=Count('plan', distinct=True)).filter(n__gte=3).order_by('-n'))
    by_name = {f.name.strip().lower(): f for f in FoodItem.objects.all()}
    out = {}
    for food_type in ('carb', 'protein', 'fat'):
        ids = [row['food_id'] for row in used if row['food__food_type'] == food_type][:per_type]
        for name in COMMON_FOOD_DEFAULTS[food_type]:
            food = by_name.get(name)
            if len(ids) >= per_type:
                break
            if food and food.id not in ids and food.food_type == food_type:
                ids.append(food.id)
        out[food_type] = ids
    return out


# ------------------------------------------------------- weekly plan ---

# Foods that can stand in for each other. Names as in the food database (lower case).
SWAP_GROUPS = [
    ['white rice', 'pasta', 'potato', 'sweet potato'],
    ['al reef barn bread', 'toast bread - white', 'al reef tortilla', 'alreef oat bread', 'white sandwich rolls - milk'],
    ['banana', 'apple', 'grapes', 'watermelon', 'blueberries'],
    ['chicken breast', 'turkey', 'steak', 'shrimp', 'salmon'],
    ['greek yogurt, plain, al mareaei', 'labneh full fat', 'white cheese'],
    ['walnuts', 'cashew'],
]
MAIN_MACRO = {'carb': 'carb', 'protein': 'protein', 'fat': 'fat'}


def _plan_rows(plan):
    """[(meal_key, food, servings)] for every food in every meal of the plan."""
    rows = []
    for item in plan.items.select_related('food').prefetch_related('tags'):
        tags = list(item.tags.all())
        if not tags:
            continue
        shares = normalized_shares(item, tags)
        for tag in tags:
            rows.append((tag.name, item.food, round(item.quantity * shares[tag.id], 2)))
    return rows


def _macro_totals(rows):
    t = {'protein': 0.0, 'carb': 0.0, 'fat': 0.0}
    for _, food, q in rows:
        for m in t:
            t[m] += getattr(food, m) * q
    return t


def weekly_plan(plan, seed=None, days=7):
    """Day 1 = the plan. Days 2-7 swap foods inside the same group and recalculate servings
    so each day stays close to the same calories and macros. Excluded foods are never used."""
    from .models import DetailedProfile, FoodItem
    rng = random.Random(seed if seed is not None else plan.id)
    client = plan.client
    excluded = set(client.excluded_foods.values_list('id', flat=True))
    detailed = DetailedProfile.objects.filter(client=client).first()
    liked = set(detailed.liked_foods or []) if detailed else set()
    by_name = {f.name.strip().lower(): f for f in FoodItem.objects.all()}
    groups = []
    for names in SWAP_GROUPS:
        members = [by_name[n] for n in names if n in by_name and by_name[n].id not in excluded]
        if len(members) > 1:
            groups.append(members)
    group_of = {f.id: g for g in groups for f in g}

    base = _plan_rows(plan)
    target = _macro_totals(base)

    def err(rows):
        t = _macro_totals(rows)
        return sum(((t[m] - target[m]) / target[m]) ** 2 for m in t if target[m])

    out = [{'items': [{'meal': k, 'food_id': f.id, 'quantity': q, 'swapped': False} for k, f, q in base]}]
    # Each swappable food gets its own rotation (liked foods first), so every day is a little different.
    cycles = {}
    for _, food, _ in base:
        group = group_of.get(food.id)
        if group and food.id not in cycles:
            options = [f for f in group if f.id != food.id and f.food_type == food.food_type]
            rng.shuffle(options)
            options.sort(key=lambda f: f.id not in liked)
            cycles[food.id] = options + [food]  # back to the original once in a while
    offsets = {fid: rng.randrange(len(c)) for fid, c in cycles.items()}
    for day in range(1, days):
        choice = {fid: c[(day - 1 + offsets[fid]) % len(c)] for fid, c in cycles.items()}
        if cycles and all(choice[fid].id == fid for fid in cycles):  # never repeat day 1 exactly
            fid = next(iter(cycles))
            choice[fid] = cycles[fid][0]
        rows = []  # [meal, food, servings, swapped, start]
        for meal, food, q in base:
            new = choice.get(food.id, food)
            if new.id != food.id:
                macro = MAIN_MACRO.get(food.food_type, 'carb')
                grams = getattr(food, macro) * q
                per = getattr(new, macro) or 0
                q2 = max(0.5, round((grams / per) * 2) / 2) if per else q
                rows.append([meal, new, q2, True, q2])
            else:
                rows.append([meal, food, q, False, q])
        # Same small search the plan builder uses: nudge swapped foods and fats by half servings.
        for _ in range(60):
            best, move = err([(r[0], r[1], r[2]) for r in rows]), None
            for i, r in enumerate(rows):
                if not (r[3] or r[1].food_type == 'fat'):
                    continue
                lo, hi = (max(0.5, r[4] - 1), r[4] + 1) if r[1].food_type == 'fat' else (max(0.5, r[4] - 0.5), r[4] + 0.5)
                for d in (-0.5, 0.5):
                    if lo <= r[2] + d <= hi:
                        r[2] += d
                        e = err([(x[0], x[1], x[2]) for x in rows])
                        r[2] -= d
                        if e < best - 1e-9:
                            best, move = e, (i, d)
            if not move:
                break
            rows[move[0]][2] += move[1]
        out.append({'items': [{'meal': r[0], 'food_id': r[1].id, 'quantity': round(r[2], 2), 'swapped': r[3]}
                              for r in rows if r[2] > 0]})
    return {'days': out, 'generated_at': timezone.now().isoformat()}


def describe_week(week):
    """Add names, amounts and calories to a stored week for the screen and PDF."""
    from .models import FoodItem
    if not week:
        return None
    ids = {i['food_id'] for d in week.get('days', []) for i in d.get('items', [])}
    foods = {f.id: f for f in FoodItem.objects.filter(id__in=ids)}
    days = []
    for d in week.get('days', []):
        items, kcal = [], 0.0
        for i in d.get('items', []):
            f = foods.get(i['food_id'])
            if f is None:
                continue
            q = float(i['quantity'])
            k = (f.protein * 4 + f.carb * 4 + f.fat * 9) * q
            kcal += k
            items.append({**i, 'name': f.name, 'name_ar': f.name_ar, 'unit': f.unit, 'unit_ar': f.unit_ar,
                          'factor': f.multiplying_factor or 1, 'food_type': f.food_type,
                          'amount': round(q * (f.multiplying_factor or 1), 1), 'kcal': round(k)})
        days.append({'items': items, 'kcal': round(kcal), 'swaps': sum(1 for i in items if i['swapped'])})
    return {'days': days, 'generated_at': week.get('generated_at')}


def sync_never_foods(client, detailed):
    """Foods picked as 'never eats' in the interview are added to the client's excluded foods."""
    from .models import FoodItem
    ids = [int(i) for i in (getattr(detailed, 'never_foods', None) or []) if str(i).isdigit()]
    if ids:
        client.excluded_foods.add(*FoodItem.objects.filter(id__in=ids))

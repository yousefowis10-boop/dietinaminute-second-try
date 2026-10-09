"""AI helpers. The AI chooses and explains; the app calculates.

Configuration (environment variables):
  ANTHROPIC_API_KEY  - enables real AI. Without it, AI features are unavailable.
  AI_MODEL           - model name, default "claude-sonnet-5".
  AI_FAKE=true       - TEST SERVERS ONLY: return predictable sample output without
                       calling any AI, so the screens can be tried end to end.
"""
import json
import os
import re
import urllib.error
import urllib.request

from .models import DetailedProfile, FoodItem
from .services import fit_servings, safety_flags, totals_for, within

API_URL = 'https://api.anthropic.com/v1/messages'
INTERVIEW_FIELDS = [
    'occupation', 'symptoms', 'food_allergies', 'diseases', 'allergy_notes', 'protein', 'fat', 'carbs', 'grains',
    'vegetables', 'fruit', 'dairy', 'food_to_eat_more', 'food_to_eat_less', 'food_to_avoid',
    'current_supplement_intake', 'current_medications', 'medicine_history', 'surgical_history', 'lifestyle_goal',
    'dietary_goal', 'fitness_goal', 'additional_concerns', 'smoke_cigarettes', 'caffeine', 'how_many_caffeine_a_day',
    'exercise', 'exercise_times_per_week', 'workout_intensity', 'types_of_workout', 'exercise_place', 'exercise_level', 'willing_gym', 'willing_home', 'sleep_time', 'sleep_duration',
    'overall_energy_levels', 'pregnant', 'breastfeeding', 'marital_status',
]


class AIUnavailable(Exception):
    pass


def is_fake():
    return os.getenv('AI_FAKE', '').lower() == 'true'


def is_configured():
    return is_fake() or bool(os.getenv('ANTHROPIC_API_KEY'))


def check_allowed(user):
    """Raise AIUnavailable with a clear reason when AI can't be used."""
    if not user.has_ai_plan:
        raise AIUnavailable('upgrade_required')
    profile = getattr(user, 'profile', None)
    if profile is not None and not profile.ai_enabled:
        raise AIUnavailable('disabled_by_user')
    if not is_configured():
        raise AIUnavailable('not_configured')


def _call(system, prompt, max_tokens=2000):
    body = json.dumps({
        'model': os.getenv('AI_MODEL', 'claude-sonnet-5'),
        'max_tokens': max_tokens,
        'system': system,
        'messages': [{'role': 'user', 'content': prompt}],
    }).encode()
    request = urllib.request.Request(API_URL, data=body, method='POST', headers={
        'content-type': 'application/json',
        'x-api-key': os.environ['ANTHROPIC_API_KEY'],
        'anthropic-version': '2023-06-01',
    })
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            data = json.loads(response.read())
    except (urllib.error.URLError, TimeoutError) as exc:
        raise AIUnavailable('provider_error') from exc
    return ''.join(block.get('text', '') for block in data.get('content', []) if block.get('type') == 'text')


def _json(text):
    match = re.search(r'\{.*\}', text, re.S)
    if not match:
        raise AIUnavailable('bad_response')
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise AIUnavailable('bad_response') from exc


def _client_context(client):
    detailed = DetailedProfile.objects.filter(client=client).first()
    answers = {}
    if detailed:
        for field in INTERVIEW_FIELDS:
            value = getattr(detailed, field, None)
            if value not in (None, '', [], {}):
                answers[field] = str(value) if not isinstance(value, (list, bool, int, float)) else value
        # Food choices are stored as ids; give the AI the names.
        names = dict(FoodItem.objects.values_list('id', 'name'))
        for field, key in (('liked_foods', 'foods_liked'), ('never_foods', 'foods_never_eaten'), ('less_foods', 'foods_to_eat_less')):
            ids = getattr(detailed, field, None) or []
            if ids:
                answers[key] = [names[i] for i in ids if i in names]
        if detailed.drinks:
            answers['drinks'] = detailed.drinks
    return detailed, {
        'name': client.name, 'age': client.age, 'gender': client.gender, 'weight_kg': client.weight,
        'height_cm': client.height, 'goal': client.goal, 'work_style': client.work_style,
        'body_fat_pct': client.pbf, 'muscle_kg': client.smm, 'notes': client.description,
        'targets': {'kcal': client.target_calories, 'protein_g': client.target_protein,
                    'carb_g': client.target_carb, 'fat_g': client.target_fat},
        'interview': answers,
    }


SYSTEM = (
    "You assist a licensed dietitian. You never diagnose, never prescribe medication, and never "
    "give final decisions: the dietitian reviews everything. Be concise and practical. "
    "Reply with JSON only, no other text."
)


# ------------------------------------------------------------ summary ---

def interview_summary(client, language='ar'):
    detailed, context = _client_context(client)
    rule_flags = safety_flags(client, detailed)
    if is_fake():
        result = {
            'summary': f"[TEST MODE - sample text, not real AI] {client.name}, {client.age}y, goal: {client.goal or 'not set'}. "
                       f"{len(context['interview'])} interview answers on file.",
            'recommendations': ['[TEST MODE] Spread protein across all meals.',
                                '[TEST MODE] Plan meals around the client\'s working hours.'],
            'red_flags': [],
        }
    else:
        lang = 'Arabic' if language == 'ar' else 'English'
        prompt = (
            f"Client data (JSON):\n{json.dumps(context, ensure_ascii=False, default=str)}\n\n"
            f"Write in {lang}. Return JSON with keys: "
            '"summary" (3-4 sentences: who they are, lifestyle, eating pattern, goal), '
            '"recommendations" (3-6 short practical suggestions for the plan), '
            '"red_flags" (list of {"flag", "why"} for anything needing the dietitian\'s care: medical, '
            'medication, pregnancy, eating-disorder signs, unrealistic goals; empty list if none).'
        )
        result = _json(_call(SYSTEM, prompt))
    result['rule_flags'] = rule_flags
    result['test_mode'] = is_fake()
    return result


# --------------------------------------------------------- draft plan ---

# Test mode only: everyday foods to pick first, so the sample draft looks like a real plan.
EVERYDAY = {
    'protein': ['chicken breast', 'salmon', 'whole egg boiled', 'steak', 'turkey'],
    'carb': ['white rice', 'oats', 'sweet potato', 'potato', 'banana', 'pasta'],
    'fat': ['olive oil', 'avocado', 'walnuts'],
}


def draft_plan(client, meals=4, language='ar'):
    """AI picks foods and rough servings; the app then fits servings to the targets."""
    targets = {'protein': client.target_protein or 0, 'carb': client.target_carb or 0, 'fat': client.target_fat or 0}
    if not all(targets.values()):
        raise AIUnavailable('missing_targets')
    excluded = set(client.excluded_foods.values_list('id', flat=True))
    allowed = [f for f in FoodItem.objects.all() if f.id not in excluded and f.food_type in ('protein', 'carb', 'fat')]
    foods_by_id = {f.id: f for f in allowed}
    meal_tags = ['meal1', 'snack1', 'meal2', 'snack2', 'meal3', 'snack3', 'meal4'][:max(2, min(int(meals) * 2 - 1, 7))]

    if is_fake():
        picks, note = [], '[TEST MODE - sample foods chosen by a simple rule, not real AI]'
        for food_type in ('protein', 'carb', 'fat'):
            def purity(f, m=food_type):
                kcal = f.protein * 4 + f.carb * 4 + f.fat * 9
                return (getattr(f, m) * (9 if m == 'fat' else 4)) / kcal if kcal else 0
            liked = set((DetailedProfile.objects.filter(client=client).values_list('liked_foods', flat=True).first()) or [])
            everyday = [f for f in allowed if f.food_type == food_type and (f.name.strip().lower() in EVERYDAY[food_type] or f.id in liked)]
            everyday.sort(key=lambda f: (f.id not in liked, EVERYDAY[food_type].index(f.name.strip().lower()) if f.name.strip().lower() in EVERYDAY[food_type] else 99))
            options = everyday[:2] or sorted(
                [f for f in allowed if f.food_type == food_type and getattr(f, food_type) > 0], key=lambda f: -purity(f))[:2]
            for food in options:
                picks.append({'food_id': food.id, 'servings': 1, 'meals': meal_tags[::2] if food_type != 'fat' else meal_tags[::2][:2]})
    else:
        _, context = _client_context(client)
        catalogue = [{'id': f.id, 'name': f.name, 'name_ar': f.name_ar, 'type': f.food_type, 'unit': f.unit,
                      'per_serving': {'protein': f.protein, 'carb': f.carb, 'fat': f.fat}} for f in allowed]
        prompt = (
            f"Client (JSON): {json.dumps(context, ensure_ascii=False, default=str)}\n\n"
            f"Food list - use ONLY these ids: {json.dumps(catalogue, ensure_ascii=False)}\n\n"
            f"Meals to use: {meal_tags}. Choose foods this client will enjoy and that suit their answers "
            "(dislikes, culture, schedule, medical notes). Pick 2-4 protein, 2-4 carb and 1-2 fat foods. "
            "Prefer everyday whole foods; use supplements, bars, sweets or chips only if the client asked for them. "
            "Rough servings are fine; the app recalculates them. Return JSON: "
            '{"items": [{"food_id": int, "servings": number, "meals": [meal names]}], '
            f'"notes": [short reasons in {"Arabic" if language == "ar" else "English"}]}}'
        )
        data = _json(_call(SYSTEM, prompt))
        picks = data.get('items', [])
        note = data.get('notes', [])

    items = []
    for pick in picks:
        try:
            food_id = int(pick.get('food_id'))
            servings = float(pick.get('servings') or 1)
        except (TypeError, ValueError):
            continue
        if food_id not in foods_by_id:  # never trust an id the app didn't offer
            continue
        meals_for_item = [m for m in (pick.get('meals') or []) if m in meal_tags] or [meal_tags[0]]
        items.append({'food_id': food_id, 'quantity': min(max(servings, 0.5), 10),
                      'category': foods_by_id[food_id].food_type, 'meals': meals_for_item})
    if not items:
        raise AIUnavailable('bad_response')

    fitted = fit_servings(items, foods_by_id, targets, allow_drop=True)
    totals = totals_for(fitted, foods_by_id)
    for item in fitted:
        food = foods_by_id[item['food_id']]
        item.update({'name': food.name, 'name_ar': food.name_ar, 'unit': food.unit, 'unit_ar': food.unit_ar,
                     'protein': food.protein, 'carb': food.carb, 'fat': food.fat, 'food_type': food.food_type,
                     'multiplying_factor': food.multiplying_factor})
    return {
        'items': fitted, 'totals': totals, 'targets': targets, 'on_target': within(totals, targets),
        'notes': note if isinstance(note, list) else [note], 'meals': meal_tags, 'test_mode': is_fake(),
    }


# ----------------------------------------------------- client message ---

def client_message(plan, split, language='ar'):
    client = plan.client
    if is_fake():
        text = (f"[وضع الاختبار - نص تجريبي] مرحبًا {client.name}، هذه خطتك الغذائية الجديدة. "
                "التزم بالكميات المكتوبة لكل وجبة، واشرب الماء بانتظام. نراك في المتابعة القادمة!")
        return {'message': text, 'test_mode': True}
    lang = 'Arabic (warm, simple, Levantine-friendly)' if language == 'ar' else 'English (warm, simple)'
    prompt = (
        f"Client: {client.name}, goal {client.goal}. Plan by meal (JSON): {json.dumps(split, ensure_ascii=False)}\n"
        f"Workout attached: {plan.workout.name if plan.workout else 'none'}.\n"
        f"Write a WhatsApp message in {lang} from the dietitian explaining the plan: how to follow it, "
        "3-4 key rules, encouragement. Do not change any amounts. Return JSON {\"message\": text}."
    )
    data = _json(_call(SYSTEM, prompt, max_tokens=1200))
    return {'message': data.get('message', ''), 'test_mode': False}


# ---------------------------------------------------------- follow-up ---

def follow_up(client, change, language='ar'):
    if is_fake():
        return {'suggestion': '[TEST MODE] Weight trend is shown above. Sample suggestion: keep the plan for 2 more weeks.',
                'test_mode': True}
    _, context = _client_context(client)
    prompt = (
        f"Client: {json.dumps(context, ensure_ascii=False, default=str)}\n"
        f"Change between visits: {json.dumps(change, default=str)}\n"
        f"In {'Arabic' if language == 'ar' else 'English'}, suggest 2-4 adjustments for the next plan "
        "(calories, macro split, meal timing), each with a one-line reason. "
        "Return JSON {\"suggestion\": text}."
    )
    data = _json(_call(SYSTEM, prompt, max_tokens=800))
    return {'suggestion': data.get('suggestion', ''), 'test_mode': False}


# ------------------------------------------------------------ InBody ---

INBODY_FIELDS = ['weight', 'pbf', 'smm', 'body_fat_mass', 'visceral_fat', 'waist_hip', 'inbody_bmr', 'test_date']


def read_inbody(data, content_type, client):
    """Read the numbers from an InBody result sheet (photo or PDF). The dietitian checks them before saving."""
    if is_fake():
        last = client.profile_revisions.order_by('-created_at').first()
        w = (last.weight if last and last.weight else client.weight) or 70
        pbf = (last.pbf if last and last.pbf else client.pbf) or 25
        smm = (last.smm if last and last.smm else client.smm) or 30
        return {'weight': round(w - 0.6, 1), 'pbf': round(pbf - 0.4, 1), 'smm': round(smm + 0.1, 1),
                'body_fat_mass': round((w - 0.6) * (pbf - 0.4) / 100, 1), 'visceral_fat': 9, 'waist_hip': 0.92,
                'inbody_bmr': None, 'test_date': None, 'test_mode': True}
    import base64
    b64 = base64.b64encode(data).decode()
    if content_type == 'application/pdf':
        source = {'type': 'document', 'source': {'type': 'base64', 'media_type': 'application/pdf', 'data': b64}}
    else:
        media = content_type if content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif') else 'image/jpeg'
        source = {'type': 'image', 'source': {'type': 'base64', 'media_type': media, 'data': b64}}
    prompt = (
        "This is a body composition (InBody) result sheet. Read the values exactly as printed. "
        "Return JSON with these keys (number or null if not on the sheet): "
        '{"weight": kg, "pbf": percent body fat, "smm": skeletal muscle mass kg, "body_fat_mass": kg, '
        '"visceral_fat": level, "waist_hip": ratio, "inbody_bmr": kcal, "test_date": "YYYY-MM-DD" or null}. '
        "Do not guess values that are not printed."
    )
    data_out = _json(_call(SYSTEM, [source, {'type': 'text', 'text': prompt}], max_tokens=400))
    clean = {}
    for key in INBODY_FIELDS:
        value = data_out.get(key)
        if key == 'test_date':
            clean[key] = value if isinstance(value, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', value) else None
            continue
        try:
            clean[key] = round(float(value), 2) if value is not None else None
        except (TypeError, ValueError):
            clean[key] = None
    # Sanity limits so a misread never becomes a saved number silently.
    limits = {'weight': (20, 300), 'pbf': (2, 70), 'smm': (5, 80), 'body_fat_mass': (1, 200)}
    for key, (lo, hi) in limits.items():
        if clean.get(key) is not None and not lo <= clean[key] <= hi:
            clean[key] = None
    clean['test_mode'] = False
    return clean

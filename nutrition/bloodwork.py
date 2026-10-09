"""Blood tests and vitamins & minerals: reference ranges, daily needs, food advice.

Food advice only — no medicines or supplement doses. Results far outside the range say "refer to doctor".
Ranges are common adult lab ranges; the lab's own range (when read from the report) always wins.
"""
from collections import defaultdict

# ------------------------------------------------------------ vitamins & minerals ---

NUTRIENTS = [
    # key, English, Arabic, unit, kind ('min' = aim to reach, 'max' = stay under)
    ('iron_mg', 'Iron', 'الحديد', 'mg', 'min'),
    ('calcium_mg', 'Calcium', 'الكالسيوم', 'mg', 'min'),
    ('vitd_ug', 'Vitamin D', 'فيتامين د', 'µg', 'min'),
    ('b12_ug', 'Vitamin B12', 'فيتامين ب12', 'µg', 'min'),
    ('folate_ug', 'Folate', 'حمض الفوليك', 'µg', 'min'),
    ('magnesium_mg', 'Magnesium', 'المغنيسيوم', 'mg', 'min'),
    ('zinc_mg', 'Zinc', 'الزنك', 'mg', 'min'),
    ('potassium_mg', 'Potassium', 'البوتاسيوم', 'mg', 'min'),
    ('fiber_g', 'Fibre', 'الألياف', 'g', 'min'),
    ('sodium_mg', 'Sodium', 'الصوديوم', 'mg', 'max'),
]


def daily_needs(gender, age, pregnant=False):
    """Recommended daily amounts for adults (US Dietary Reference Intakes)."""
    male = gender == 'M'
    age = age or 30
    needs = {
        'iron_mg': 8 if male or age >= 51 else 18,
        'calcium_mg': 1200 if (not male and age >= 51) or age >= 71 else 1000,
        'vitd_ug': 20 if age >= 71 else 15,
        'b12_ug': 2.4,
        'folate_ug': 400,
        'magnesium_mg': (400 if age < 31 else 420) if male else (310 if age < 31 else 320),
        'zinc_mg': 11 if male else 8,
        'potassium_mg': 3400 if male else 2600,
        'fiber_g': (38 if age < 51 else 30) if male else (25 if age < 51 else 21),
        'sodium_mg': 2300,
    }
    if pregnant and not male:
        needs.update(iron_mg=27, folate_ug=600, zinc_mg=11, magnesium_mg=needs['magnesium_mg'] + 40, potassium_mg=2900)
    return needs


def plan_micros(plan):
    """Vitamins & minerals per day for a plan, plus how many foods have no data."""
    totals, missing = defaultdict(float), []
    for item in plan.items.select_related('food'):
        micros = item.food.micros or {}
        if not micros:
            missing.append(item.food.name)
            continue
        for key, *_ in NUTRIENTS:
            totals[key] += float(micros.get(key) or 0) * float(item.quantity or 0)
    return {k: round(v, 2) for k, v in totals.items()}, missing


def best_sources(key, foods, exclude_ids=(), limit=4):
    """Foods with the most of this nutrient per serving (from the given foods)."""
    rows = [(float((f.micros or {}).get(key) or 0), f) for f in foods if f.id not in exclude_ids and (f.micros or {}).get(key)]
    rows.sort(key=lambda r: -r[0])
    return [{'id': f.id, 'name': f.name, 'name_ar': f.name_ar, 'amount': round(v, 2), 'unit': f.unit, 'unit_ar': f.unit_ar}
            for v, f in rows[:limit]]


# ------------------------------------------------------------------ blood tests ---

# code: (English, Arabic, unit, (low, high) for men, (low, high) for women, (refer below, refer above), aliases)
MARKERS = {
    'ferritin': ('Ferritin', 'الفيريتين (مخزون الحديد)', 'ng/mL', (30, 400), (15, 150), (10, 600), ['ferritin', 'فيريتين']),
    'hemoglobin': ('Hemoglobin', 'الهيموغلوبين', 'g/dL', (13.5, 17.5), (12, 15.5), (10, 18.5), ['hemoglobin', 'haemoglobin', 'hb', 'hgb', 'هيموغلوبين']),
    'iron': ('Iron (serum)', 'الحديد في الدم', 'µg/dL', (65, 175), (50, 170), (30, 250), ['iron', 'serum iron', 'fe', 'حديد']),
    'vitd': ('Vitamin D (25-OH)', 'فيتامين د', 'ng/mL', (30, 100), (30, 100), (10, 150), ['vitamin d', '25-oh', '25 oh', 'vit d', 'فيتامين د']),
    'b12': ('Vitamin B12', 'فيتامين ب12', 'pg/mL', (200, 900), (200, 900), (150, 2000), ['b12', 'vitamin b12', 'cobalamin', 'ب12']),
    'folate': ('Folate', 'حمض الفوليك', 'ng/mL', (5.4, 24), (5.4, 24), (3, None), ['folate', 'folic acid', 'فوليك']),
    'calcium': ('Calcium', 'الكالسيوم', 'mg/dL', (8.6, 10.3), (8.6, 10.3), (8.0, 11.0), ['calcium', 'ca', 'كالسيوم']),
    'magnesium': ('Magnesium', 'المغنيسيوم', 'mg/dL', (1.7, 2.2), (1.7, 2.2), (1.4, 3.0), ['magnesium', 'mg', 'مغنيسيوم']),
    'zinc': ('Zinc', 'الزنك', 'µg/dL', (60, 120), (60, 120), (40, None), ['zinc', 'zn', 'زنك']),
    'glucose': ('Fasting glucose', 'السكر الصائم', 'mg/dL', (70, 99), (70, 99), (60, 126), ['glucose', 'fasting glucose', 'fbs', 'blood sugar', 'سكر']),
    'hba1c': ('HbA1c', 'السكر التراكمي', '%', (4.0, 5.6), (4.0, 5.6), (None, 6.5), ['hba1c', 'a1c', 'glycated', 'تراكمي']),
    'total_chol': ('Total cholesterol', 'الكوليسترول الكلي', 'mg/dL', (None, 200), (None, 200), (None, 300), ['total cholesterol', 'cholesterol', 'كوليسترول']),
    'ldl': ('LDL cholesterol', 'الكوليسترول الضار LDL', 'mg/dL', (None, 130), (None, 130), (None, 190), ['ldl']),
    'hdl': ('HDL cholesterol', 'الكوليسترول النافع HDL', 'mg/dL', (40, None), (50, None), (None, None), ['hdl']),
    'triglycerides': ('Triglycerides', 'الدهون الثلاثية', 'mg/dL', (None, 150), (None, 150), (None, 500), ['triglycerides', 'tg', 'دهون ثلاثية']),
    'uric_acid': ('Uric acid', 'حمض اليوريك', 'mg/dL', (3.4, 7.0), (2.4, 6.0), (None, 10), ['uric acid', 'urate', 'يوريك']),
    'tsh': ('TSH (thyroid)', 'هرمون الغدة الدرقية TSH', 'mIU/L', (0.4, 4.0), (0.4, 4.0), (0.4, 4.0), ['tsh', 'thyroid']),
    'alt': ('ALT (liver)', 'إنزيم الكبد ALT', 'U/L', (7, 41), (7, 33), (None, 120), ['alt', 'sgpt']),
    'ast': ('AST (liver)', 'إنزيم الكبد AST', 'U/L', (10, 40), (10, 32), (None, 120), ['ast', 'sgot']),
    'creatinine': ('Creatinine (kidney)', 'الكرياتينين (الكلى)', 'mg/dL', (0.7, 1.3), (0.6, 1.1), (0.6, 1.3), ['creatinine', 'كرياتينين']),
}

# (code, 'low'/'high'): (English advice, Arabic advice, food names in the food list, related nutrient key)
ADVICE = {
    ('ferritin', 'low'): ('Iron stores are low. Add iron-rich foods and eat them with vitamin C (orange, guava, pepper). Keep tea and coffee 1 hour away from meals.',
                          'مخزون الحديد منخفض. أضف أطعمة غنية بالحديد وتناولها مع فيتامين C (برتقال، جوافة، فلفل). الشاي والقهوة بعد الأكل بساعة.',
                          ['lentils (cooked)', 'chickpeas (cooked)', 'beef sirloin, lean (cooked)', 'chicken liver (cooked)', 'spinach', 'orange', 'guava'], 'iron_mg'),
    ('iron', 'low'): None,  # same as ferritin
    ('hemoglobin', 'low'): ('Hemoglobin is low (often from low iron, B12 or folate). Build meals around iron foods with vitamin C, plus eggs, fish and leafy greens.',
                            'الهيموغلوبين منخفض (غالبًا من نقص الحديد أو ب12 أو الفوليك). اجعل الوجبات غنية بالحديد مع فيتامين C، وأضف البيض والسمك والخضار الورقية.',
                            ['beef sirloin, lean (cooked)', 'lentils (cooked)', 'spinach', 'egg, large (boiled)', 'salmon (cooked)', 'orange'], 'iron_mg'),
    ('vitd', 'low'): ('Vitamin D is low. 15–20 minutes of midday sun on arms 3 times a week, oily fish twice a week, eggs and fortified milk. A supplement is for the doctor to decide.',
                      'فيتامين د منخفض. 15–20 دقيقة شمس الظهر على الذراعين 3 مرات بالأسبوع، سمك دهني مرتين بالأسبوع، بيض وحليب مدعّم. المكمّل يقرره الطبيب.',
                      ['salmon (cooked)', 'sardines in oil (drained)', 'mackerel (cooked)', 'egg, large (boiled)', 'full fat milk'], 'vitd_ug'),
    ('b12', 'low'): ('Vitamin B12 is low. It comes only from animal foods: meat, fish, eggs and dairy every day.',
                     'فيتامين ب12 منخفض. موجود فقط في الأطعمة الحيوانية: لحم، سمك، بيض وألبان يوميًا.',
                     ['beef liver (cooked)', 'sardines in oil (drained)', 'salmon (cooked)', 'tuna in water (drained)', 'egg, large (boiled)', 'low-fat yogurt'], 'b12_ug'),
    ('folate', 'low'): ('Folate is low. Add lentils, chickpeas, beans, leafy greens, avocado and oranges.',
                        'حمض الفوليك منخفض. أضف العدس والحمص والفاصوليا والخضار الورقية والأفوكادو والبرتقال.',
                        ['lentils (cooked)', 'chickpeas (cooked)', 'fava beans / foul (cooked)', 'spinach', 'avocado', 'orange'], 'folate_ug'),
    ('calcium', 'low'): ('Calcium is low. 2–3 servings of dairy a day, sardines with bones, tahini and leafy greens.',
                         'الكالسيوم منخفض. 2–3 حصص ألبان يوميًا، سردين بعظمه، طحينة وخضار ورقية.',
                         ['low-fat yogurt', 'milk 2%', 'feta cheese', 'sardines in oil (drained)', 'tahini', 'cottage cheese 2%'], 'calcium_mg'),
    ('magnesium', 'low'): ('Magnesium is low. Nuts, seeds, oats, beans, spinach and bananas.',
                           'المغنيسيوم منخفض. مكسرات، بذور، شوفان، بقوليات، سبانخ وموز.',
                           ['pumpkin seeds (kernels)', 'almond', 'cashew', 'oats', 'spinach', 'banana'], 'magnesium_mg'),
    ('zinc', 'low'): ('Zinc is low. Red meat, pumpkin seeds, chickpeas, cashews and dairy.',
                      'الزنك منخفض. لحم أحمر، بذور القرع، حمص، كاجو وألبان.',
                      ['beef sirloin, lean (cooked)', 'pumpkin seeds (kernels)', 'chickpeas (cooked)', 'cashew', 'cottage cheese 2%'], 'zinc_mg'),
    ('glucose', 'high'): ('Blood sugar is high. Smaller carb portions spread over the day, whole grains instead of white, legumes, vegetables with every meal; cut sugar, juices and sweets.',
                          'السكر مرتفع. حصص نشويات أصغر وموزعة على اليوم، حبوب كاملة بدل البيضاء، بقوليات، خضار مع كل وجبة؛ وقلل السكر والعصائر والحلويات.',
                          ['bulgur (cooked)', 'brown rice (cooked)', 'whole-wheat toast', 'lentils (cooked)', 'oats', 'green beans'], 'fiber_g'),
    ('hba1c', 'high'): None,  # same as glucose
    ('total_chol', 'high'): ('Cholesterol is high. Olive oil instead of butter and ghee, oats and beans every day, nuts, oily fish; fewer fried and processed foods.',
                             'الكوليسترول مرتفع. زيت زيتون بدل الزبدة والسمن، شوفان وبقوليات يوميًا، مكسرات، سمك دهني؛ وقلل المقالي والأطعمة المصنّعة.',
                             ['oats', 'olive oil', 'walnuts', 'kidney beans (cooked)', 'avocado', 'salmon (cooked)'], 'fiber_g'),
    ('ldl', 'high'): None,  # same as total_chol
    ('hdl', 'low'): ('HDL ("good" cholesterol) is low. Healthy fats (olive oil, avocado, nuts, fish) and regular exercise raise it.',
                     'الكوليسترول النافع منخفض. الدهون الصحية (زيت زيتون، أفوكادو، مكسرات، سمك) والرياضة المنتظمة ترفعه.',
                     ['olive oil', 'avocado', 'walnuts', 'almond', 'salmon (cooked)'], None),
    ('triglycerides', 'high'): ('Triglycerides are high. Cut sugar, sweets, juices and white bread; oily fish twice a week, more fibre.',
                                'الدهون الثلاثية مرتفعة. قلل السكر والحلويات والعصائر والخبز الأبيض؛ سمك دهني مرتين بالأسبوع، وألياف أكثر.',
                                ['salmon (cooked)', 'sardines in oil (drained)', 'walnuts', 'oats', 'lentils (cooked)'], 'fiber_g'),
    ('uric_acid', 'high'): ('Uric acid is high. Less red meat, organ meats and shellfish, no sugary drinks; plenty of water, low-fat dairy and cherries.',
                            'حمض اليوريك مرتفع. قلل اللحوم الحمراء والأحشاء والمأكولات البحرية القشرية، بدون مشروبات محلاة؛ ماء كثير، ألبان قليلة الدسم وكرز.',
                            ['low-fat yogurt', 'skim milk', 'cherries', 'cucumber'], None),
    ('alt', 'high'): ('Liver enzyme is raised. Losing weight slowly, cutting sugar, fried food and sweet drinks helps — and the doctor should follow it up.',
                      'إنزيم الكبد مرتفع. نزول الوزن بالتدريج وتقليل السكر والمقالي والمشروبات المحلاة يساعد — ويتابعه الطبيب.',
                      ['oats', 'olive oil', 'lentils (cooked)', 'broccoli'], None),
    ('ast', 'high'): None,  # same as alt
}
ALIAS = {('iron', 'low'): ('ferritin', 'low'), ('hba1c', 'high'): ('glucose', 'high'), ('ldl', 'high'): ('total_chol', 'high'),
         ('ast', 'high'): ('alt', 'high')}
DOCTOR_ONLY = {'tsh', 'creatinine'}


def marker_range(code, gender):
    m = MARKERS.get(code)
    if not m:
        return None, None
    return m[3] if gender == 'M' else m[4]


def status_of(code, value, low, high, gender):
    """'low' / 'normal' / 'high' plus whether to refer to a doctor."""
    if value is None:
        return None, False
    if low is None and high is None:
        low, high = marker_range(code, gender)
    status = 'low' if low is not None and value < low else 'high' if high is not None and value > high else 'normal'
    refer = False
    m = MARKERS.get(code)
    if m:
        r_lo, r_hi = m[5]
        refer = (r_lo is not None and value < r_lo) or (r_hi is not None and value > r_hi)
        if code in DOCTOR_ONLY and status != 'normal':
            refer = True
    return status, refer


def match_marker(name):
    """Code for a test name as printed on a lab report (English or Arabic)."""
    n = (name or '').strip().lower()
    for code, m in MARKERS.items():
        if n == code or n == m[0].lower():
            return code
    best = None
    for code, m in MARKERS.items():
        for alias in m[6]:
            if alias == n or (len(alias) > 3 and alias in n):
                if best is None or len(alias) > best[1]:
                    best = (code, len(alias))
    return best[0] if best else None


def advice_for(code, status):
    key = ALIAS.get((code, status), (code, status))
    return ADVICE.get(key)

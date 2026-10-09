"""Add the shared starter library: workout guides and medical starting plans.

Everything here is marked as a DRAFT (is_draft=True) and shows a warning in the
app until a qualified person reviews and edits it. Safe to run many times:
items are matched by name and never duplicated or overwritten.
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand

from nutrition.models import FoodItem, PlanTemplate, WorkoutTemplate


def ex(name, name_ar, sets, reps, rest='60s'):
    return {'name': name, 'name_ar': name_ar, 'sets': str(sets), 'reps': str(reps), 'rest': rest}


WORKOUTS = [
    dict(name='Fat loss - Beginner - Home', name_ar='حرق الدهون - مبتدئ - في المنزل', goal='fat_loss', level='beginner',
         place='home', notes='3 days a week plus 30 min brisk walking on 2 other days.',
         notes_ar='3 أيام في الأسبوع بالإضافة إلى مشي سريع 30 دقيقة في يومين آخرين.',
         days=[{'title': 'Day A - Full body', 'title_ar': 'اليوم أ - الجسم كامل', 'exercises': [
             ex('Bodyweight squat', 'سكوات بوزن الجسم', 3, 12), ex('Knee push-up', 'ضغط على الركبتين', 3, 10),
             ex('Glute bridge', 'رفع الحوض', 3, 15), ex('Plank', 'بلانك', 3, '20-30s'),
             ex('Marching in place', 'مشي في المكان', 3, '1 min', '30s')]},
               {'title': 'Day B - Full body', 'title_ar': 'اليوم ب - الجسم كامل', 'exercises': [
             ex('Reverse lunge', 'طعن خلفي', 3, '10 each leg'), ex('Incline push-up (on table)', 'ضغط مائل على طاولة', 3, 10),
             ex('Superman hold', 'تمرين السوبرمان', 3, '20s'), ex('Side plank', 'بلانك جانبي', 2, '15s each side'),
             ex('Step-ups on stairs', 'صعود الدرج', 3, '1 min', '45s')]}]),
    dict(name='Fat loss - Beginner - Gym', name_ar='حرق الدهون - مبتدئ - في النادي', goal='fat_loss', level='beginner',
         place='gym', notes='3 days a week. Finish each session with 15-20 min incline treadmill walking.',
         notes_ar='3 أيام في الأسبوع. أنهِ كل حصة بمشي على جهاز المشي المائل 15-20 دقيقة.',
         days=[{'title': 'Day A', 'title_ar': 'اليوم أ', 'exercises': [
             ex('Leg press', 'دفع الأرجل', 3, 12), ex('Chest press machine', 'جهاز دفع الصدر', 3, 12),
             ex('Lat pulldown', 'سحب أمامي', 3, 12), ex('Plank', 'بلانك', 3, '30s')]},
               {'title': 'Day B', 'title_ar': 'اليوم ب', 'exercises': [
             ex('Goblet squat', 'سكوات بالدمبل', 3, 12), ex('Seated row', 'سحب أرضي', 3, 12),
             ex('Shoulder press machine', 'جهاز دفع الأكتاف', 3, 12), ex('Cable crunch', 'تمرين البطن بالكيبل', 3, 15)]}]),
    dict(name='Muscle gain - Beginner - Gym', name_ar='بناء العضلات - مبتدئ - في النادي', goal='muscle_gain',
         level='beginner', place='gym', notes='3 days a week, full body. Add a little weight when all reps feel easy.',
         notes_ar='3 أيام في الأسبوع للجسم كامل. زد الوزن قليلًا عندما تصبح كل التكرارات سهلة.',
         days=[{'title': 'Day A', 'title_ar': 'اليوم أ', 'exercises': [
             ex('Squat', 'سكوات', 3, '8-10', '90s'), ex('Bench press', 'بنش برس', 3, '8-10', '90s'),
             ex('Bent-over row', 'سحب منحني', 3, '8-10', '90s'), ex('Biceps curl', 'تمرين البايسبس', 2, 12)]},
               {'title': 'Day B', 'title_ar': 'اليوم ب', 'exercises': [
             ex('Romanian deadlift', 'رفعة رومانية', 3, '8-10', '90s'), ex('Overhead press', 'دفع فوق الرأس', 3, '8-10', '90s'),
             ex('Lat pulldown', 'سحب أمامي', 3, 10), ex('Triceps pushdown', 'تمرين الترايسبس', 2, 12)]}]),
    dict(name='Muscle gain - Intermediate - Gym', name_ar='بناء العضلات - متوسط - في النادي', goal='muscle_gain',
         level='intermediate', place='gym', notes='4 days a week: upper / lower split.',
         notes_ar='4 أيام في الأسبوع: تقسيم علوي / سفلي.',
         days=[{'title': 'Upper', 'title_ar': 'الجزء العلوي', 'exercises': [
             ex('Bench press', 'بنش برس', 4, '6-8', '2 min'), ex('Pull-up or lat pulldown', 'عقلة أو سحب أمامي', 4, '6-10', '2 min'),
             ex('Incline dumbbell press', 'ضغط دمبل مائل', 3, 10), ex('Cable row', 'سحب كيبل', 3, 10),
             ex('Lateral raise', 'رفرفة جانبية', 3, 15)]},
               {'title': 'Lower', 'title_ar': 'الجزء السفلي', 'exercises': [
             ex('Back squat', 'سكوات خلفي', 4, '6-8', '2 min'), ex('Romanian deadlift', 'رفعة رومانية', 3, 8, '2 min'),
             ex('Walking lunge', 'طعن متحرك', 3, '10 each leg'), ex('Leg curl', 'ثني الأرجل', 3, 12),
             ex('Calf raise', 'رفع السمانة', 3, 15)]}]),
    dict(name='Muscle gain - Beginner - Home', name_ar='بناء العضلات - مبتدئ - في المنزل', goal='muscle_gain',
         level='beginner', place='home', notes='3 days a week. Use a backpack with books to add weight.',
         notes_ar='3 أيام في الأسبوع. استخدم حقيبة ظهر فيها كتب لزيادة الوزن.',
         days=[{'title': 'Full body', 'title_ar': 'الجسم كامل', 'exercises': [
             ex('Backpack squat', 'سكوات مع حقيبة', 4, 12), ex('Push-up', 'ضغط', 4, 'as many as possible'),
             ex('Backpack row', 'سحب بالحقيبة', 4, 12), ex('Split squat', 'سكوات مقسوم', 3, '10 each leg'),
             ex('Pike push-up', 'ضغط للأكتاف', 3, 8)]}]),
    dict(name='General health - Beginner - Home', name_ar='صحة عامة - مبتدئ - في المنزل', goal='general_health',
         level='beginner', place='home', notes='Walk 7,000-8,000 steps a day plus this routine 2-3 times a week.',
         notes_ar='امشِ 7000-8000 خطوة يوميًا بالإضافة إلى هذا البرنامج 2-3 مرات في الأسبوع.',
         days=[{'title': 'Routine', 'title_ar': 'البرنامج', 'exercises': [
             ex('Chair squat', 'جلوس ووقوف عن الكرسي', 3, 10), ex('Wall push-up', 'ضغط على الحائط', 3, 10),
             ex('Glute bridge', 'رفع الحوض', 3, 12), ex('Bird dog', 'تمرين الطائر والكلب', 2, '8 each side'),
             ex('Stretching', 'إطالة', 1, '5 min', '-')]}]),
    dict(name='Gentle - Medical limits - Home', name_ar='خفيف - لأصحاب الحالات الطبية - في المنزل', goal='general_health',
         level='beginner', place='home', is_safe_version=True,
         notes='For clients with medical conditions, pregnancy, joint pain or very low fitness. Get the doctor\'s OK first. Stop if there is pain, dizziness or shortness of breath.',
         notes_ar='للعملاء أصحاب الحالات الطبية أو الحمل أو آلام المفاصل أو اللياقة المنخفضة جدًا. احصل على موافقة الطبيب أولًا. توقف عند الألم أو الدوخة أو ضيق النفس.',
         days=[{'title': 'Daily', 'title_ar': 'يوميًا', 'exercises': [
             ex('Easy walking', 'مشي خفيف', 1, '10-20 min', '-'), ex('Seated leg raise', 'رفع الرجل جالسًا', 2, '10 each leg'),
             ex('Wall push-up', 'ضغط على الحائط', 2, 8), ex('Seated arm circles', 'دوران الذراعين جالسًا', 2, '20s'),
             ex('Gentle stretching', 'إطالة خفيفة', 1, '5 min', '-')]}]),
]

# Starting plans built from foods already in the database. Quantities are servings.
MEDICAL_TEMPLATES = [
    dict(name='Type 2 diabetes - starting plan', name_ar='سكري النوع الثاني - خطة مبدئية', description_ar='نشويات قليلة السكر موزعة على الوجبات وبروتين في كل وجبة. راجعها مع أدوية العميل وقراءات السكر.', condition='diabetes',
         description='Lower-sugar carbs spread across meals, protein at every meal. Check against the client\'s medication and glucose readings.',
         items=[('Oats', 0.5, ['meal1']), ('whole Egg boiled', 2, ['meal1']), ('Chicken Breast', 1.5, ['meal2']),
                ('white rice', 1, ['meal2']), ('Green Salad', 1, ['meal2']), ('Greek yogurt, plain, Al mareaei', 1, ['snack1']),
                ('apple', 1, ['snack2']), ('salmon', 1.5, ['meal3']), ('Broccli', 1, ['meal3']), ('olive oil', 2, ['meal2', 'meal3'])]),
    dict(name='PCOS - starting plan', name_ar='تكيس المبايض - خطة مبدئية', description_ar='بروتين أعلى، نشويات معتدلة قليلة السكر، ودهون صحية.', condition='pcos',
         description='Higher protein, moderate low-sugar carbs, healthy fats.',
         items=[('whole Egg boiled', 2, ['meal1']), ('Alreef Oat Bread', 1, ['meal1']), ('Turkey', 1, ['meal2']),
                ('sweet potato', 1, ['meal2']), ('Green Salad', 1, ['meal2']), ('Walnuts', 1, ['snack1']),
                ('blueberries', 1, ['snack1']), ('salmon', 1.5, ['meal3']), ('Broccli', 1, ['meal3']), ('olive oil', 2, ['meal3'])]),
    dict(name='High blood pressure - starting plan', name_ar='ضغط الدم المرتفع - خطة مبدئية', description_ar='أطعمة قليلة الملح فقط (بدون أجبان أو شيبس أو معلبات)، وخضار وفواكه أكثر.', condition='hypertension',
         description='Low-salt foods only (no cheese, chips or canned items), more vegetables and fruit.',
         items=[('Oats', 0.5, ['meal1']), ('banana', 1, ['meal1']), ('full fat milk', 2, ['meal1']), ('Chicken Breast', 1.5, ['meal2']),
                ('potato', 1.5, ['meal2']), ('Green Salad', 1, ['meal2']), ('apple', 1, ['snack1']), ('salmon', 1.5, ['meal3']),
                ('Broccli', 1, ['meal3']), ('olive oil', 2, ['meal2', 'meal3'])]),
    dict(name='High cholesterol - starting plan', name_ar='الكوليسترول المرتفع - خطة مبدئية', description_ar='شوفان وسمك ومكسرات وزيت زيتون؛ القليل من اللحوم الدهنية والأجبان كاملة الدسم.', condition='cholesterol',
         description='Oats, fish, nuts and olive oil; few fatty meats and full-fat cheese.',
         items=[('Oats', 0.5, ['meal1']), ('blueberries', 1, ['meal1']), ('egg white 1 large', 4, ['meal1']), ('salmon', 1.5, ['meal2']),
                ('white rice', 1, ['meal2']), ('Green Salad', 1, ['meal2']), ('Walnuts', 1, ['snack1']), ('Chicken Breast', 1.5, ['meal3']),
                ('sweet potato', 1, ['meal3']), ('olive oil', 2, ['meal2', 'meal3'])]),
    dict(name='Pregnancy - starting plan', name_ar='الحمل - خطة مبدئية', description_ar='بدون عجز في السعرات. لا سمك نيء ولا مأكولات بحرية قشرية ولا أسماك عالية الزئبق ولا أجبان غير مبسترة. أكّدها مع طبيب العميلة.', condition='pregnancy',
         description='No calorie deficit. No raw fish or shellfish, no high-mercury fish, no unpasteurised cheese. Confirm with the client\'s doctor.',
         items=[('Oats', 0.5, ['meal1']), ('full fat milk', 2, ['meal1']), ('Dates', 0.3, ['meal1']), ('Chicken Breast', 1.5, ['meal2']),
                ('white rice', 1.5, ['meal2']), ('Green Salad', 1, ['meal2']), ('Greek yogurt, plain, Al mareaei', 1, ['snack1']),
                ('banana', 1, ['snack2']), ('steak', 1.5, ['meal3']), ('potato', 1.5, ['meal3']), ('olive oil', 2, ['meal2', 'meal3'])]),
]


class Command(BaseCommand):
    help = 'Add the shared draft library of workout guides and medical starting plans.'

    def handle(self, *args, **options):
        call_command('add_usda_foods')
        call_command('fix_old_foods')
        added = 0
        for spec in WORKOUTS:
            _, created = WorkoutTemplate.objects.get_or_create(
                user=None, name=spec['name'], defaults={**{k: v for k, v in spec.items() if k != 'name'}, 'is_draft': True})
            added += created

        foods = {f.name: f for f in FoodItem.objects.all()}
        for spec in MEDICAL_TEMPLATES:
            items = []
            for food_name, servings, meals in spec['items']:
                food = foods.get(food_name)
                if food is None:
                    continue
                items.append({'food_id': food.id, 'quantity': servings, 'category': food.food_type
                              if food.food_type in ('protein', 'carb', 'fat') else 'carb', 'meals': meals, 'shares': {}})
            if not items:
                continue
            tpl, created = PlanTemplate.objects.get_or_create(
                user=None, name=spec['name'],
                defaults={'description': spec['description'], 'condition': spec['condition'], 'is_medical': True,
                          'is_draft': True, 'items': items, 'name_ar': spec['name_ar'],
                          'description_ar': spec['description_ar']})
            if not created and not tpl.name_ar:  # add the Arabic text to templates made before it existed
                PlanTemplate.objects.filter(pk=tpl.pk).update(name_ar=spec['name_ar'], description_ar=spec['description_ar'])
            added += created
        self.stdout.write(self.style.SUCCESS(f'Library ready ({added} new items).'))

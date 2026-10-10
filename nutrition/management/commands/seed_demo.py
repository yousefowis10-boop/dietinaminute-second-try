"""Fill an EMPTY TEST database with demo data.

Safety: does nothing unless the environment variable DEMO_DATA is "true".
That variable is only set on the separate test server, never on the live one.
Safe to run many times: it only adds what is missing.
"""
import csv
import os
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from datetime import timedelta

from django.utils import timezone

from nutrition.models import (
    BMRActivityMultiplier, BMRFormula, BMRGenderFormula, ClientProfile, ClientProfileRevision, FoodItem, Tag,
)

MEAL_TAGS = ['meal1', 'snack1', 'meal2', 'snack2', 'meal3', 'snack3', 'meal4']

FORMULAS = {
    'Harris-Benedict': {
        'description': 'Classic BMR formula.',
        'M': '88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)',
        'F': '447.593 + (9.247 * weight) + (3.098 * height) - (4.33 * age)',
        'levels': [('bed_bound', 1.2), ('seated_static', 1.45), ('seated_moving', 1.65),
                   ('standing', 1.85), ('sport', 2.2), ('strenuous', 2.3)],
    },
    'Mifflin-St Jeor': {
        'description': 'Modern BMR formula.',
        'M': '(10 * weight) + (6.25 * height) - (5 * age) + 5',
        'F': '(10 * weight) + (6.25 * height) - (5 * age) - 161',
        'levels': [('bed_bound', 1.2), ('seated_static', 1.375), ('seated_moving', 1.55),
                   ('standing', 1.725), ('sport', 1.9), ('strenuous', 1.9)],
    },
}

# Made-up people. Any resemblance to real clients is accidental.
DEMO_CLIENTS = [
    dict(name='Ahmad Khalil', age=34, gender='M', weight=92, height=178, goal='loss',
         work_style='seated_moving', pbf=27, smm=36),
    dict(name='Lina Haddad', age=28, gender='F', weight=61, height=165, goal='maintain',
         work_style='standing', pbf=24, smm=24),
    dict(name='Omar Nasser', age=22, gender='M', weight=68, height=181, goal='gain',
         work_style='sport', pbf=13, smm=33),
]

GOAL_ADJUST = {'loss': -500, 'gain': 300, 'maintain': 0}


def mifflin_bmr(c):
    base = 10 * c['weight'] + 6.25 * c['height'] - 5 * c['age']
    return base + 5 if c['gender'] == 'M' else base - 161


class Command(BaseCommand):
    help = 'Fill an empty TEST database with demo data (requires DEMO_DATA=true).'

    @transaction.atomic
    def handle(self, *args, **options):
        if os.getenv('DEMO_DATA', '').lower() != 'true':
            self.stdout.write('DEMO_DATA is not "true"; skipping demo data.')
            return

        for name, spec in FORMULAS.items():
            formula, created = BMRFormula.objects.get_or_create(
                name=name, defaults={'description': spec['description']})
            if created:
                for gender in ('M', 'F'):
                    BMRGenderFormula.objects.create(formula=formula, gender=gender, expression=spec[gender])
                for level, multiplier in spec['levels']:
                    BMRActivityMultiplier.objects.create(formula=formula, level=level, multiplier=multiplier)

        for tag in MEAL_TAGS:
            Tag.objects.get_or_create(name=tag)

        call_command('fix_old_foods')  # rename old misspelled foods first, so the list below doesn't add them twice
        csv_path = Path(__file__).resolve().parents[2] / 'Foods.csv'
        with open(csv_path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                FoodItem.objects.get_or_create(
                    name=row['Name'].strip(),
                    defaults={
                        'unit': row.get('Unit', ''),
                        'protein': float(row.get('protein') or 0),
                        'carb': float(row.get('carb') or 0),
                        'fat': float(row.get('fat') or 0),
                        'unit_ar': row.get('Unit Arabic', ''),
                        'name_ar': row.get('Name Arabic', ''),
                        'multiplying_factor': float(row.get('Multiplying Factor') or 1),
                        'food_type': row.get('Food Type') or 'mixed',
                    },
                )

        password = os.getenv('DEMO_PASSWORD')
        if not password:
            self.stdout.write('DEMO_PASSWORD not set; demo account not created.')
            return
        User = get_user_model()
        user, created = User.objects.get_or_create(username='demo@dietinaminute.test')
        if created:
            user.set_password(password)
        user.is_subscribed = True
        user.plan_tier = 'pro'  # demo account can try the AI features (test mode)
        user.is_staff = True  # test site only: Yousef can try approving foods with the demo account
        user.first_name = 'Demo'
        user.save()

        for c in DEMO_CLIENTS:
            bmr = round(mifflin_bmr(c), 2)
            multiplier = dict(FORMULAS['Mifflin-St Jeor']['levels'])[c['work_style']]
            target = round(bmr * multiplier + GOAL_ADJUST[c['goal']], 2)
            client = ClientProfile.objects.filter(user=user, name=c['name']).first()
            if client is None:
                client = ClientProfile.objects.create(
                    user=user, bmr=bmr, activity_value=round(bmr * multiplier), target_calories=target, **c)
            if client.profile_revisions.count() >= 2:
                continue
            # Three earlier visits so the progress report has something to show.
            for weeks_ago, delta in ((9, 3.5), (6, 2.2), (3, 1.0)):
                rev = ClientProfileRevision.objects.create(
                    client=client, age=c['age'], weight=c['weight'] + delta * (1 if c['goal'] == 'loss' else -0.4),
                    height=c['height'], gender=c['gender'], goal=c['goal'], smm=c['smm'],
                    pbf=c['pbf'] + delta * (0.6 if c['goal'] == 'loss' else -0.1), work_style=c['work_style'],
                    bmr=bmr, calorie_target=target)
                ClientProfileRevision.objects.filter(pk=rev.pk).update(
                    created_at=timezone.now() - timedelta(weeks=weeks_ago))
            ClientProfileRevision.objects.create(
                client=client, age=c['age'], weight=c['weight'], height=c['height'], gender=c['gender'],
                goal=c['goal'], smm=c['smm'], pbf=c['pbf'], work_style=c['work_style'], bmr=bmr,
                calorie_target=target, target_protein=client.target_protein, target_carb=client.target_carb,
                target_fat=client.target_fat)

        # One client overdue for a follow-up, so the home screen shows that list (moved back once only).
        omar = ClientProfile.objects.filter(user=user, name='Omar Nasser').first()
        if omar:
            revisions = omar.profile_revisions.all()
            first = revisions.order_by('created_at').first()
            if first and first.created_at > timezone.now() - timedelta(weeks=10):
                for rev in revisions:
                    ClientProfileRevision.objects.filter(pk=rev.pk).update(created_at=rev.created_at - timedelta(weeks=4))

        demo_extras(user)
        self.stdout.write(self.style.SUCCESS('Demo data ready.'))


# Ahmad's plan: (food name, servings, {meal: share}) - shares are split evenly by the app.
DEMO_PLAN = [
    ('Oats', 0.5, ['meal1']), ('whole Egg boiled', 2, ['meal1']), ('banana', 1, ['snack1']),
    ('white rice', 1.5, ['meal2']), ('Chicken Breast', 1.5, ['meal2']), ('olive oil', 2, ['meal2', 'meal3']),
    ('Low-fat yogurt', 1, ['snack2']), ('Whole-wheat toast', 2, ['meal3']), ('Cottage cheese 2%', 1, ['meal3']),
]
DEMO_SLOTS = [{'key': 'meal1', 'name': 'Breakfast', 'time': '08:00'}, {'key': 'snack1', 'name': 'Morning snack', 'time': '11:00'},
              {'key': 'meal2', 'name': 'Lunch', 'time': '14:00'}, {'key': 'snack2', 'name': 'Afternoon snack', 'time': '17:00'},
              {'key': 'meal3', 'name': 'Dinner', 'time': '20:00'}]


def demo_extras(user):
    """Calendar, appointments, a package, a plan and a week of meal ticks (added once)."""
    from nutrition.models import (Appointment, Calendar, CheckInLink, ClientPackage, DayLog, DietItem, DietPlan,
                                  FoodItem, WorkoutTemplate)
    from nutrition.scheduling import create_calendar
    from nutrition.services import ensure_tags
    if Calendar.objects.filter(user=user).exists():
        return
    cal = create_calendar(user, "Yousef's calendar", pay_online=True)
    first, follow, inbody, online = list(cal.types.all())[:4]
    clients = {c.name: c for c in ClientProfile.objects.filter(user=user)}
    phones = {'Ahmad Khalil': '0791234567', 'Lina Haddad': '0789876543', 'Omar Nasser': '0775551234'}
    for name, phone in phones.items():
        if name in clients:
            ClientProfile.objects.filter(pk=clients[name].pk).update(phone=phone)
    ahmad, lina, omar = clients.get('Ahmad Khalil'), clients.get('Lina Haddad'), clients.get('Omar Nasser')
    today = timezone.localdate()

    def book(client, t, days, hhmm, **kw):
        h, m = map(int, hhmm.split(':'))
        return Appointment.objects.create(calendar=cal, type=t, client=client, guest_name='' if client else kw.pop('guest', ''),
                                          guest_phone=kw.pop('guest_phone', ''), date=today + timedelta(days=days),
                                          time=f'{h:02d}:{m:02d}', minutes=t.minutes, price=t.price, **kw)
    pkg = None
    if ahmad:
        pkg = ClientPackage.objects.create(client=ahmad, name='Monthly - 4 visits', visits=4, start=today - timedelta(days=21),
                                           end=today + timedelta(days=9), price=70, paid_amount=70)
        for d in (-21, -14, -7):
            book(ahmad, follow, d, '10:00', status='attended', paid=True, paid_via='package', package=pkg)
        book(ahmad, follow, 0, '10:00', paid=True, paid_via='package', package=pkg)
    if lina:
        book(lina, inbody, -1, '14:00', status='attended', paid=True, paid_via='cash')
        book(lina, follow, 6, '11:00', pay_method='clinic')
    if omar:
        book(omar, follow, -2, '12:00', status='no_show')
    book(None, first, 0, '11:00', guest='Maya Nasser', guest_phone='0790001122', source='booking_link', pay_method='clinic')
    book(None, online, 0, '15:00', guest='Tala Mansour', guest_phone='0798887766', source='booking_link', pay_method='clinic')
    book(None, follow, 1, '12:00', guest='Sami Odeh', guest_phone='0781112233', pay_method='clinic')
    book(None, first, 2, '14:00', guest='Noor Kamal', guest_phone='0772223344', source='booking_link', pay_method='clinic')
    book(None, follow, -3, '16:00', guest='Joud Ahmad', guest_phone='0793334455', status='attended')

    if ahmad:
        foods = {f.name.strip().lower(): f for f in FoodItem.objects.all()}
        tags = ensure_tags([s['key'] for s in DEMO_SLOTS])
        plan = DietPlan.objects.create(user=user, client=ahmad, name='Ahmad - weight loss', total_protein=0, total_carb=0,
                                       total_fat=0, meal_slots=DEMO_SLOTS,
                                       workout=WorkoutTemplate.objects.filter(user__isnull=True, name__startswith='Beginner PPL').first())
        tp = tc = tf = 0
        for name, qty, meals in DEMO_PLAN:
            f = foods.get(name.lower())
            if not f:
                continue
            item = DietItem.objects.create(plan=plan, food=f, category=f.food_type if f.food_type in ('carb', 'protein', 'fat') else 'carb',
                                           quantity=qty, protein=f.protein * qty, carb=f.carb * qty, fat=f.fat * qty)
            item.tags.set([tags[m] for m in meals])
            tp, tc, tf = tp + f.protein * qty, tc + f.carb * qty, tf + f.fat * qty
        DietPlan.objects.filter(pk=plan.pk).update(total_protein=tp, total_carb=tc, total_fat=tf, created_at=timezone.now() - timedelta(days=10))
        CheckInLink.objects.get_or_create(client=ahmad)
        ticks = [5, 4, 5, 3, 4, 5, 2]  # meals ticked, oldest day first
        for i, n in enumerate(ticks):
            day = today - timedelta(days=6 - i)
            DayLog.objects.create(client=ahmad, date=day, water=6 + i % 3,
                                  meals={s['key']: 1 for s in DEMO_SLOTS[:n]})
    if lina:
        CheckInLink.objects.get_or_create(client=lina)
        for i in range(4, 9):  # stopped ticking 4 days ago
            DayLog.objects.create(client=lina, date=today - timedelta(days=i), water=8, meals={'meal1': 1, 'meal2': 1})

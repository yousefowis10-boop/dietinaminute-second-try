"""Fill an EMPTY TEST database with demo data.

Safety: does nothing unless the environment variable DEMO_DATA is "true".
That variable is only set on the separate test server, never on the live one.
Safe to run many times: it only adds what is missing.
"""
import csv
import os
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from nutrition.models import (
    BMRActivityMultiplier, BMRFormula, BMRGenderFormula, ClientProfile, FoodItem, Tag,
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
            user.save()

        for c in DEMO_CLIENTS:
            if ClientProfile.objects.filter(user=user, name=c['name']).exists():
                continue
            bmr = round(mifflin_bmr(c), 2)
            multiplier = dict(FORMULAS['Mifflin-St Jeor']['levels'])[c['work_style']]
            target = round(bmr * multiplier + GOAL_ADJUST[c['goal']], 2)
            ClientProfile.objects.create(
                user=user, bmr=bmr, activity_value=multiplier, target_calories=target, **c)

        self.stdout.write(self.style.SUCCESS('Demo data ready.'))

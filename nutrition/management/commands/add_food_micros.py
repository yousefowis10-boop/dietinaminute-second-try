"""Fill in vitamins & minerals (per serving) for foods, from nutrition/food_micros.json (USDA SR Legacy).

Safe to run many times: values are matched by food name and simply written again. Brand products stay empty.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from nutrition.models import FoodItem

KEYS = ('iron_mg', 'calcium_mg', 'vitd_ug', 'b12_ug', 'folate_ug', 'magnesium_mg', 'zinc_mg', 'potassium_mg', 'fiber_g', 'sodium_mg')


class Command(BaseCommand):
    help = 'Fill in vitamins & minerals for foods (USDA values).'

    def handle(self, *args, **options):
        data = json.loads((Path(__file__).resolve().parents[2] / 'food_micros.json').read_text(encoding='utf-8'))
        updated = 0
        for food in FoodItem.objects.all():
            row = data.get(food.name.strip().lower())
            if not row:
                continue
            micros = {k: row[k] for k in KEYS if k in row}
            micros['grams'] = row.get('grams')
            if food.micros != micros:
                FoodItem.objects.filter(pk=food.pk).update(micros=micros)
                updated += 1
        self.stdout.write(f'Food vitamins & minerals: {updated} foods updated.')

"""Correct the original food list against the USDA standard reference (SR28 / FoodData Central "SR Legacy").

Carbs are TOTAL carbs (fibre included), the same as nutrition/usda_foods.csv.
Brand products (protein bars, powders, Almarai, Al Reef, Nutella, ...) are left alone: their labels are the source.
Safe to run many times: foods are found by their old or new name (any letter case); foods not found are skipped.
"""
from django.core.management.base import BaseCommand

from nutrition.models import FoodItem

# old name -> fields to set (values are per one serving in the app's servings system)
FIXES = {
    'ground beef': dict(protein=18.6, carb=0, fat=15.0),  # carbs and fat were swapped (85% lean, raw)
    'almond': dict(protein=6.4, carb=6.5, fat=15.0, food_type='fat', name_ar='لوز', unit_ar='غرام'),
    'white rice': dict(protein=2.7, carb=28.2, fat=0.3),  # cooked
    'salmon': dict(protein=20.4, carb=0, fat=13.4),  # farmed Atlantic, raw
    'egg white 1 large': dict(unit='1 large', unit_ar='بياض بيضة كبيرة', multiplying_factor=1,
                              protein=3.6, carb=0.2, fat=0.1),
    'chicken breast': dict(protein=22.5, carb=0, fat=2.6),  # raw, skinless
    'potato': dict(protein=1.7, carb=20.0, fat=0.1),  # boiled, no skin
    'apple': dict(carb=25.1),  # medium, 182 g
    'banana': dict(carb=27.0),  # medium, 118 g
    'blueberries': dict(carb=7.2),
    'honey teaspoon': dict(unit='tea spoon'),
    'sweet potato': dict(protein=2.0, carb=20.7, fat=0.2),  # baked
    'oats': dict(carb=66.3),
    'dates': dict(carb=75.0),
    'avocado': dict(carb=8.5),
    'walnuts': dict(carb=4.1),
    'mozarella cheese': dict(name='Mozzarella cheese', protein=22.2, carb=2.2, fat=22.4),  # whole milk
    'cucumber': dict(protein=1.3, carb=7.3, fat=0.2),  # medium, 201 g
    'tomato': dict(protein=1.1, carb=4.8, fat=0.2),  # medium, 123 g
    'pasta': dict(carb=30.9),  # cooked
    'broccli': dict(name='Broccoli', carb=6.6),
    'onion': dict(carb=10.3, multiplying_factor=1, unit_ar='حبة متوسطة'),  # medium, 110 g
    'grapes': dict(carb=18.1),
    'watermelon': dict(carb=7.6),
    'youghret': dict(name='Yogurt (full fat)', protein=3.5, carb=4.7, fat=3.3),
    'whole egg boiled': dict(protein=5.5, carb=0.5, fat=4.7),  # medium, 44 g
    'full fat milk': dict(unit='100 ml', unit_ar='مل', multiplying_factor=100, protein=3.2, carb=4.8, fat=3.3),
}


class Command(BaseCommand):
    help = 'Correct the original foods against USDA values (brand products untouched).'

    def handle(self, *args, **options):
        by_name = {f.name.strip().lower(): f for f in FoodItem.objects.all()}
        changed = 0
        for old, fields in FIXES.items():
            food = by_name.get(old) or by_name.get(fields.get('name', '').lower())
            if food is None:
                continue
            diff = {k: v for k, v in fields.items() if getattr(food, k) != v}
            if 'name' in diff and fields['name'].lower() in by_name and by_name[fields['name'].lower()] is not food:
                diff.pop('name')  # a food with the new name already exists; keep the old name
            if not diff:
                continue
            for k, v in diff.items():
                setattr(food, k, v)
            food.save(update_fields=list(diff))
            changed += 1
            self.stdout.write(f'  fixed {old}: {diff}')
        self.stdout.write(f'Old foods: {changed} corrected.')

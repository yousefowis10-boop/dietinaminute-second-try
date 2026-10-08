"""Add common foods with values from the USDA standard reference (SR28 / FoodData Central "SR Legacy").

The list lives in nutrition/usda_foods.csv (one serving per row, in the app's servings system).
Safe to run many times: a food whose name already exists (any letter case) is skipped and never changed.
"""
import csv
from pathlib import Path

from django.core.management.base import BaseCommand

from nutrition.models import FoodItem


class Command(BaseCommand):
    help = 'Add the USDA common-food list (skips foods that already exist).'

    def handle(self, *args, **options):
        path = Path(__file__).resolve().parents[2] / 'usda_foods.csv'
        existing = {n.strip().lower() for n in FoodItem.objects.values_list('name', flat=True)}
        added = 0
        with open(path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                name = row['Name'].strip()
                if name.lower() in existing:
                    continue
                FoodItem.objects.create(
                    name=name, unit=row['Unit'], unit_ar=row['Unit Arabic'], name_ar=row['Name Arabic'],
                    protein=float(row['protein']), carb=float(row['carb']), fat=float(row['fat']),
                    multiplying_factor=float(row['Multiplying Factor']), food_type=row['Food Type'],
                )
                existing.add(name.lower())
                added += 1
        self.stdout.write(f'USDA foods: {added} added.')

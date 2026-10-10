"""Add the cookbook recipes (nutrition/recipes_book.json) as foods + recipe pages.

Each recipe becomes ONE food in the Carbs / Protein / Fat lists (by where most of its calories come from),
1 serving = 1 portion, with the book's per-portion nutrition. Treats are named "Treat – …" so typing
"treat" in any food search lists them. Yousef confirmed he holds the rights to the book (10 Oct 2026).
Safe to run many times: matched by the recipe key, values are written again.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from nutrition.models import FoodItem, Recipe

SOURCE = "The Bodybuilder's Kitchen"


def food_names(r):
    en, ar = r['en']['title'], r['ar']['title']
    if r['pork'] and 'pork' not in en.lower():
        en += ' (pork)'
    if r['treat']:
        en, ar = f'Treat – {en}', f'حلوى – {ar}'
    return en[:100], ar[:100]


class Command(BaseCommand):
    help = 'Add the cookbook recipes as foods with recipe pages.'

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads((Path(__file__).resolve().parents[2] / 'recipes_book.json').read_text(encoding='utf-8'))
        added = 0
        for r in data:
            name, name_ar = food_names(r)
            values = {'name': name, 'name_ar': name_ar, 'unit': 'portion', 'unit_ar': 'حصة', 'multiplying_factor': 1,
                      'protein': r['protein'], 'carb': r['carb'], 'fat': r['fat'], 'food_type': r['food_type']}
            recipe = Recipe.objects.select_related('food').filter(key=r['key']).first()
            if recipe:
                FoodItem.objects.filter(pk=recipe.food_id).update(**values)
                food = recipe.food
            else:
                food, _ = FoodItem.objects.update_or_create(name=name, defaults=values)
                added += 1
            Recipe.objects.update_or_create(key=r['key'], defaults={
                'food': food, 'section': r['section'], 'section_ar': r['section_ar'], 'servings': r['servings'],
                'photo': f"/recipes/{r['key']}.jpg" if r['photo'] else '', 'is_treat': r['treat'], 'has_pork': r['pork'],
                'content': {'en': r['en'], 'ar': r['ar']}, 'source': SOURCE})
        self.stdout.write(f'Recipes: {len(data)} ready ({added} new).')

"""Add Yousef Owis Academy workout programs to the shared library.

The list lives in nutrition/academy_workouts.json (read from the academy PDFs, English + Arabic).
Safe to run many times: a program whose name already exists in the shared library is skipped and never changed.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from nutrition.models import WorkoutTemplate

FIELDS = ('name_ar', 'goal', 'level', 'place', 'notes', 'notes_ar', 'days')


class Command(BaseCommand):
    help = 'Add the Yousef Owis Academy workout programs (skips ones that already exist).'

    def handle(self, *args, **options):
        path = Path(__file__).resolve().parents[2] / 'academy_workouts.json'
        existing = set(WorkoutTemplate.objects.filter(user__isnull=True).values_list('name', flat=True))
        added = 0
        for spec in json.loads(path.read_text(encoding='utf-8')):
            if spec['name'] in existing:
                continue
            WorkoutTemplate.objects.create(user=None, name=spec['name'], **{k: spec[k] for k in FIELDS})
            added += 1
        self.stdout.write(f'Academy workouts: {added} added.')

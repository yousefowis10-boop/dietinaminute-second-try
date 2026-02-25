import csv
import os
from .models import FoodItem  # Replace 'yourapp' with your app's name
from django.db import transaction

@transaction.atomic
def import_food_from_csv(csv_path):
    """
    Imports food items from a CSV file and saves them into the database.
    The CSV is expected to have the columns:
    Name,Unit,protein,carb,fat,Unit Arabic,Name Arabic,Multiplying Factor
    """
    if not os.path.isfile(csv_path):
        raise FileNotFoundError(f"CSV file not found at: {csv_path}")

    with open(csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        count = 0
        for row in reader:
            FoodItem.objects.update_or_create(
                name=row["Name"],
                defaults={
                    "protein": float(row.get("protein") or 0),
                    "carb": float(row.get("carb") or 0),
                    "fat": float(row.get("fat") or 0),
                    "unit_ar": row.get("Unit Arabic", ""),
                    "unit": row.get("Unit", ""),
                    "name_ar": row.get("Name Arabic", ""),
                    "multiplying_factor": float(row.get("Multiplying Factor") or 1),
                    "food_type": row.get("Food Type", "")
                }
            )
            count += 1

    print(f"✅ Imported or updated {count} food items from {csv_path}")

from .models import FoodItem

def seed_food_items():

    # data = [
    #     # CARBS
    #     {"name": "Oats", "protein": 16.9, "carb": 55.7, "fat": 6.9, "unit_ar": "غرام", "name_ar": "شوفان", "factor": 100, "food_type": "carb"},
    #     {"name": "white rice", "protein": 2.7, "carb": 27.6, "fat": 2.7, "unit_ar": "بيضة متوسطة", "name_ar": "رز ابيض مسلوق", "factor": 100, "food_type": "carb"},
    #     {"name": "toast bread - white", "protein": 2.6, "carb": 14.8, "fat": 1, "unit_ar": "علبة", "name_ar": "خبز توست ابيض", "factor": 1, "food_type": "carb"},
    #     {"name": "banana medium", "protein": 1.3, "carb": 23.9, "fat": 0.4, "unit_ar": "موزة", "name_ar": "موز ة متوسطة الحجم", "factor": 1, "food_type": "carb"},
    #     {"name": "sweet potato", "protein": 1.8, "carb": 25.6, "fat": 0, "unit_ar": "غرام", "name_ar": "بطاطا حلوة", "factor": 100, "food_type": "carb"},
    #     {"name": "honey teaspoon", "protein": 0, "carb": 5.8, "fat": 0, "unit_ar": "ملعقة شاي", "name_ar": "عسل", "factor": 1, "food_type": "carb"},
    #     {"name": "blueberries", "protein": 0.4, "carb": 6, "fat": 0.2, "unit_ar": "غرام", "name_ar": "توت ازرق", "factor": 50, "food_type": "carb"},
    #     {"name": "Vitargo 1 scoop", "protein": 0, "carb": 23, "fat": 0, "unit_ar": "سكوب", "name_ar": "فيتارجو", "factor": 1, "food_type": "carb"},
    #     {"name": "one medium apple", "protein": 0.5, "carb": 20.8, "fat": 0.3, "unit_ar": "تفاحه متوسطه", "name_ar": "تفاحه", "factor": 1, "food_type": "carb"},
    #     {"name": "almond 30 g", "protein": 6.3, "carb": 2.7, "fat": 15, "unit_ar": "جرام", "name_ar": "جوز", "factor": 30, "food_type": "carb"},
    #     {"name": "potato", "protein": 2.7, "carb": 14.7, "fat": 0, "unit_ar": "غرام", "name_ar": "بطاطا مسلوقة", "factor": 100, "food_type": "carb"},

    #     # PROTEIN
    #     {"name": "whole Egg boiled", "protein": 6.3, "carb": 0.4, "fat": 4.8, "unit_ar": "ملعقة شاي", "name_ar": "بيضة مسلوقة", "factor": 1, "food_type": "protein"},
    #     {"name": "Chicken Breast", "protein": 23.5, "carb": 2.4, "fat": 2.9, "unit_ar": "سكووب", "name_ar": "صدر دجاج", "factor": 100, "food_type": "protein"},
    #     {"name": "egg white 1 large", "protein": 3.6, "carb": 0.2, "fat": 0.1, "unit_ar": "غرام", "name_ar": "بياض بيض", "factor": 100, "food_type": "protein"},
    #     {"name": "full fat milk 10 ml", "protein": 3.4, "carb": 4.8, "fat": 3.5, "unit_ar": "غرام", "name_ar": "حليب كامل الدسم", "factor": 1, "food_type": "protein"},
    #     {"name": "shrimp 100g", "protein": 24.7, "carb": 0, "fat": 0, "unit_ar": "غرام", "name_ar": "شريمب", "factor": 100, "food_type": "protein"},
    #     {"name": "salmon 100g", "protein": 18.9, "carb": 0, "fat": 0.9, "unit_ar": "غرام", "name_ar": "سالمون", "factor": 100, "food_type": "protein"},
    #     {"name": "steak", "protein": 21, "carb": 0, "fat": 9, "unit_ar": "غرام", "name_ar": "ستيك", "factor": 100, "food_type": "protein"},
    #     {"name": "Grenade protein bar", "protein": 22, "carb": 15, "fat": 9, "unit_ar": "حبة", "name_ar": "بروتين بار", "factor": 1, "food_type": "protein"},
    #     {"name": "ground beef", "protein": 17.9, "carb": 15, "fat": 0, "unit_ar": "غرام", "name_ar": "لحمة مفرومه", "factor": 100, "food_type": "protein"},
    #     {"name": "iso 100", "protein": 25, "carb": 0, "fat": 1, "unit_ar": "سكوب", "name_ar": "ايزو 100", "factor": 1, "food_type": "protein"},
    #     {"name": "tuna in olive", "protein": 20, "carb": 0, "fat": 11, "unit_ar": "علبة", "name_ar": "تونا بالزيت", "factor": 1, "food_type": "protein"},

    #     # FATS
    #     {"name": "avocado 100", "protein": 2, "carb": 1.8, "fat": 14.7, "unit_ar": "غرام", "name_ar": "افوكادو", "factor": 100, "food_type": "fat"},
    #     {"name": "Peanut butter", "protein": 3.6, "carb": 2.8, "fat": 8.2, "unit_ar": "ملعقة طعام", "name_ar": "بينت بتر", "factor": 1, "food_type": "fat"},
    #     {"name": "butter unsalted 1 teaspoon", "protein": 0, "carb": 0, "fat": 3.8, "unit_ar": "ملعقة شاي", "name_ar": "زبدة غير مملحه", "factor": 1, "food_type": "fat"},
    #     {"name": "youghret 100 G", "protein": 3, "carb": 5, "fat": 3, "unit_ar": "غرام", "name_ar": "لبن", "factor": 100, "food_type": "fat"},
    #     {"name": "olive oil TSB", "protein": 0, "carb": 0, "fat": 4.5, "unit_ar": "ملعقة شاي", "name_ar": "زيت زيتون", "factor": 1, "food_type": "fat"},
    # ]
    data = [
        # CARBS
        {"name": "Oats", "unit": "100 G", "protein": 16.9, "carb": 55.7, "fat": 6.9, "unit_ar": "غرام", "name_ar": "شوفان", "factor": 100, "food_type": "carb"},
        {"name": "white rice", "unit": "100 G", "protein": 2.7, "carb": 27.6, "fat": 2.7, "unit_ar": "بيضة متوسطة", "name_ar": "رز ابيض مسلوق", "factor": 100, "food_type": "carb"},
        {"name": "toast bread - white", "unit": "one slice", "protein": 2.6, "carb": 14.8, "fat": 1, "unit_ar": "علبة", "name_ar": "خبز توست ابيض", "factor": 1, "food_type": "carb"},
        {"name": "banana medium", "unit": "Medium Banana", "protein": 1.3, "carb": 23.9, "fat": 0.4, "unit_ar": "موزة", "name_ar": "موز ة متوسطة الحجم", "factor": 1, "food_type": "carb"},
        {"name": "sweet potato", "unit": "100 G", "protein": 1.8, "carb": 25.6, "fat": 0, "unit_ar": "غرام", "name_ar": "بطاطا حلوة", "factor": 100, "food_type": "carb"},
        {"name": "honey teaspoon", "unit": "Tea spoon", "protein": 0, "carb": 5.8, "fat": 0, "unit_ar": "ملعقة شاي", "name_ar": "عسل", "factor": 1, "food_type": "carb"},
        {"name": "blueberries", "unit": "50 G", "protein": 0.4, "carb": 6, "fat": 0.2, "unit_ar": "غرام", "name_ar": "توت ازرق", "factor": 50, "food_type": "carb"},
        {"name": "Vitargo 1 scoop", "unit": "1 scoop", "protein": 0, "carb": 23, "fat": 0, "unit_ar": "سكوب", "name_ar": "فيتارجو", "factor": 1, "food_type": "carb"},
        {"name": "one medium apple", "unit": "medium", "protein": 0.5, "carb": 20.8, "fat": 0.3, "unit_ar": "تفاحه متوسطه", "name_ar": "تفاحه", "factor": 1, "food_type": "carb"},
        {"name": "almond 30 g", "unit": "30 G", "protein": 6.3, "carb": 2.7, "fat": 15, "unit_ar": "جرام", "name_ar": "جوز", "factor": 30, "food_type": "carb"},
        {"name": "potato", "unit": "100 G", "protein": 2.7, "carb": 14.7, "fat": 0, "unit_ar": "غرام", "name_ar": "بطاطا مسلوقة", "factor": 100, "food_type": "carb"},

        # PROTEIN
        {"name": "whole Egg boiled", "unit": "1 Medium Egg", "protein": 6.3, "carb": 0.4, "fat": 4.8, "unit_ar": "ملعقة شاي", "name_ar": "بيضة مسلوقة", "factor": 1, "food_type": "protein"},
        {"name": "Chicken Breast", "unit": "100 G", "protein": 23.5, "carb": 2.4, "fat": 2.9, "unit_ar": "سكووب", "name_ar": "صدر دجاج", "factor": 100, "food_type": "protein"},
        {"name": "egg white 1 large", "unit": "100 G", "protein": 3.6, "carb": 0.2, "fat": 0.1, "unit_ar": "غرام", "name_ar": "بياض بيض", "factor": 100, "food_type": "protein"},
        {"name": "full fat milk 10 ml", "unit": "1 scoop", "protein": 3.4, "carb": 4.8, "fat": 3.5, "unit_ar": "غرام", "name_ar": "حليب كامل الدسم", "factor": 1, "food_type": "protein"},
        {"name": "shrimp 100g", "unit": "100 G", "protein": 24.7, "carb": 0, "fat": 0, "unit_ar": "غرام", "name_ar": "شريمب", "factor": 100, "food_type": "protein"},
        {"name": "salmon 100g", "unit": "100 G", "protein": 18.9, "carb": 0, "fat": 0.9, "unit_ar": "غرام", "name_ar": "سالمون", "factor": 100, "food_type": "protein"},
        {"name": "steak", "unit": "100 G", "protein": 21, "carb": 0, "fat": 9, "unit_ar": "غرام", "name_ar": "ستيك", "factor": 100, "food_type": "protein"},
        {"name": "Grenade protein bar", "unit": "1 bar", "protein": 22, "carb": 15, "fat": 9, "unit_ar": "حبة", "name_ar": "بروتين بار", "factor": 1, "food_type": "protein"},
        {"name": "ground beef", "unit": "100 G", "protein": 17.9, "carb": 15, "fat": 0, "unit_ar": "غرام", "name_ar": "لحمة مفرومه", "factor": 100, "food_type": "protein"},
        {"name": "iso 100", "unit": "one scoop", "protein": 25, "carb": 0, "fat": 1, "unit_ar": "سكوب", "name_ar": "ايزو 100", "factor": 1, "food_type": "protein"},
        {"name": "tuna in olive", "unit": "1 can", "protein": 20, "carb": 0, "fat": 11, "unit_ar": "علبة", "name_ar": "تونا بالزيت", "factor": 1, "food_type": "protein"},

        # FATS
        {"name": "avocado 100", "unit": "100 G", "protein": 2, "carb": 1.8, "fat": 14.7, "unit_ar": "غرام", "name_ar": "افوكادو", "factor": 100, "food_type": "fat"},
        {"name": "Peanut butter", "unit": "table spoon", "protein": 3.6, "carb": 2.8, "fat": 8.2, "unit_ar": "ملعقة طعام", "name_ar": "بينت بتر", "factor": 1, "food_type": "fat"},
        {"name": "butter unsalted 1 teaspoon", "unit": "tea spoon", "protein": 0, "carb": 0, "fat": 3.8, "unit_ar": "ملعقة شاي", "name_ar": "زبدة غير مملحه", "factor": 1, "food_type": "fat"},
        {"name": "youghret 100 G", "unit": "100 G", "protein": 3, "carb": 5, "fat": 3, "unit_ar": "غرام", "name_ar": "لبن", "factor": 100, "food_type": "fat"},
        {"name": "olive oil TSB", "unit": "Tea spoon", "protein": 0, "carb": 0, "fat": 4.5, "unit_ar": "ملعقة شاي", "name_ar": "زيت زيتون", "factor": 1, "food_type": "fat"},
    ]


    for item in data:
        FoodItem.objects.update_or_create(
            name=item["name"],
            defaults={
                "protein": item["protein"],
                "carb": item["carb"],
                "fat": item["fat"],
                "unit_ar": item["unit_ar"],
                "unit": item["unit"],
                "name_ar": item["name_ar"],
                "multiplying_factor": item["factor"],
                "food_type": item["food_type"]
            }
        )

    print("✅ Food items updated successfully.")


from django.db import models
from django.contrib.auth import get_user_model
from django.forms.models import model_to_dict
import uuid


User = get_user_model()


def user_logo_upload_path(instance, filename):
    return f'user_{instance.user.id}/logo/{filename}'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    logo = models.ImageField(upload_to=user_logo_upload_path, blank=True, null=True)
    # Logo stored in the database (as a small data URL) so it survives server restarts.
    logo_data = models.TextField(blank=True, default='')
    clinic_name = models.CharField(max_length=200, blank=True, default='')
    ai_enabled = models.BooleanField(default=True, help_text='Dietitian can switch all AI features off')

    def __str__(self):
        return f"Profile of {self.user.username}"

class FoodItem(models.Model):
    FOOD_TYPE_CHOICES = [
        ('carb', 'Carb'),
        ('protein', 'Protein'),
        ('fat', 'Fat'),
        ('mixed', 'Mixed'),
    ]

    name = models.CharField(max_length=100, unique=True)
    unit = models.CharField(max_length=50)
    protein = models.FloatField()
    carb = models.FloatField()
    fat = models.FloatField()
    food_type = models.CharField(max_length=10, choices=FOOD_TYPE_CHOICES, default='mixed')
    name_ar = models.CharField(max_length=100, blank=True, null=True)
    unit_ar = models.CharField(max_length=50, blank=True, null=True)
    multiplying_factor = models.FloatField(default=1.0)
    # Vitamins & minerals in ONE serving (USDA): {"iron_mg": 1.2, "vitd_ug": 0, ...}. Empty = no data (e.g. brands).
    micros = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name


class Recipe(models.Model):
    """A cookbook recipe. It is ALSO one food (1 serving = 1 portion) so it can go in any plan;
    the client sheet / PDF then shows its ingredients, steps and photo."""
    food = models.OneToOneField(FoodItem, on_delete=models.CASCADE, related_name='recipe')
    key = models.SlugField(max_length=80, unique=True)
    section = models.CharField(max_length=50, blank=True)
    section_ar = models.CharField(max_length=50, blank=True)
    servings = models.PositiveSmallIntegerField(default=1)  # portions one batch makes
    photo = models.CharField(max_length=120, blank=True)  # path on the website, e.g. /recipes/meatza.jpg
    is_treat = models.BooleanField(default=False)
    has_pork = models.BooleanField(default=False)
    # {"en": {title, serving_size, prep, cook, ingredients: [...], steps: [...]}, "ar": {...same...}}
    content = models.JSONField(default=dict)
    source = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return self.key


class ClientProfileRevision(models.Model):
    client = models.ForeignKey('nutrition.ClientProfile', on_delete=models.CASCADE, related_name='profile_revisions')
    created_at = models.DateTimeField(auto_now_add=True)

    age = models.IntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female')], blank=True)
    goal = models.CharField(max_length=20, blank=True)
    smm = models.FloatField(null=True, blank=True)
    pbf = models.FloatField(null=True, blank=True)
    work_style = models.CharField(max_length=50, blank=True)
    bmr = models.FloatField(null=True, blank=True)
    calorie_target = models.FloatField(null=True, blank=True)
    target_protein = models.FloatField(null=True, blank=True)
    target_carb = models.FloatField(null=True, blank=True)
    target_fat = models.FloatField(null=True, blank=True)
    # Check-in details (new). source: visit / manual / inbody / client_link
    source = models.CharField(max_length=20, blank=True, default='visit')
    note = models.TextField(blank=True, default='')
    body_fat_mass = models.FloatField(null=True, blank=True)
    visceral_fat = models.FloatField(null=True, blank=True)
    waist_hip = models.FloatField(null=True, blank=True)
    inbody_bmr = models.FloatField(null=True, blank=True)
    # False for check-ins the client sent by link that the dietitian has not opened yet.
    reviewed = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.client.name} @ {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class CheckInFile(models.Model):
    """InBody photo or PDF attached to a check-in, kept in the database so it survives redeploys."""
    revision = models.OneToOneField(ClientProfileRevision, on_delete=models.CASCADE, related_name='file')
    name = models.CharField(max_length=255, blank=True, default='')
    content_type = models.CharField(max_length=100, default='application/octet-stream')
    data = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)


class CheckInLink(models.Model):
    """A reusable private link a client uses to send weekly check-ins from home."""
    client = models.OneToOneField('nutrition.ClientProfile', on_delete=models.CASCADE, related_name='checkin_link')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)

class ClientProfile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]

    GOAL_CHOICES = [
        ('gain', 'Weight Gain'),
        ('loss', 'Weight Loss'),
        ('maintain', 'Maintain'),
        ('', 'Empty'),
    ]

    WORK_STYLE_CHOICES = [
        ('bed_bound', 'Chair bound/bed bound'),
        ('seated_static', 'Seated work with no option of moving, no activity'),
        ('seated_moving', 'Seated work with requirement to moving a little'),
        ('standing', 'Standing work (e.g., housework, shop assistant)'),
        ('sport', 'Significant amounts of sport'),
        ('strenuous', 'Strenuous work or highly active'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="clients")

    name = models.CharField(max_length=100)
    description = models.CharField(max_length=5000, blank=True)
    weight = models.FloatField(help_text="Weight in kg")
    height = models.FloatField(help_text="Height in cm")
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    goal = models.CharField(max_length=10, choices=GOAL_CHOICES, blank=True, default='')
    # Mobile number for WhatsApp messages (any format; digits are taken when sending).
    phone = models.CharField(max_length=30, blank=True, default='')
    work_style = models.CharField(max_length=20, choices=WORK_STYLE_CHOICES)

    # Computed fields
    bmr = models.FloatField(editable=False)
    activity_value = models.FloatField(editable=False, null=True)
    target_calories = models.FloatField(editable=False, null=True)
    target_protein = models.FloatField(editable=False, null=True)
    target_carb = models.FloatField(editable=False, null=True)
    target_fat = models.FloatField(editable=False, null=True)
    smm = models.FloatField(null=True, blank=True)
    pbf = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    carb_percentage = models.FloatField(null=True, blank=True, help_text="Percentage of carbs")
    protein_percentage = models.FloatField(null=True, blank=True, help_text="Percentage of protein")
    fat_percentage = models.FloatField(null=True, blank=True, help_text="Percentage of fat")
    formula_name = models.CharField(max_length=100, blank=True, default='')
    calorie_adjustment = models.FloatField(default=0)

    # Foods this client must never get (allergies, medical exclusions). Hard rule.
    excluded_foods = models.ManyToManyField('nutrition.FoodItem', blank=True, related_name='excluded_for_clients')
    INTERVIEW_STATUS = [('none', 'Not sent'), ('sent', 'Link sent'), ('submitted', 'Answered, waiting for review'), ('reviewed', 'Reviewed')]
    interview_status = models.CharField(max_length=10, choices=INTERVIEW_STATUS, default='none')


    def save(self, *args, **kwargs):
        
        # Macronutrient breakdown
        # if self.goal == 'loss':
        #     self.target_carb = round((self.target_calories * 0.45) / 4, 2)
        #     self.target_protein = round((self.target_calories * 0.35) / 4, 2)
        #     self.target_fat = round((self.target_calories * 0.2) / 9, 2)
        # elif self.goal == 'gain':
        #     self.target_carb = round((self.target_calories * 0.6) / 4, 2)
        #     self.target_protein = round((self.target_calories * 0.25) / 4, 2)
        #     self.target_fat = round((self.target_calories * 0.15) / 9, 2)
        # elif self.goal == 'maintain':
        #     self.target_carb = round((self.target_calories * 0.55) / 4, 2)
        #     self.target_protein = round((self.target_calories * 0.25) / 4, 2)
        #     self.target_fat = round((self.target_calories * 0.2) / 9, 2)
        # else:
        #     self.target_carb = self.target_protein = self.target_fat = None
        
        if self.carb_percentage:
            self.target_carb = round((self.target_calories * self.carb_percentage) / 100 / 4, 2)
        else:
            self.target_carb = round((self.target_calories * 0.55) / 4, 2)
        
        if self.protein_percentage:
            self.target_protein = round((self.target_calories * self.protein_percentage) / 100 / 4, 2)
        else:
            self.target_protein = round((self.target_calories * 0.25) / 4, 2)
            
        if self.fat_percentage:
            self.target_fat = round((self.target_calories * self.fat_percentage) / 100 / 9, 2)
        else:
            self.target_fat = round((self.target_calories * 0.2) / 9, 2)

        super().save(*args, **kwargs)

        detailed_profile, created = DetailedProfile.objects.get_or_create(
            client=self,
            user=self.user
        )

        # Create a revision if not newly created
        if not created:
            data = model_to_dict(detailed_profile, exclude=['id', 'user', 'client'])
            DetailedProfileRevision.objects.create(
                detailed_profile=detailed_profile,
                modified_by=self.user,
                user=detailed_profile.user,
                client=detailed_profile.client,
                revision_reason="Auto-sync from ClientProfile",
                **data
            )

        # Sync relevant fields
        detailed_profile.height = self.height
        detailed_profile.weight = self.weight
        detailed_profile.gender = 'Male' if self.gender == 'M' else 'Female'
        detailed_profile.skeletal_muscle_mass = self.smm
        detailed_profile.body_fat_percentage = self.pbf

        # Sync name & email (if ClientProfile has email, otherwise remove)
        detailed_profile.name = self.name

        # Optional: split full name into first and last if you want
        if self.name:
            parts = self.name.strip().split(' ', 1)
            detailed_profile.first_name = parts[0]
            detailed_profile.last_name = parts[1] if len(parts) > 1 else ''

        goal_map = {
            'gain': 'Weight Gain',
            'loss': 'Weight Loss',
            'maintain': 'Maintain'
        }
        # Keep the client's own words if they already answered this question.
        if not (detailed_profile.fitness_goal or '').strip() or detailed_profile.fitness_goal in goal_map.values():
            detailed_profile.fitness_goal = goal_map.get(self.goal, '')

        detailed_profile.save()

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name

class DietPlan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_diet_plans')
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='diet_plans')
    created_at = models.DateTimeField(auto_now_add=True)

    name = models.CharField(max_length=255, default='Default Diet Plan')

    total_protein = models.FloatField()
    total_carb = models.FloatField()
    total_fat = models.FloatField()

    missing_protein = models.FloatField(default=0)
    missing_carb = models.FloatField(default=0)
    missing_fat = models.FloatField(default=0)

    notes = models.TextField(blank=True)
    workout = models.ForeignKey('nutrition.WorkoutTemplate', null=True, blank=True, on_delete=models.SET_NULL, related_name='plans')
    # Meals in order with the dietitian's names: [{"key": "meal1", "name": "Breakfast", "time": "08:00"}]
    meal_slots = models.JSONField(default=list, blank=True)
    # Suggested week: {"days": [{"items": [{"meal": "meal1", "food_id": 1, "quantity": 1.5, "swapped": false}]}]}
    weekly = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - Plan on {self.created_at.date()}"

class DietItem(models.Model):
    plan = models.ForeignKey(DietPlan, on_delete=models.CASCADE, related_name='items')
    food = models.ForeignKey('nutrition.FoodItem', on_delete=models.CASCADE)
    category = models.CharField(max_length=10, choices=[('carb', 'Carb'), ('protein', 'Protein'), ('fat', 'Fat')])
    # Float so half servings (1.5 = 150 g) are stored exactly instead of being cut to 1.
    quantity = models.FloatField(default=1, help_text="Number of servings (default = 1)")
    
    protein = models.FloatField()
    carb = models.FloatField()
    fat = models.FloatField()
    tags = models.ManyToManyField(Tag, related_name='diet_items', blank=True)
    # Optional unequal split across meals: {"<tag_id>": share}. Empty = equal split.
    meal_shares = models.JSONField(default=dict, blank=True)


    def __str__(self):
        return f"{self.food.name} x{self.quantity}"


class BMRFormula(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class BMRGenderFormula(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]
    formula = models.ForeignKey(BMRFormula, on_delete=models.CASCADE, related_name='gender_formulas')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    expression = models.TextField(help_text="Use variables: weight, height, age")

    def __str__(self):
        return f"{self.formula.name} - {self.gender}"

class BMRActivityMultiplier(models.Model):
    formula = models.ForeignKey(BMRFormula, on_delete=models.CASCADE, related_name='activity_levels')
    level = models.CharField(max_length=50)
    multiplier = models.FloatField()

    def __str__(self):
        return f"{self.formula.name} - {self.level}"

class DetailedProfile(models.Model):
    # Foreign Keys
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_detailed_profiles')
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='detailed_profiles')

    # Step 1: General Information
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    date_of_participation = models.DateField(null=True, blank=True)
    last_visit = models.DateField(null=True, blank=True)
    total_visits = models.IntegerField(null=True, blank=True)

    # Step 2: Personal Information
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    last_visit_weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=6, choices=[("Male", "Male"), ("Female", "Female")], null=True, blank=True)
    marital_status = models.CharField(max_length=7, choices=[("Single", "Single"), ("Married", "Married")], null=True, blank=True)
    occupation = models.CharField(max_length=255, null=True, blank=True)
    symptoms = models.TextField(null=True, blank=True)

    # Step 3: Allergies
    food_allergies = models.JSONField(default=list, null=True, blank=True)
    diseases = models.JSONField(default=list, null=True, blank=True)
    allergy_notes = models.TextField(null=True, blank=True)

    # Step 4: Current Dietary Assessment
    protein = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    fat = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    carbs = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    grains = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    vegetables = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    fruit = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    dairy = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    food_to_eat_more = models.TextField(null=True, blank=True)
    food_to_eat_less = models.TextField(null=True, blank=True)
    food_to_avoid = models.TextField(null=True, blank=True)
    # Picked from the food database (ids). "Never eats" foods go to the client's excluded foods.
    liked_foods = models.JSONField(default=list, null=True, blank=True)
    less_foods = models.JSONField(default=list, null=True, blank=True)
    never_foods = models.JSONField(default=list, null=True, blank=True)
    # {"coffee_tea": {"freq": "daily", "amount": "3 cups"}, ..., "water_l": 1.5}
    drinks = models.JSONField(default=dict, null=True, blank=True)

    # Step 5: Supplements Intake
    current_supplement_intake = models.TextField(null=True, blank=True)

    # Step 6: Medical History
    current_medications = models.TextField(null=True, blank=True)
    medicine_history = models.TextField(null=True, blank=True)
    surgical_history = models.TextField(null=True, blank=True)

    # Step 7: Goals
    lifestyle_goal = models.TextField(null=True, blank=True)
    dietary_goal = models.TextField(null=True, blank=True)
    fitness_goal = models.TextField(null=True, blank=True)
    additional_concerns = models.TextField(null=True, blank=True)

    # Step 8: Daily Lifestyle
    smoke_cigarettes = models.BooleanField(null=True, blank=True)
    how_many_smoke_a_day = models.CharField(max_length=10, choices=[("1/2 Pack", "1/2 Pack"), ("1 Pack", "1 Pack"), ("1.5 Pack", "1.5 Pack"), ("2 Pack", "2 Pack")], null=True, blank=True)
    smoking_duration = models.CharField(max_length=6, choices=[("Months", "Months"), ("Years", "Years")], null=True, blank=True)
    alcohol = models.BooleanField(null=True, blank=True)
    how_many_drinks_a_day = models.CharField(max_length=10, choices=[("1", "1"), ("2", "2"), ("3", "3"), ("4 or more", "4 or more")], null=True, blank=True)
    alcohol_duration = models.CharField(max_length=6, choices=[("Months", "Months"), ("Years", "Years")], null=True, blank=True)
    caffeine = models.BooleanField(null=True, blank=True)
    how_many_caffeine_a_day = models.CharField(max_length=10, choices=[("1", "1"), ("2", "2"), ("3", "3"), ("4 or more", "4 or more")], null=True, blank=True)
    caffeine_duration = models.CharField(max_length=6, choices=[("Months", "Months"), ("Years", "Years")], null=True, blank=True)
    exercise = models.BooleanField(null=True, blank=True)
    exercise_duration = models.CharField(max_length=20, choices=[("30 Min", "30 Min"), ("45 Min", "45 Min"), ("1 Hour", "1 Hour"), ("2+ Hours", "2+ Hours")], null=True, blank=True)
    exercise_times_per_week = models.CharField(max_length=1, choices=[("1", "1"), ("2", "2"), ("3", "3"), ("4", "4"), ("5", "5"), ("6", "6"), ("7", "7")], null=True, blank=True)
    workout_intensity = models.CharField(max_length=10, choices=[("Low", "Low"), ("Medium", "Medium"), ("High", "High"), ("Very High", "Very High")], null=True, blank=True)
    types_of_workout = models.JSONField(default=list, null=True, blank=True)
    # Where they train / would train and the level they think they are (feeds the workout suggestions).
    exercise_place = models.CharField(max_length=20, choices=[("Gym", "Gym"), ("Home", "Home"), ("Outdoors", "Outdoors"), ("Sports club", "Sports club")], null=True, blank=True)
    exercise_level = models.CharField(max_length=20, choices=[("Beginner", "Beginner"), ("Intermediate", "Intermediate"), ("Advanced", "Advanced")], null=True, blank=True)
    willing_gym = models.BooleanField(null=True, blank=True)
    willing_home = models.BooleanField(null=True, blank=True)
    sleep_time = models.TimeField(null=True, blank=True)
    sleep_duration = models.IntegerField(null=True, blank=True)

    # Step 9: Digestive Issues
    bowel_movements_per_day = models.CharField(max_length=1, choices=[("1", "1"), ("2", "2"), ("3", "3"), ("4", "4"), ("5", "5")], null=True, blank=True)
    urinate_frequency = models.CharField(max_length=2, choices=[(str(i), str(i)) for i in range(1, 16)], null=True, blank=True)
    overall_energy_levels = models.CharField(max_length=8, choices=[("Low", "Low"), ("Moderate", "Moderate"), ("High", "High")], null=True, blank=True)

    # Step 10: Women Only
    pregnant = models.BooleanField(null=True, blank=True)
    weeks_pregnant = models.CharField(max_length=2, choices=[(str(i), str(i)) for i in range(1, 37)], null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    breastfeeding = models.BooleanField(null=True, blank=True)
    women_health_comments = models.TextField(null=True, blank=True)

    # Step 11: Measurements
    weight = models.FloatField(null=True, blank=True)
    body_fat_percentage = models.FloatField(null=True, blank=True)
    skeletal_muscle_mass = models.FloatField(null=True, blank=True)
    waist_to_hip_ratio = models.FloatField(null=True, blank=True)
    chest = models.FloatField(null=True, blank=True)
    right_arm = models.FloatField(null=True, blank=True)
    left_arm = models.FloatField(null=True, blank=True)
    right_forearm = models.FloatField(null=True, blank=True)
    left_forearm = models.FloatField(null=True, blank=True)
    belly = models.FloatField(null=True, blank=True)
    hip = models.FloatField(null=True, blank=True)
    glutes = models.FloatField(null=True, blank=True)
    left_thigh = models.FloatField(null=True, blank=True)
    right_thigh = models.FloatField(null=True, blank=True)
    left_calve = models.FloatField(null=True, blank=True)
    right_calve = models.FloatField(null=True, blank=True)
    date_of_measurement = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Detailed Profile for {self.client}"


class DetailedProfileRevision(models.Model):
    # Revision Metadata
    detailed_profile = models.ForeignKey('DetailedProfile', on_delete=models.CASCADE, related_name='revisions')
    modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    modified_at = models.DateTimeField(auto_now_add=True)
    revision_reason = models.TextField(null=True, blank=True)

    # Foreign Keys
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    client = models.ForeignKey('ClientProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    # Step 1: General Information
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    date_of_participation = models.DateField(null=True, blank=True)
    last_visit = models.DateField(null=True, blank=True)
    total_visits = models.IntegerField(null=True, blank=True)

    # Step 2: Personal Information
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    last_visit_weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    gender = models.CharField(max_length=6, choices=[("Male", "Male"), ("Female", "Female")], null=True, blank=True)
    marital_status = models.CharField(max_length=7, choices=[("Single", "Single"), ("Married", "Married")], null=True, blank=True)
    occupation = models.CharField(max_length=255, null=True, blank=True)
    symptoms = models.TextField(null=True, blank=True)

    # Step 3: Allergies
    food_allergies = models.JSONField(default=list, null=True, blank=True)
    diseases = models.JSONField(default=list, null=True, blank=True)
    allergy_notes = models.TextField(null=True, blank=True)

    # Step 4: Current Dietary Assessment
    protein = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    fat = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    carbs = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    grains = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    vegetables = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    fruit = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    dairy = models.CharField(max_length=8, choices=[("High", "High"), ("Moderate", "Moderate"), ("Low", "Low")], null=True, blank=True)
    food_to_eat_more = models.TextField(null=True, blank=True)
    food_to_eat_less = models.TextField(null=True, blank=True)
    food_to_avoid = models.TextField(null=True, blank=True)
    # Picked from the food database (ids). "Never eats" foods go to the client's excluded foods.
    liked_foods = models.JSONField(default=list, null=True, blank=True)
    less_foods = models.JSONField(default=list, null=True, blank=True)
    never_foods = models.JSONField(default=list, null=True, blank=True)
    # {"coffee_tea": {"freq": "daily", "amount": "3 cups"}, ..., "water_l": 1.5}
    drinks = models.JSONField(default=dict, null=True, blank=True)

    # Step 5: Supplements Intake
    current_supplement_intake = models.TextField(null=True, blank=True)

    # Step 6: Medical History
    current_medications = models.TextField(null=True, blank=True)
    medicine_history = models.TextField(null=True, blank=True)
    surgical_history = models.TextField(null=True, blank=True)

    # Step 7: Goals
    lifestyle_goal = models.TextField(null=True, blank=True)
    dietary_goal = models.TextField(null=True, blank=True)
    fitness_goal = models.TextField(null=True, blank=True)
    additional_concerns = models.TextField(null=True, blank=True)

    # Step 8: Daily Lifestyle
    smoke_cigarettes = models.BooleanField(null=True, blank=True)
    how_many_smoke_a_day = models.CharField(max_length=10, choices=[("1/2 Pack", "1/2 Pack"), ("1 Pack", "1 Pack"), ("1.5 Pack", "1.5 Pack"), ("2 Pack", "2 Pack")], null=True, blank=True)
    smoking_duration = models.CharField(max_length=6, choices=[("Months", "Months"), ("Years", "Years")], null=True, blank=True)
    alcohol = models.BooleanField(null=True, blank=True)
    how_many_drinks_a_day = models.CharField(max_length=10, choices=[("1", "1"), ("2", "2"), ("3", "3"), ("4 or more", "4 or more")], null=True, blank=True)
    alcohol_duration = models.CharField(max_length=6, choices=[("Months", "Months"), ("Years", "Years")], null=True, blank=True)
    caffeine = models.BooleanField(null=True, blank=True)
    how_many_caffeine_a_day = models.CharField(max_length=10, choices=[("1", "1"), ("2", "2"), ("3", "3"), ("4 or more", "4 or more")], null=True, blank=True)
    caffeine_duration = models.CharField(max_length=6, choices=[("Months", "Months"), ("Years", "Years")], null=True, blank=True)
    exercise = models.BooleanField(null=True, blank=True)
    exercise_duration = models.CharField(max_length=20, choices=[("30 Min", "30 Min"), ("45 Min", "45 Min"), ("1 Hour", "1 Hour"), ("2+ Hours", "2+ Hours")], null=True, blank=True)
    exercise_times_per_week = models.CharField(max_length=1, choices=[(str(i), str(i)) for i in range(1, 8)], null=True, blank=True)
    workout_intensity = models.CharField(max_length=10, choices=[("Low", "Low"), ("Medium", "Medium"), ("High", "High"), ("Very High", "Very High")], null=True, blank=True)
    types_of_workout = models.JSONField(default=list, null=True, blank=True)
    # Where they train / would train and the level they think they are (feeds the workout suggestions).
    exercise_place = models.CharField(max_length=20, choices=[("Gym", "Gym"), ("Home", "Home"), ("Outdoors", "Outdoors"), ("Sports club", "Sports club")], null=True, blank=True)
    exercise_level = models.CharField(max_length=20, choices=[("Beginner", "Beginner"), ("Intermediate", "Intermediate"), ("Advanced", "Advanced")], null=True, blank=True)
    willing_gym = models.BooleanField(null=True, blank=True)
    willing_home = models.BooleanField(null=True, blank=True)
    sleep_time = models.TimeField(null=True, blank=True)
    sleep_duration = models.IntegerField(null=True, blank=True)

    # Step 9: Digestive Issues
    bowel_movements_per_day = models.CharField(max_length=1, choices=[(str(i), str(i)) for i in range(1, 6)], null=True, blank=True)
    urinate_frequency = models.CharField(max_length=2, choices=[(str(i), str(i)) for i in range(1, 16)], null=True, blank=True)
    overall_energy_levels = models.CharField(max_length=8, choices=[("Low", "Low"), ("Moderate", "Moderate"), ("High", "High")], null=True, blank=True)

    # Step 10: Women Only
    pregnant = models.BooleanField(null=True, blank=True)
    weeks_pregnant = models.CharField(max_length=2, choices=[(str(i), str(i)) for i in range(1, 37)], null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    breastfeeding = models.BooleanField(null=True, blank=True)
    women_health_comments = models.TextField(null=True, blank=True)

    # Step 11: Measurements
    weight = models.FloatField(null=True, blank=True)
    body_fat_percentage = models.FloatField(null=True, blank=True)
    skeletal_muscle_mass = models.FloatField(null=True, blank=True)
    waist_to_hip_ratio = models.FloatField(null=True, blank=True)
    chest = models.FloatField(null=True, blank=True)
    right_arm = models.FloatField(null=True, blank=True)
    left_arm = models.FloatField(null=True, blank=True)
    right_forearm = models.FloatField(null=True, blank=True)
    left_forearm = models.FloatField(null=True, blank=True)
    belly = models.FloatField(null=True, blank=True)
    hip = models.FloatField(null=True, blank=True)
    glutes = models.FloatField(null=True, blank=True)
    left_thigh = models.FloatField(null=True, blank=True)
    right_thigh = models.FloatField(null=True, blank=True)
    left_calve = models.FloatField(null=True, blank=True)
    right_calve = models.FloatField(null=True, blank=True)
    date_of_measurement = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Revision of {self.detailed_profile} at {self.modified_at}"



class PlanTemplate(models.Model):
    """A reusable plan. user=None means a shared template (e.g. medical starting plans)."""
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name='plan_templates')
    name = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    description_ar = models.TextField(blank=True, default='')
    is_medical = models.BooleanField(default=False)
    condition = models.CharField(max_length=100, blank=True, default='')
    # True until a dietitian has checked it. Shown as a warning in the app.
    is_draft = models.BooleanField(default=False)
    # [{"food_id": 1, "quantity": 1.5, "category": "carb", "meals": ["meal1"], "shares": {"meal1": 1}}]
    items = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class WorkoutTemplate(models.Model):
    """A ready workout guide picked by goal, level and place. user=None = shared library."""
    GOALS = [('fat_loss', 'Fat loss'), ('muscle_gain', 'Muscle gain'), ('general_health', 'General health'),
             ('muscle_focus', 'Muscle focus')]
    LEVELS = [('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced'), ('all_levels', 'All levels')]
    PLACES = [('home', 'Home'), ('gym', 'Gym')]

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name='workout_templates')
    name = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True, default='')
    goal = models.CharField(max_length=20, choices=GOALS)
    level = models.CharField(max_length=20, choices=LEVELS, default='beginner')
    place = models.CharField(max_length=10, choices=PLACES, default='home')
    # Gentle version for clients with medical limits.
    is_safe_version = models.BooleanField(default=False)
    is_draft = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    notes_ar = models.TextField(blank=True, default='')
    # [{"title": "Day 1", "title_ar": "...", "exercises": [{"name": "...", "name_ar": "...", "sets": "3", "reps": "12", "rest": "60s"}]}]
    days = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class InterviewInvite(models.Model):
    """A private link a client opens to answer the first-visit questions at home."""
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='interview_invites')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    answers = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Interview for {self.client.name}"


class AIResult(models.Model):
    """Saved AI output so the dietitian can see it again without paying twice."""
    KINDS = [('summary', 'Interview summary'), ('message', 'Client message'), ('followup', 'Follow-up suggestion')]
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='ai_results')
    plan = models.ForeignKey(DietPlan, null=True, blank=True, on_delete=models.CASCADE, related_name='ai_results')
    kind = models.CharField(max_length=20, choices=KINDS)
    content = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)


# ------------------------------------------------------------ appointments ---

def default_hours():
    """Working hours per weekday (0 = Monday ... 6 = Sunday), clinic local time."""
    day = {'on': True, 'start': '10:00', 'end': '17:00'}
    return {str(d): dict(day, on=d != 4) for d in range(7)}  # Friday off


class Calendar(models.Model):
    """A named calendar, usually one per dietitian. Everyone in the same clinic sees all its calendars."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendars')
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='#1f6f5c')
    # Public booking link: /book/<slug>
    slug = models.SlugField(max_length=60, unique=True)
    timezone = models.CharField(max_length=50, default='Asia/Amman')
    hours = models.JSONField(default=default_hours)
    break_start = models.CharField(max_length=5, blank=True, default='13:00')
    break_end = models.CharField(max_length=5, blank=True, default='14:00')
    slot_minutes = models.PositiveIntegerField(default=30)
    currency = models.CharField(max_length=10, default='JOD')
    pay_online = models.BooleanField(default=False)
    pay_at_clinic = models.BooleanField(default=True)
    booking_open = models.BooleanField(default=True)
    reminders = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class AppointmentType(models.Model):
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='types')
    name = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100, blank=True, default='')
    minutes = models.PositiveIntegerField(default=30)
    price = models.DecimalField(max_digits=9, decimal_places=2, default=0)
    color = models.CharField(max_length=20, default='#2f5fb3')
    online = models.BooleanField(default=False, help_text='Video call instead of a clinic visit')
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class ClientPackage(models.Model):
    """A bundle of visits the client paid for, e.g. 'Monthly - 4 visits'."""
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='packages')
    name = models.CharField(max_length=100)
    visits = models.PositiveIntegerField(default=4)
    start = models.DateField()
    end = models.DateField(null=True, blank=True)
    price = models.DecimalField(max_digits=9, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=9, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.client.name} - {self.name}'


class Appointment(models.Model):
    STATUS = [('booked', 'Booked'), ('attended', 'Attended'), ('no_show', 'No-show'), ('cancelled', 'Cancelled')]
    PAY_METHODS = [('', 'Not set'), ('clinic', 'Pay at clinic'), ('online', 'Online')]
    PAID_VIA = [('', ''), ('cash', 'Cash'), ('card', 'Card'), ('transfer', 'Transfer'), ('online', 'Online'),
                ('package', 'Package')]

    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='appointments')
    type = models.ForeignKey(AppointmentType, null=True, blank=True, on_delete=models.SET_NULL, related_name='appointments')
    client = models.ForeignKey(ClientProfile, null=True, blank=True, on_delete=models.SET_NULL, related_name='appointments')
    # For people who booked by link and are not clients yet.
    guest_name = models.CharField(max_length=100, blank=True, default='')
    guest_phone = models.CharField(max_length=30, blank=True, default='')
    # Clinic local date and time (no time zone maths needed).
    date = models.DateField()
    time = models.TimeField()
    minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=10, choices=STATUS, default='booked')
    source = models.CharField(max_length=20, default='dietitian')  # dietitian / booking_link
    price = models.DecimalField(max_digits=9, decimal_places=2, default=0)
    pay_method = models.CharField(max_length=10, choices=PAY_METHODS, blank=True, default='')
    paid = models.BooleanField(default=False)
    paid_via = models.CharField(max_length=10, choices=PAID_VIA, blank=True, default='')
    package = models.ForeignKey(ClientPackage, null=True, blank=True, on_delete=models.SET_NULL, related_name='appointments')
    notes = models.TextField(blank=True, default='')
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'time']

    @property
    def display_name(self):
        return self.client.name if self.client_id else self.guest_name

    @property
    def phone(self):
        return (self.client.phone if self.client_id else '') or self.guest_phone

    def __str__(self):
        return f'{self.display_name} {self.date} {self.time}'


# ------------------------------------------------------------- client app ---

class DayLog(models.Model):
    """What the client ticked in their phone page for one day."""
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='day_logs')
    date = models.DateField()
    # {"<meal key>": 1 (ate it) or 0.5 (ate half)}
    meals = models.JSONField(default=dict, blank=True)
    water = models.PositiveIntegerField(default=0, help_text='Glasses of 250 ml')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('client', 'date')]
        ordering = ['-date']


# ---------------------------------------------------------------- blood tests ---

class BloodTest(models.Model):
    """One lab report for a client: date, the results and (optionally) the original file."""
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='blood_tests')
    date = models.DateField()
    lab = models.CharField(max_length=120, blank=True, default='')
    note = models.TextField(blank=True, default='')
    # The client sees the food advice on their phone page only after the dietitian shares it.
    shared = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']


class BloodTestFile(models.Model):
    # A report can have several pages (photos or PDFs).
    test = models.ForeignKey(BloodTest, on_delete=models.CASCADE, related_name='files')
    name = models.CharField(max_length=255, blank=True, default='')
    content_type = models.CharField(max_length=100, default='application/octet-stream')
    data = models.BinaryField()


class BloodResult(models.Model):
    test = models.ForeignKey(BloodTest, on_delete=models.CASCADE, related_name='results')
    code = models.CharField(max_length=30, blank=True, default='')  # known marker (ferritin, vitd…) or '' for others
    name = models.CharField(max_length=120)
    value = models.FloatField()
    unit = models.CharField(max_length=30, blank=True, default='')
    # The lab's own normal range when printed on the report (else the app's default range is used).
    ref_low = models.FloatField(null=True, blank=True)
    ref_high = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['id']


class BookingOffer(models.Model):
    """A personal booking link for one client: their name is filled in and (optionally) only chosen times are offered."""
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='booking_offers')
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='offers')
    type = models.ForeignKey(AppointmentType, null=True, blank=True, on_delete=models.SET_NULL)
    # ["2026-10-12 10:00", ...]; empty = any free time
    slots = models.JSONField(default=list, blank=True)
    appointment = models.ForeignKey('nutrition.Appointment', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

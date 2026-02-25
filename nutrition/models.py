from django.db import models
from django.contrib.auth import get_user_model
from django.forms.models import model_to_dict


User = get_user_model()


def user_logo_upload_path(instance, filename):
    return f'user_{instance.user.id}/logo/{filename}'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    logo = models.ImageField(upload_to=user_logo_upload_path, blank=True, null=True)

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

    def __str__(self):
        return self.name


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

    def __str__(self):
        return f"{self.client.name} @ {self.created_at.strftime('%Y-%m-%d %H:%M')}"

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

    def __str__(self):
        return f"{self.user.username} - Plan on {self.created_at.date()}"

class DietItem(models.Model):
    plan = models.ForeignKey(DietPlan, on_delete=models.CASCADE, related_name='items')
    food = models.ForeignKey('nutrition.FoodItem', on_delete=models.CASCADE)
    category = models.CharField(max_length=10, choices=[('carb', 'Carb'), ('protein', 'Protein'), ('fat', 'Fat')])
    quantity = models.IntegerField(default=1, help_text="Number of servings (default = 1)")
    
    protein = models.FloatField()
    carb = models.FloatField()
    fat = models.FloatField()
    tags = models.ManyToManyField(Tag, related_name='diet_items', blank=True)


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

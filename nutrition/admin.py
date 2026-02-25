from django.contrib import admin
from .models import FoodItem, ClientProfile, DietPlan, DietItem, Tag, BMRFormula, BMRGenderFormula, BMRActivityMultiplier

@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'protein', 'carb', 'fat', 'food_type', 'name_ar', 'unit_ar', 'multiplying_factor')
    search_fields = ('name',)

@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'weight', 'height', 'age', 'gender', 'goal', 'work_style', 'bmr', 'target_calories')
    list_filter = ('gender', 'goal')
    search_fields = ('user__username', 'name')

@admin.register(DietPlan)
class UserDietPlanAdmin(admin.ModelAdmin):
    pass

@admin.register(DietItem)
class UserDietItemAdmin(admin.ModelAdmin):
    pass


class BMRGenderFormulaInline(admin.TabularInline):
    model = BMRGenderFormula
    extra = 1

class BMRActivityMultiplierInline(admin.TabularInline):
    model = BMRActivityMultiplier
    extra = 1

@admin.register(BMRFormula)
class BMRFormulaAdmin(admin.ModelAdmin):
    inlines = [BMRGenderFormulaInline, BMRActivityMultiplierInline]

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    pass
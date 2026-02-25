from rest_framework import serializers
from .models import ClientProfile, DietItem, DietPlan, FoodItem, BMRFormula, BMRGenderFormula, BMRActivityMultiplier, Tag, DetailedProfile, UserProfile, DetailedProfileRevision

class DetailedProfileRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetailedProfileRevision
        fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['logo']


class ClientProfileSerializer(serializers.ModelSerializer):
    smm = serializers.FloatField(required=False, allow_null=True, default=None)
    pbf = serializers.FloatField(required=False, allow_null=True, default=None)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")


    class Meta:
        model = ClientProfile
        fields = [
            'id', 'name', 'description', 'weight', 'height', 'age', 'smm', 'pbf', 'gender', 'goal', 'work_style',
            'bmr', 'activity_value', 'target_calories',
            'target_protein', 'target_carb', 'target_fat',
            'carb_percentage', 'protein_percentage', 'fat_percentage',
        ]
        read_only_fields = [
            'target_protein', 'target_carb', 'target_fat'
        ]

    def to_internal_value(self, data):
        data = data.copy()
        if data.get("smm") == "":
            data["smm"] = None
        if data.get("pbf") == "":
            data["pbf"] = None
        return super().to_internal_value(data)


class DietItemSerializer(serializers.ModelSerializer):
    food_name = serializers.CharField(source='food.name', read_only=True)
    food_name_ar = serializers.CharField(source='food.name_ar', read_only=True)
    unit = serializers.CharField(source='food.unit', read_only=True)
    unit_ar = serializers.CharField(source='food.unit_ar', read_only=True)
    adjusted_quantity = serializers.SerializerMethodField()
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source='tags'
    )

    class Meta:
        model = DietItem
        fields = [
            'id',
            'food_id',
            'food_name',
            'food_name_ar',
            'unit',
            'unit_ar',
            'category',
            'quantity',
            'adjusted_quantity',
            'protein',
            'carb',
            'fat',
            'tag_ids'
        ]

    def get_adjusted_quantity(self, obj):
        factor = obj.food.multiplying_factor or 1
        return round(obj.quantity * factor, 2)


class DietPlanSerializer(serializers.ModelSerializer):
    items = DietItemSerializer(many=True, read_only=True)

    class Meta:
        model = DietPlan
        fields = [
            'id', 'created_at', 'name', 'total_protein', 'total_carb', 'total_fat',
            'missing_protein', 'missing_carb', 'missing_fat', 'items', 'client'
        ]

class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = ['id', 'name', 'unit', 'food_type', 'protein', 'carb', 'fat']


class BMRGenderFormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BMRGenderFormula
        fields = ['gender', 'expression']


class BMRActivityMultiplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = BMRActivityMultiplier
        fields = ['level', 'multiplier']


class BMRFormulaSerializer(serializers.ModelSerializer):
    gender_formulas = BMRGenderFormulaSerializer(many=True)
    activity_levels = BMRActivityMultiplierSerializer(many=True)

    class Meta:
        model = BMRFormula
        fields = ['name', 'description', 'gender_formulas', 'activity_levels']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class DietItemTagUpdateSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(), allow_empty=True
    )

class DetailedProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetailedProfile
        fields = '__all__'
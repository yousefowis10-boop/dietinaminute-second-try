# serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name']

    # def validate(self, data):
    #     if data['password'] != data['confirm_password']:
    #         raise serializers.ValidationError("Passwords do not match")
    #     return data

    def create(self, validated_data):
        email = validated_data.get('email')
        validated_data['username'] = email

        user = User.objects.create_user(**validated_data)
        return user

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
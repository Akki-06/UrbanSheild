from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True)
    admin_key = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'admin_key', 'role']

    def create(self, validated_data):

        admin_key = validated_data.pop('admin_key', None)
        role = validated_data.pop('role', 'user')

        user = User.objects.create_user(**validated_data)

        # CREATE PROFILE MANUALLY
        profile = UserProfile.objects.create(user=user)

        if role == "regional_admin":
            if admin_key == "URBANSHIELD2026":
                profile.role = "regional_admin"
                user.is_staff = True
                user.save()
            else:
                raise serializers.ValidationError("Invalid admin key.")

        profile.save()

        return user
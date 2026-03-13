from django.contrib.auth.models import User
from rest_framework import serializers

from .models import UserSettings


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        exclude = ("id", "user")


class UserSerializer(serializers.ModelSerializer):
    settings = UserSettingsSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "settings")
        read_only_fields = ("id", "username", "email")

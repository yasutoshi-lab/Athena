from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserSettings


class UserSettingsSerializer(serializers.ModelSerializer):
    anthropic_api_key_set = serializers.SerializerMethodField()
    brave_api_key_set = serializers.SerializerMethodField()

    class Meta:
        model = UserSettings
        exclude = ("id", "user")
        extra_kwargs = {
            "anthropic_api_key": {"write_only": True},
            "brave_api_key": {"write_only": True},
        }

    def get_anthropic_api_key_set(self, obj) -> bool:
        return bool(obj.anthropic_api_key)

    def get_brave_api_key_set(self, obj) -> bool:
        return bool(obj.brave_api_key)


class UserSerializer(serializers.ModelSerializer):
    settings = UserSettingsSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "settings")
        read_only_fields = ("id", "username", "email")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("このユーザー名は既に使用されています。")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("このメールアドレスは既に登録されています。")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "パスワードが一致しません。"})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        UserSettings.objects.create(user=user)
        return user

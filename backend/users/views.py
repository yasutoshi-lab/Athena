from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import UserSettings
from .serializers import (
    UserSerializer,
    UserSettingsSerializer,
    RegisterSerializer,
)


class LoginView(TokenObtainPairView):
    permission_classes = (AllowAny,)


class RefreshView(TokenRefreshView):
    permission_classes = (AllowAny,)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception:
        return Response(status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    # Ensure UserSettings exists
    UserSettings.objects.get_or_create(user=request.user)
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def settings_view(request):
    user_settings, _ = UserSettings.objects.get_or_create(user=request.user)

    if request.method == "GET":
        serializer = UserSettingsSerializer(user_settings)
        return Response(serializer.data)

    serializer = UserSettingsSerializer(user_settings, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=status.HTTP_201_CREATED,
    )

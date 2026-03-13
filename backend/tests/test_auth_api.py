"""Tests for authentication API endpoints (/api/auth/)."""
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .conftest import APITestBase


class TestLoginAPI(APITestBase):
    """POST /api/auth/login/ — JWT token pair issuance."""

    def test_login_success(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)

    def test_login_wrong_password(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "testuser", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "nobody", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields(self):
        resp = self.client.post("/api/auth/login/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class TestRefreshAPI(APITestBase):
    """POST /api/auth/refresh/ — Access token refresh."""

    def test_refresh_success(self):
        resp = self.client.post(
            "/api/auth/refresh/",
            {"refresh": str(self.refresh)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)

    def test_refresh_invalid_token(self):
        resp = self.client.post(
            "/api/auth/refresh/",
            {"refresh": "invalid-token"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TestLogoutAPI(APITestBase):
    """POST /api/auth/logout/ — Blacklist refresh token."""

    def test_logout_success(self):
        resp = self.client.post(
            "/api/auth/logout/",
            {"refresh": str(self.refresh)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_token_blacklisted_after_logout(self):
        refresh_str = str(self.refresh)
        self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh_str},
            format="json",
        )
        # Refresh with the same token should fail
        resp = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh_str},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh_token(self):
        resp = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_unauthenticated(self):
        client = APIClient()
        resp = client.post(
            "/api/auth/logout/",
            {"refresh": str(self.refresh)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TestMeAPI(APITestBase):
    """GET /api/auth/me/ — Current user profile."""

    def test_me_success(self):
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["username"], "testuser")
        self.assertEqual(resp.data["email"], "test@example.com")
        self.assertIn("settings", resp.data)

    def test_me_creates_user_settings_if_missing(self):
        from users.models import UserSettings

        UserSettings.objects.filter(user=self.user).delete()
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(UserSettings.objects.filter(user=self.user).exists())

    def test_me_unauthenticated(self):
        client = APIClient()
        resp = client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

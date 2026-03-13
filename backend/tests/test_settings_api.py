"""Tests for user settings API endpoints (/api/settings/)."""
from rest_framework import status
from rest_framework.test import APIClient

from users.models import UserSettings
from .conftest import APITestBase


class TestSettingsGetAPI(APITestBase):
    """GET /api/settings/ — Retrieve user settings."""

    def test_get_settings_creates_defaults(self):
        resp = self.client.get("/api/settings/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["default_model"], "auto")
        self.assertEqual(resp.data["complexity_threshold"], 3)
        self.assertEqual(resp.data["color_mode"], "dark")
        self.assertEqual(resp.data["graph_animation"], True)
        self.assertEqual(resp.data["graph_grid"], True)
        self.assertEqual(resp.data["animation_speed"], "normal")

    def test_get_settings_returns_existing(self):
        UserSettings.objects.create(
            user=self.user,
            display_name="テスト太郎",
            nickname="てすたろう",
            default_model="opus",
            complexity_threshold=5,
        )
        resp = self.client.get("/api/settings/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["display_name"], "テスト太郎")
        self.assertEqual(resp.data["nickname"], "てすたろう")
        self.assertEqual(resp.data["default_model"], "opus")
        self.assertEqual(resp.data["complexity_threshold"], 5)

    def test_get_settings_unauthenticated(self):
        client = APIClient()
        resp = client.get("/api/settings/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TestSettingsUpdateAPI(APITestBase):
    """PUT /api/settings/ — Update user settings (partial)."""

    def test_update_display_name(self):
        resp = self.client.put(
            "/api/settings/",
            {"display_name": "新しい名前"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["display_name"], "新しい名前")

    def test_update_model_selection(self):
        resp = self.client.put(
            "/api/settings/",
            {"default_model": "opus", "complexity_threshold": 5},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["default_model"], "opus")
        self.assertEqual(resp.data["complexity_threshold"], 5)

    def test_update_color_mode(self):
        resp = self.client.put(
            "/api/settings/",
            {"color_mode": "light"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["color_mode"], "light")

    def test_update_graph_settings(self):
        resp = self.client.put(
            "/api/settings/",
            {"graph_animation": False, "graph_grid": False, "animation_speed": "fast"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["graph_animation"], False)
        self.assertEqual(resp.data["graph_grid"], False)
        self.assertEqual(resp.data["animation_speed"], "fast")

    def test_update_system_prompt(self):
        prompt = "日本語で回答してください。引用にはURLを付けてください。"
        resp = self.client.put(
            "/api/settings/",
            {"system_prompt": prompt},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["system_prompt"], prompt)

    def test_partial_update_preserves_other_fields(self):
        UserSettings.objects.create(
            user=self.user,
            display_name="太郎",
            nickname="たろう",
            default_model="sonnet",
        )
        resp = self.client.put(
            "/api/settings/",
            {"display_name": "次郎"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["display_name"], "次郎")
        self.assertEqual(resp.data["nickname"], "たろう")
        self.assertEqual(resp.data["default_model"], "sonnet")

    def test_update_invalid_model_choice(self):
        resp = self.client.put(
            "/api/settings/",
            {"default_model": "invalid"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_invalid_color_mode(self):
        resp = self.client.put(
            "/api/settings/",
            {"color_mode": "neon"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

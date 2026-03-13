"""Tests for usage API endpoint (/api/usage/)."""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APIClient

from .conftest import APITestBase


class TestUsageAPI(APITestBase):
    """GET /api/usage/ — Token usage aggregation."""

    def test_usage_empty(self):
        resp = self.client.get("/api/usage/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total_cost"], 0)
        self.assertEqual(resp.data["total_tokens"]["input"], 0)
        self.assertEqual(resp.data["total_tokens"]["output"], 0)
        self.assertEqual(resp.data["session_count"], 0)

    def test_usage_with_data(self):
        session = self.create_session()
        self.create_token_usage(
            session,
            model="claude-sonnet-4-20250514",
            input_tokens=2000,
            output_tokens=800,
            cost_usd=Decimal("0.018000"),
            node_name="complexity_judge",
        )
        self.create_token_usage(
            session,
            model="claude-sonnet-4-20250514",
            input_tokens=3000,
            output_tokens=1200,
            cost_usd=Decimal("0.027000"),
            node_name="hypothesis_generator",
        )

        resp = self.client.get("/api/usage/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(resp.data["total_cost"], 0.045, places=3)
        self.assertEqual(resp.data["total_tokens"]["input"], 5000)
        self.assertEqual(resp.data["total_tokens"]["output"], 2000)
        self.assertEqual(resp.data["session_count"], 1)

    def test_usage_model_breakdown(self):
        session1 = self.create_session()
        session2 = self.create_session(query="2つ目")

        self.create_token_usage(
            session1,
            model="claude-sonnet-4-20250514",
            cost_usd=Decimal("0.010000"),
        )
        self.create_token_usage(
            session2,
            model="claude-opus-4-20250514",
            cost_usd=Decimal("0.100000"),
        )

        resp = self.client.get("/api/usage/")
        self.assertEqual(resp.data["model_breakdown"]["sonnet"]["sessions"], 1)
        self.assertEqual(resp.data["model_breakdown"]["opus"]["sessions"], 1)
        self.assertAlmostEqual(
            resp.data["model_breakdown"]["sonnet"]["cost"], 0.01, places=2
        )
        self.assertAlmostEqual(
            resp.data["model_breakdown"]["opus"]["cost"], 0.1, places=2
        )

    def test_usage_excludes_other_users(self):
        my_session = self.create_session(user=self.user)
        other_session = self.create_session(user=self.other_user, query="他人のクエリ")

        self.create_token_usage(my_session, cost_usd=Decimal("0.050000"))
        self.create_token_usage(other_session, cost_usd=Decimal("0.200000"))

        resp = self.client.get("/api/usage/")
        self.assertAlmostEqual(resp.data["total_cost"], 0.05, places=2)
        self.assertEqual(resp.data["session_count"], 1)

    def test_usage_sessions_list(self):
        session = self.create_session()
        self.create_token_usage(session)

        resp = self.client.get("/api/usage/")
        self.assertGreaterEqual(len(resp.data["sessions"]), 1)
        s = resp.data["sessions"][0]
        self.assertIn("session__title", s)
        self.assertIn("model", s)
        self.assertIn("tokens", s)
        self.assertIn("cost", s)

    def test_usage_unauthenticated(self):
        client = APIClient()
        resp = client.get("/api/usage/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

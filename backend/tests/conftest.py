"""Shared test fixtures for backend API tests."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from causal.models import (
    Session,
    Hypothesis,
    Evidence,
    GraphNode,
    GraphEdge,
    TokenUsage,
)
from users.models import UserSettings


class APITestBase(TestCase):
    """Base class providing authenticated API client and test data helpers."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        cls.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="otherpass123",
        )

    def setUp(self):
        self.client = APIClient()
        self.refresh = RefreshToken.for_user(self.user)
        self.access_token = str(self.refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def create_session(self, user=None, **kwargs):
        defaults = {
            "user": user or self.user,
            "query": "なぜ日本のスタートアップ資金調達額が少ないのか？",
            "title": "スタートアップ資金調達",
            "status": Session.Status.COMPLETED,
            "selected_model": "sonnet",
        }
        defaults.update(kwargs)
        return Session.objects.create(**defaults)

    def create_hypothesis(self, session, **kwargs):
        defaults = {
            "session": session,
            "order": 1,
            "text": "VC文化の未成熟と失敗へのスティグマ",
            "score": 0.82,
        }
        defaults.update(kwargs)
        return Hypothesis.objects.create(**defaults)

    def create_evidence(self, hypothesis, **kwargs):
        defaults = {
            "hypothesis": hypothesis,
            "text": "GDP比VC投資額はシリコンバレーの1/8",
            "source_url": "https://example.com/report",
            "source_title": "経産省レポート2024",
            "stance": Evidence.Stance.SUPPORT,
            "confidence": Evidence.Confidence.HIGH,
        }
        defaults.update(kwargs)
        return Evidence.objects.create(**defaults)

    def create_graph_node(self, session, **kwargs):
        defaults = {
            "session": session,
            "node_id": "q0",
            "node_type": GraphNode.NodeType.QUESTION,
            "label": "なぜ日本のスタートアップ資金調達額が少ないのか？",
            "metadata": {"scope": "日本 vs 米国"},
        }
        defaults.update(kwargs)
        return GraphNode.objects.create(**defaults)

    def create_graph_edge(self, session, source, target, **kwargs):
        defaults = {
            "session": session,
            "source": source,
            "target": target,
            "edge_type": GraphEdge.EdgeType.CAUSAL,
        }
        defaults.update(kwargs)
        return GraphEdge.objects.create(**defaults)

    def create_token_usage(self, session, **kwargs):
        defaults = {
            "session": session,
            "model": "claude-sonnet-4-20250514",
            "input_tokens": 1000,
            "output_tokens": 500,
            "cost_usd": Decimal("0.010500"),
            "node_name": "complexity_judge",
        }
        defaults.update(kwargs)
        return TokenUsage.objects.create(**defaults)

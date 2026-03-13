"""Tests for token usage tracking middleware (cost calculation)."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from causal.middleware import calculate_cost, record_token_usage
from causal.models import Session, TokenUsage


class TestCalculateCost(TestCase):
    """Unit tests for calculate_cost()."""

    def test_sonnet_cost(self):
        # Sonnet: $3/1M input, $15/1M output
        cost = calculate_cost("claude-sonnet-4-20250514", 1000, 500)
        expected = Decimal("3") * 1000 / Decimal("1000000") + Decimal("15") * 500 / Decimal("1000000")
        self.assertEqual(cost, expected)

    def test_opus_cost(self):
        # Opus: $15/1M input, $75/1M output
        cost = calculate_cost("claude-opus-4-20250514", 1000, 500)
        expected = Decimal("15") * 1000 / Decimal("1000000") + Decimal("75") * 500 / Decimal("1000000")
        self.assertEqual(cost, expected)

    def test_unknown_model_uses_default(self):
        # Default: $3/1M input, $15/1M output (same as Sonnet)
        cost = calculate_cost("unknown-model", 1000, 500)
        expected = Decimal("3") * 1000 / Decimal("1000000") + Decimal("15") * 500 / Decimal("1000000")
        self.assertEqual(cost, expected)

    def test_zero_tokens(self):
        cost = calculate_cost("claude-sonnet-4-20250514", 0, 0)
        self.assertEqual(cost, Decimal("0"))

    def test_large_token_count(self):
        cost = calculate_cost("claude-sonnet-4-20250514", 1000000, 1000000)
        # $3 input + $15 output = $18
        self.assertEqual(cost, Decimal("18"))

    def test_opus_large_cost(self):
        cost = calculate_cost("claude-opus-4-20250514", 1000000, 1000000)
        # $15 input + $75 output = $90
        self.assertEqual(cost, Decimal("90"))


class TestRecordTokenUsage(TestCase):
    """Integration tests for record_token_usage()."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("mwuser", password="pass123")

    def test_record_creates_entry(self):
        session = Session.objects.create(user=self.user, query="Q")
        record_token_usage(
            session_id=session.id,
            model="claude-sonnet-4-20250514",
            input_tokens=2000,
            output_tokens=800,
            node_name="complexity_judge",
        )
        usage = TokenUsage.objects.get(session=session)
        self.assertEqual(usage.input_tokens, 2000)
        self.assertEqual(usage.output_tokens, 800)
        self.assertEqual(usage.node_name, "complexity_judge")
        self.assertGreater(usage.cost_usd, Decimal("0"))

    def test_record_cost_is_calculated(self):
        session = Session.objects.create(user=self.user, query="Q")
        record_token_usage(
            session_id=session.id,
            model="claude-sonnet-4-20250514",
            input_tokens=1000,
            output_tokens=500,
            node_name="test",
        )
        usage = TokenUsage.objects.get(session=session)
        expected = calculate_cost("claude-sonnet-4-20250514", 1000, 500)
        self.assertEqual(usage.cost_usd, expected)

    def test_multiple_records_per_session(self):
        session = Session.objects.create(user=self.user, query="Q")
        for node in ["complexity_judge", "question_parser", "hypothesis_generator"]:
            record_token_usage(
                session_id=session.id,
                model="claude-sonnet-4-20250514",
                input_tokens=500,
                output_tokens=200,
                node_name=node,
            )
        self.assertEqual(TokenUsage.objects.filter(session=session).count(), 3)

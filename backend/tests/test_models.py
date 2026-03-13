"""Tests for Django models — creation, relationships, constraints."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase

from causal.models import (
    Session,
    Hypothesis,
    Evidence,
    GraphNode,
    GraphEdge,
    TokenUsage,
)
from users.models import UserSettings


class TestUserSettingsModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("modeluser", password="pass123")

    def test_create_with_defaults(self):
        settings = UserSettings.objects.create(user=self.user)
        self.assertEqual(settings.default_model, "auto")
        self.assertEqual(settings.complexity_threshold, 3)
        self.assertEqual(settings.color_mode, "dark")
        self.assertTrue(settings.graph_animation)
        self.assertTrue(settings.graph_grid)
        self.assertEqual(settings.animation_speed, "normal")

    def test_str(self):
        settings = UserSettings.objects.create(user=self.user)
        self.assertIn("modeluser", str(settings))

    def test_one_to_one_constraint(self):
        UserSettings.objects.create(user=self.user)
        with self.assertRaises(IntegrityError):
            UserSettings.objects.create(user=self.user)


class TestSessionModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("sessionuser", password="pass123")

    def test_create_session(self):
        session = Session.objects.create(
            user=self.user,
            query="テスト質問",
            title="テスト",
        )
        self.assertEqual(session.status, Session.Status.PENDING)
        self.assertEqual(session.selected_model, "sonnet")
        self.assertIsNotNone(session.created_at)

    def test_str(self):
        session = Session.objects.create(user=self.user, query="テスト質問です")
        self.assertIn("テスト質問", str(session))

    def test_ordering(self):
        s1 = Session.objects.create(user=self.user, query="1つ目")
        s2 = Session.objects.create(user=self.user, query="2つ目")
        sessions = list(Session.objects.all())
        self.assertEqual(sessions[0], s2)  # newest first


class TestHypothesisModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("hypuser", password="pass123")
        cls.session = Session.objects.create(user=cls.user, query="Q")

    def test_create_hypothesis(self):
        h = Hypothesis.objects.create(
            session=self.session, order=1, text="仮説テスト", score=0.75
        )
        self.assertEqual(h.score, 0.75)
        self.assertEqual(h.order, 1)

    def test_ordering_by_score(self):
        Hypothesis.objects.create(session=self.session, order=1, text="H1", score=0.5)
        Hypothesis.objects.create(session=self.session, order=2, text="H2", score=0.9)
        hyps = list(Hypothesis.objects.all())
        self.assertGreater(hyps[0].score, hyps[1].score)

    def test_cascade_delete(self):
        h = Hypothesis.objects.create(session=self.session, order=1, text="H")
        self.session.delete()
        self.assertFalse(Hypothesis.objects.filter(id=h.id).exists())


class TestEvidenceModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("evuser", password="pass123")
        cls.session = Session.objects.create(user=cls.user, query="Q")
        cls.hypothesis = Hypothesis.objects.create(
            session=cls.session, order=1, text="H", score=0.5
        )

    def test_create_support_evidence(self):
        ev = Evidence.objects.create(
            hypothesis=self.hypothesis,
            text="支持する証拠",
            stance=Evidence.Stance.SUPPORT,
            confidence=Evidence.Confidence.HIGH,
        )
        self.assertEqual(ev.stance, "support")
        self.assertEqual(ev.confidence, "high")

    def test_create_counter_evidence(self):
        ev = Evidence.objects.create(
            hypothesis=self.hypothesis,
            text="反証",
            stance=Evidence.Stance.COUNTER,
            confidence=Evidence.Confidence.LOW,
        )
        self.assertEqual(ev.stance, "counter")

    def test_cascade_delete(self):
        ev = Evidence.objects.create(
            hypothesis=self.hypothesis, text="E", stance="support"
        )
        self.hypothesis.delete()
        self.assertFalse(Evidence.objects.filter(id=ev.id).exists())


class TestGraphNodeModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("gnuser", password="pass123")
        cls.session = Session.objects.create(user=cls.user, query="Q")

    def test_create_all_node_types(self):
        for ntype in GraphNode.NodeType.values:
            node = GraphNode.objects.create(
                session=self.session,
                node_id=f"test_{ntype}",
                node_type=ntype,
                label=f"Label for {ntype}",
            )
            self.assertEqual(node.node_type, ntype)

    def test_unique_together_constraint(self):
        GraphNode.objects.create(
            session=self.session, node_id="q0", node_type="question", label="Q"
        )
        with self.assertRaises(IntegrityError):
            GraphNode.objects.create(
                session=self.session, node_id="q0", node_type="question", label="Q2"
            )

    def test_metadata_json(self):
        node = GraphNode.objects.create(
            session=self.session,
            node_id="q0",
            node_type="question",
            label="Q",
            metadata={"scope": "日本", "time_frame": "直近5年"},
        )
        node.refresh_from_db()
        self.assertEqual(node.metadata["scope"], "日本")


class TestGraphEdgeModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("geuser", password="pass123")
        cls.session = Session.objects.create(user=cls.user, query="Q")
        cls.source = GraphNode.objects.create(
            session=cls.session, node_id="q0", node_type="question", label="Q"
        )
        cls.target = GraphNode.objects.create(
            session=cls.session, node_id="h1", node_type="hypothesis", label="H1"
        )

    def test_create_edge(self):
        edge = GraphEdge.objects.create(
            session=self.session,
            source=self.source,
            target=self.target,
            edge_type=GraphEdge.EdgeType.CAUSAL,
        )
        self.assertEqual(edge.edge_type, "causal")
        self.assertEqual(edge.source.node_id, "q0")
        self.assertEqual(edge.target.node_id, "h1")

    def test_all_edge_types(self):
        for i, etype in enumerate(GraphEdge.EdgeType.values):
            t = GraphNode.objects.create(
                session=self.session,
                node_id=f"t{i}",
                node_type="concept",
                label=f"T{i}",
            )
            edge = GraphEdge.objects.create(
                session=self.session,
                source=self.source,
                target=t,
                edge_type=etype,
            )
            self.assertEqual(edge.edge_type, etype)


class TestTokenUsageModel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("tuuser", password="pass123")
        cls.session = Session.objects.create(user=cls.user, query="Q")

    def test_create_usage(self):
        usage = TokenUsage.objects.create(
            session=self.session,
            model="claude-sonnet-4-20250514",
            input_tokens=1500,
            output_tokens=600,
            cost_usd=Decimal("0.018000"),
            node_name="question_parser",
        )
        self.assertEqual(usage.input_tokens, 1500)
        self.assertEqual(usage.output_tokens, 600)
        self.assertEqual(usage.cost_usd, Decimal("0.018000"))

    def test_str(self):
        usage = TokenUsage.objects.create(
            session=self.session,
            model="claude-sonnet-4-20250514",
            input_tokens=100,
            output_tokens=50,
            cost_usd=Decimal("0.001050"),
            node_name="test_node",
        )
        s = str(usage)
        self.assertIn("sonnet", s)
        self.assertIn("test_node", s)

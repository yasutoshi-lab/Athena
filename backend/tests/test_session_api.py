"""Tests for session API endpoints (/api/sessions/)."""
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from causal.models import Session, GraphNode, GraphEdge
from .conftest import APITestBase


class TestSessionListAPI(APITestBase):
    """GET /api/sessions/ — List sessions for authenticated user."""

    def test_list_empty(self):
        resp = self.client.get("/api/sessions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_list_returns_own_sessions_only(self):
        self.create_session(user=self.user)
        self.create_session(user=self.user, query="2つ目の質問")
        self.create_session(user=self.other_user, query="他人の質問")

        resp = self.client.get("/api/sessions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_list_session_fields(self):
        self.create_session()
        resp = self.client.get("/api/sessions/")
        session_data = resp.data[0]
        self.assertIn("id", session_data)
        self.assertIn("query", session_data)
        self.assertIn("title", session_data)
        self.assertIn("selected_model", session_data)
        self.assertIn("status", session_data)
        self.assertIn("created_at", session_data)

    def test_list_unauthenticated(self):
        client = APIClient()
        resp = client.get("/api/sessions/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TestSessionCreateAPI(APITestBase):
    """POST /api/sessions/ — Create a new session."""

    def test_create_session(self):
        resp = self.client.post(
            "/api/sessions/",
            {"query": "なぜ円安が進んでいるのか？"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["query"], "なぜ円安が進んでいるのか？")
        self.assertEqual(resp.data["status"], "pending")
        self.assertIn("id", resp.data)

    def test_create_session_sets_title(self):
        resp = self.client.post(
            "/api/sessions/",
            {"query": "なぜ少子化が進んでいるのか？"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("なぜ少子化", resp.data["title"])

    def test_create_session_no_query(self):
        resp = self.client.post("/api/sessions/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_session_persists_to_db(self):
        self.client.post(
            "/api/sessions/",
            {"query": "テストクエリ"},
            format="json",
        )
        self.assertEqual(Session.objects.filter(user=self.user).count(), 1)
        session = Session.objects.get(user=self.user)
        self.assertEqual(session.query, "テストクエリ")
        self.assertEqual(session.user, self.user)


class TestSessionDetailAPI(APITestBase):
    """GET /api/sessions/{id}/ — Session detail with hypotheses."""

    def test_detail_success(self):
        session = self.create_session()
        hyp = self.create_hypothesis(session)
        self.create_evidence(hyp)

        resp = self.client.get(f"/api/sessions/{session.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["query"], session.query)
        self.assertEqual(len(resp.data["hypotheses"]), 1)
        self.assertEqual(len(resp.data["hypotheses"][0]["evidences"]), 1)

    def test_detail_not_found(self):
        resp = self.client.get("/api/sessions/99999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_other_users_session(self):
        session = self.create_session(user=self.other_user)
        resp = self.client.get(f"/api/sessions/{session.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_includes_all_fields(self):
        session = self.create_session(complexity_score=0.75)
        resp = self.client.get(f"/api/sessions/{session.id}/")
        self.assertEqual(resp.data["complexity_score"], 0.75)
        self.assertIn("created_at", resp.data)
        self.assertIn("updated_at", resp.data)
        self.assertIn("selected_model", resp.data)


class TestSessionGraphAPI(APITestBase):
    """GET /api/sessions/{id}/graph/ — Graph nodes and edges."""

    def test_graph_empty_session(self):
        session = self.create_session()
        resp = self.client.get(f"/api/sessions/{session.id}/graph/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["nodes"], [])
        self.assertEqual(resp.data["edges"], [])

    def test_graph_with_nodes_and_edges(self):
        session = self.create_session()
        q_node = self.create_graph_node(session, node_id="q0", node_type="question")
        h_node = self.create_graph_node(
            session, node_id="h1", node_type="hypothesis", label="仮説1"
        )
        self.create_graph_edge(session, q_node, h_node)

        resp = self.client.get(f"/api/sessions/{session.id}/graph/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["nodes"]), 2)
        self.assertEqual(len(resp.data["edges"]), 1)

    def test_graph_node_fields(self):
        session = self.create_session()
        self.create_graph_node(session)
        resp = self.client.get(f"/api/sessions/{session.id}/graph/")
        node = resp.data["nodes"][0]
        self.assertIn("node_id", node)
        self.assertIn("node_type", node)
        self.assertIn("label", node)
        self.assertIn("metadata", node)

    def test_graph_edge_fields(self):
        session = self.create_session()
        q = self.create_graph_node(session, node_id="q0")
        h = self.create_graph_node(session, node_id="h1", node_type="hypothesis", label="H1")
        self.create_graph_edge(session, q, h)

        resp = self.client.get(f"/api/sessions/{session.id}/graph/")
        edge = resp.data["edges"][0]
        self.assertIn("source_node_id", edge)
        self.assertIn("target_node_id", edge)
        self.assertIn("edge_type", edge)
        self.assertEqual(edge["source_node_id"], "q0")
        self.assertEqual(edge["target_node_id"], "h1")

    def test_graph_other_users_session(self):
        session = self.create_session(user=self.other_user)
        resp = self.client.get(f"/api/sessions/{session.id}/graph/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_graph_nonexistent_session(self):
        resp = self.client.get("/api/sessions/99999/graph/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

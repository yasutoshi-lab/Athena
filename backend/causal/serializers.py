from rest_framework import serializers

from .models import (
    Session,
    Hypothesis,
    Evidence,
    GraphNode,
    GraphEdge,
    TokenUsage,
)


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = (
            "id",
            "text",
            "source_url",
            "source_title",
            "stance",
            "confidence",
            "created_at",
        )


class HypothesisSerializer(serializers.ModelSerializer):
    evidences = EvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = Hypothesis
        fields = ("id", "order", "text", "score", "evidences", "created_at")


class SessionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = (
            "id",
            "query",
            "title",
            "selected_model",
            "status",
            "created_at",
        )


class SessionDetailSerializer(serializers.ModelSerializer):
    hypotheses = HypothesisSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = (
            "id",
            "query",
            "title",
            "complexity_score",
            "selected_model",
            "status",
            "hypotheses",
            "final_answer",
            "references",
            "created_at",
            "updated_at",
        )


class SessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ("query",)


class GraphNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraphNode
        fields = ("id", "node_id", "node_type", "label", "metadata")


class GraphEdgeSerializer(serializers.ModelSerializer):
    source_node_id = serializers.CharField(source="source.node_id")
    target_node_id = serializers.CharField(source="target.node_id")

    class Meta:
        model = GraphEdge
        fields = ("id", "source_node_id", "target_node_id", "edge_type")


class TokenUsageSerializer(serializers.ModelSerializer):
    session_title = serializers.CharField(source="session.title", read_only=True)

    class Meta:
        model = TokenUsage
        fields = (
            "id",
            "session_title",
            "model",
            "input_tokens",
            "output_tokens",
            "cost_usd",
            "node_name",
            "created_at",
        )

from django.contrib import admin

from .models import (
    Session,
    Hypothesis,
    Evidence,
    GraphNode,
    GraphEdge,
    TokenUsage,
)


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "selected_model", "status", "created_at")
    list_filter = ("status", "selected_model")


@admin.register(Hypothesis)
class HypothesisAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "order", "score")


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("id", "hypothesis", "stance", "confidence", "source_title")


@admin.register(GraphNode)
class GraphNodeAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "node_id", "node_type", "label")


@admin.register(GraphEdge)
class GraphEdgeAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "source", "target", "edge_type")


@admin.register(TokenUsage)
class TokenUsageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "model", "input_tokens", "output_tokens", "cost_usd")

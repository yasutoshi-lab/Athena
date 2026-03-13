from django.conf import settings
from django.db import models
from pgvector.django import VectorField


class Session(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "待機中"
        RUNNING = "running", "実行中"
        COMPLETED = "completed", "完了"
        ERROR = "error", "エラー"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    query = models.TextField()
    title = models.CharField(max_length=500, blank=True)
    complexity_score = models.FloatField(null=True, blank=True)
    selected_model = models.CharField(max_length=20, default="sonnet")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "セッション"
        verbose_name_plural = "セッション"

    def __str__(self):
        return f"Session #{self.id}: {self.query[:50]}"


class Hypothesis(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="hypotheses"
    )
    order = models.IntegerField()
    text = models.TextField()
    score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score"]
        verbose_name = "仮説"
        verbose_name_plural = "仮説"

    def __str__(self):
        return f"H{self.order}: {self.text[:50]} (score={self.score})"


class Evidence(models.Model):
    class Stance(models.TextChoices):
        SUPPORT = "support", "支持"
        COUNTER = "counter", "反証"

    class Confidence(models.TextChoices):
        HIGH = "high", "HIGH"
        MEDIUM = "medium", "MEDIUM"
        LOW = "low", "LOW"

    hypothesis = models.ForeignKey(
        Hypothesis, on_delete=models.CASCADE, related_name="evidences"
    )
    text = models.TextField()
    source_url = models.TextField(blank=True)
    source_title = models.CharField(max_length=500, blank=True)
    stance = models.CharField(max_length=10, choices=Stance.choices)
    confidence = models.CharField(
        max_length=10, choices=Confidence.choices, default=Confidence.MEDIUM
    )
    embedding = VectorField(dimensions=1024, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "証拠"
        verbose_name_plural = "証拠"

    def __str__(self):
        return f"[{self.stance}] {self.text[:50]}"


class GraphNode(models.Model):
    class NodeType(models.TextChoices):
        QUESTION = "question", "質問"
        HYPOTHESIS = "hypothesis", "仮説"
        SUPPORT = "support", "支持"
        COUNTER = "counter", "反証"
        CONCEPT = "concept", "概念"

    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="nodes"
    )
    node_id = models.CharField(max_length=50)
    node_type = models.CharField(max_length=20, choices=NodeType.choices)
    label = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("session", "node_id")
        verbose_name = "グラフノード"
        verbose_name_plural = "グラフノード"

    def __str__(self):
        return f"[{self.node_type}] {self.node_id}: {self.label[:30]}"


class GraphEdge(models.Model):
    class EdgeType(models.TextChoices):
        CAUSAL = "causal", "因果"
        SUPPORT = "support", "支持"
        COUNTER = "counter", "反証"
        RELATION = "rel", "関連"

    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="edges"
    )
    source = models.ForeignKey(
        GraphNode, on_delete=models.CASCADE, related_name="edges_out"
    )
    target = models.ForeignKey(
        GraphNode, on_delete=models.CASCADE, related_name="edges_in"
    )
    edge_type = models.CharField(max_length=20, choices=EdgeType.choices)

    class Meta:
        verbose_name = "グラフエッジ"
        verbose_name_plural = "グラフエッジ"


class TokenUsage(models.Model):
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="token_usages"
    )
    model = models.CharField(max_length=30)
    input_tokens = models.IntegerField()
    output_tokens = models.IntegerField()
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6)
    node_name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "トークン使用量"
        verbose_name_plural = "トークン使用量"

    def __str__(self):
        return f"{self.model} | {self.node_name} | ${self.cost_usd}"

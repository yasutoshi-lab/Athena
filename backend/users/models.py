from django.conf import settings
from django.db import models


class UserSettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    display_name = models.CharField(max_length=100, blank=True)
    nickname = models.CharField(max_length=100, blank=True)
    default_model = models.CharField(
        max_length=20,
        choices=[("auto", "自動判定"), ("sonnet", "Sonnet"), ("opus", "Opus")],
        default="auto",
    )
    complexity_threshold = models.IntegerField(default=3)
    system_prompt = models.TextField(blank=True)
    color_mode = models.CharField(
        max_length=10,
        choices=[("dark", "ダーク"), ("light", "ライト"), ("system", "システム")],
        default="dark",
    )
    graph_animation = models.BooleanField(default=True)
    graph_grid = models.BooleanField(default=True)
    animation_speed = models.CharField(
        max_length=10,
        choices=[("slow", "低速"), ("normal", "標準"), ("fast", "高速")],
        default="normal",
    )

    class Meta:
        verbose_name = "ユーザー設定"
        verbose_name_plural = "ユーザー設定"

    def __str__(self):
        return f"{self.user.username} の設定"

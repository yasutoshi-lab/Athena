"""Token usage tracking middleware for Anthropic API calls."""
import logging
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)

# Cost per 1M tokens (USD)
MODEL_COSTS = {
    "claude-sonnet-4-20250514": {"input": Decimal("3"), "output": Decimal("15")},
    "claude-opus-4-20250514": {"input": Decimal("15"), "output": Decimal("75")},
}

# Fallback costs
DEFAULT_COSTS = {"input": Decimal("3"), "output": Decimal("15")}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    costs = MODEL_COSTS.get(model, DEFAULT_COSTS)
    input_cost = costs["input"] * Decimal(input_tokens) / Decimal("1000000")
    output_cost = costs["output"] * Decimal(output_tokens) / Decimal("1000000")
    return input_cost + output_cost


def record_token_usage(
    session_id: int,
    model: str,
    input_tokens: int,
    output_tokens: int,
    node_name: str,
):
    from .models import TokenUsage, Session

    cost = calculate_cost(model, input_tokens, output_tokens)

    TokenUsage.objects.create(
        session_id=session_id,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost,
        node_name=node_name,
    )

    logger.info(
        f"Token usage: {node_name} | {model} | "
        f"in={input_tokens} out={output_tokens} | ${cost}"
    )

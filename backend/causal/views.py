from django.db.models import Sum, Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Session, GraphNode, GraphEdge, TokenUsage
from .serializers import (
    SessionListSerializer,
    SessionDetailSerializer,
    SessionCreateSerializer,
    GraphNodeSerializer,
    GraphEdgeSerializer,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def session_list(request):
    if request.method == "GET":
        sessions = Session.objects.filter(user=request.user)
        serializer = SessionListSerializer(sessions, many=True)
        return Response(serializer.data)

    serializer = SessionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    session = serializer.save(user=request.user, title=request.data["query"][:100])
    return Response(
        SessionDetailSerializer(session).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    try:
        session = Session.objects.get(id=session_id, user=request.user)
    except Session.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if request.method == "PATCH":
        title = request.data.get("title")
        if title is not None:
            session.title = title
            session.save(update_fields=["title"])
        return Response(SessionDetailSerializer(session).data)

    serializer = SessionDetailSerializer(session)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_graph(request, session_id):
    try:
        session = Session.objects.get(id=session_id, user=request.user)
    except Session.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    nodes = GraphNode.objects.filter(session=session)
    edges = GraphEdge.objects.filter(session=session)
    return Response(
        {
            "nodes": GraphNodeSerializer(nodes, many=True).data,
            "edges": GraphEdgeSerializer(edges, many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_view(request):
    usages = TokenUsage.objects.filter(session__user=request.user)

    totals = usages.aggregate(
        total_input=Sum("input_tokens"),
        total_output=Sum("output_tokens"),
        total_cost=Sum("cost_usd"),
    )

    session_count = Session.objects.filter(user=request.user).count()

    model_breakdown = {}
    for model in ["sonnet", "opus"]:
        model_usages = usages.filter(model__icontains=model)
        agg = model_usages.aggregate(
            cost=Sum("cost_usd"),
            sessions=Count("session", distinct=True),
        )
        model_breakdown[model] = {
            "cost": float(agg["cost"] or 0),
            "sessions": agg["sessions"],
        }

    sessions = (
        TokenUsage.objects.filter(session__user=request.user)
        .values("session__id", "session__title", "model")
        .annotate(
            tokens=Sum("input_tokens") + Sum("output_tokens"),
            cost=Sum("cost_usd"),
        )
        .order_by("-session__id")[:20]
    )

    return Response(
        {
            "total_cost": float(totals["total_cost"] or 0),
            "total_tokens": {
                "input": totals["total_input"] or 0,
                "output": totals["total_output"] or 0,
            },
            "session_count": session_count,
            "model_breakdown": model_breakdown,
            "sessions": list(sessions),
        }
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def settings_view(request):
    from users.models import UserSettings
    from users.serializers import UserSettingsSerializer

    user_settings, _ = UserSettings.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return Response(UserSettingsSerializer(user_settings).data)

    serializer = UserSettingsSerializer(user_settings, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)

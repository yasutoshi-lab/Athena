import asyncio
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class InferenceConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pipeline_task: asyncio.Task | None = None

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"session_{self.session_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        self._cancel_pipeline()
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")

        if msg_type == "start_inference":
            query = content.get("query", "")
            if not query:
                await self.send_json({"type": "error", "message": "クエリが空です"})
                return
            self._cancel_pipeline()
            self._pipeline_task = asyncio.create_task(self._run_pipeline(query))

        elif msg_type == "follow_up":
            query = content.get("query", "")
            if not query:
                await self.send_json({"type": "error", "message": "クエリが空です"})
                return
            asyncio.create_task(self._run_follow_up(query))

        elif msg_type == "stop_inference":
            self._cancel_pipeline()
            await self._update_session_status("error")
            await self.send_json({"type": "session_stopped", "message": "推論を停止しました"})

    def _cancel_pipeline(self):
        if self._pipeline_task and not self._pipeline_task.done():
            self._pipeline_task.cancel()
            self._pipeline_task = None

    async def _run_pipeline(self, query):
        from .graph.pipeline import run_pipeline

        try:
            session = await self._get_or_create_session(query)
            session_id = session.id

            async for event in run_pipeline(query, session_id, self._send_event):
                pass

        except asyncio.CancelledError:
            logger.info(f"Pipeline cancelled for session {self.session_id}")
        except Exception as e:
            logger.exception("Pipeline error")
            await self.send_json(
                {"type": "error", "message": _friendly_error(e)}
            )
        finally:
            self._pipeline_task = None

    async def _run_follow_up(self, query):
        from .agents.follow_up import generate_follow_up_response

        try:
            await self.send_json({"type": "follow_up_started"})

            context = await self._load_session_context()
            answer = await database_sync_to_async(generate_follow_up_response)(
                query=context["query"],
                follow_up_query=query,
                hypotheses=context["hypotheses"],
                final_answer=context["final_answer"],
                references=context["references"],
            )

            await self.send_json({
                "type": "follow_up_response",
                "answer": answer,
            })
        except Exception as e:
            logger.exception("Follow-up error")
            await self.send_json(
                {"type": "error", "message": _friendly_error(e)}
            )

    @database_sync_to_async
    def _load_session_context(self):
        from .models import Session

        session = Session.objects.prefetch_related(
            "hypotheses__evidences"
        ).get(id=self.session_id)

        hypotheses = [
            {"text": h.text, "score": h.score, "order": h.order}
            for h in session.hypotheses.all()
        ]

        return {
            "query": session.query,
            "final_answer": session.final_answer,
            "references": session.references or [],
            "hypotheses": hypotheses,
        }

    async def _send_event(self, event: dict):
        await self.send_json(event)

    @database_sync_to_async
    def _get_or_create_session(self, query):
        from .models import Session

        user = self.scope.get("user")
        if user and user.is_authenticated:
            session, _ = Session.objects.get_or_create(
                id=self.session_id,
                defaults={"user": user, "query": query, "title": query[:100]},
            )
        else:
            session = Session.objects.get(id=self.session_id)
        session.status = Session.Status.RUNNING
        session.save(update_fields=["status"])
        return session

    @database_sync_to_async
    def _update_session_status(self, status_value):
        from .models import Session

        try:
            session = Session.objects.get(id=self.session_id)
            session.status = status_value
            session.save(update_fields=["status"])
        except Session.DoesNotExist:
            pass

    # Handler for group messages
    async def inference_event(self, event):
        await self.send_json(event["data"])


def _friendly_error(exc: Exception) -> str:
    """Convert known API errors to user-friendly Japanese messages."""
    msg = str(exc)
    if "credit balance is too low" in msg:
        return "AnthropicのAPIクレジット残高が不足しています。コンソールでクレジットを追加してください。"
    return f"推論エラー: {msg}"

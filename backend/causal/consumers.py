import asyncio
import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class InferenceConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.group_name = f"session_{self.session_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get("type")

        if msg_type == "start_inference":
            query = content.get("query", "")
            if not query:
                await self.send_json({"type": "error", "message": "クエリが空です"})
                return
            asyncio.create_task(self._run_pipeline(query))

    async def _run_pipeline(self, query):
        from .graph.pipeline import run_pipeline

        try:
            session = await self._get_or_create_session(query)
            session_id = session.id

            async for event in run_pipeline(query, session_id, self._send_event):
                pass

        except Exception as e:
            logger.exception("Pipeline error")
            await self.send_json(
                {"type": "error", "message": f"推論エラー: {str(e)}"}
            )

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

    # Handler for group messages
    async def inference_event(self, event):
        await self.send_json(event["data"])

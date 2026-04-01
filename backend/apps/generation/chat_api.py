"""
SSE endpoint for Canvas Compose chat streaming.

POST /generation/chat/stream
"""

from __future__ import annotations

from asgiref.sync import sync_to_async
from django.http import StreamingHttpResponse
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.accounts.auth import require_editor_capabilities
from apps.accounts.session_auth import session_auth as django_auth

from .chat_service import stream_chat

router = Router(tags=["chat"])


class ChatStreamIn(Schema):
    messages: list[dict]
    provider: str = "openai"
    model_id: str | None = None
    project_id: int | None = None
    format: str = "ig_square"
    network: str = ""
    conversation_id: int | None = None
    mode: str = "build"


def _next_stream_chunk(iterator):
    try:
        return next(iterator)
    except StopIteration:
        return None


@router.post("/stream", auth=django_auth)
async def chat_stream(request, payload: ChatStreamIn):
    """Stream SSE tokens from the AI provider for a chat turn (Editor+)."""
    await sync_to_async(require_editor_capabilities)(request)

    if not payload.messages:
        raise HttpError(400, "messages must not be empty")

    iterator = stream_chat(
        messages=payload.messages,
        provider_key=payload.provider,
        model_id=payload.model_id,
        project_id=payload.project_id,
        fmt=payload.format,
        network=payload.network,
        mode=payload.mode,
    )

    async def _event_generator():
        while True:
            chunk = await sync_to_async(_next_stream_chunk)(iterator)
            if chunk is None:
                break
            yield chunk

    response = StreamingHttpResponse(
        _event_generator(),
        content_type="text/event-stream",
    )
    response["X-Accel-Buffering"] = "no"
    response["Cache-Control"] = "no-cache"
    return response

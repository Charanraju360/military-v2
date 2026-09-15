"""Assistant router implementing API-008 and API-009 (Phase 9)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.assistant_service import AssistantService

router = APIRouter(tags=["assistant"])
assistant_service = AssistantService()


class ChatMessagePayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: str | None = None


@router.post("/assistant/chat")
async def chat_message(payload: ChatMessagePayload) -> dict[str, Any]:
    """Send a question to the assistant and receive a grounded RAG answer (API-008)."""

    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty",
        )

    return await assistant_service.chat_message(
        message=payload.message, session_id=payload.session_id
    )


@router.get("/assistant/sessions/{session_id}/messages")
async def get_session_messages(session_id: str) -> dict[str, Any]:
    """Retrieve chat message history for an anonymous session (API-009)."""

    items = await assistant_service.get_session_messages(session_id)
    return {"items": items}

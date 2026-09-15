"""Grounded RAG assistant service implementing FEAT-APP-03 and FR-010 (Phase 9)."""

from __future__ import annotations

import logging
from typing import Any

from bson import ObjectId

from app.clients.embedding_client import EmbeddingClient
from app.clients.omniroute_client import OmnirouteClient
from app.models.domain import AnswerSource, ChatMessage, ChatSession, EventStatus
from app.repositories.base import _as_object_id
from app.repositories.chat_message_repository import ChatMessageRepository
from app.repositories.chat_session_repository import ChatSessionRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.event_repository import EventRepository

logger = logging.getLogger(__name__)


class AssistantService:
    """Provide grounded answers using vector-retrieved event summaries with fallback handling."""

    def __init__(
        self,
        chat_session_repository: ChatSessionRepository | None = None,
        chat_message_repository: ChatMessageRepository | None = None,
        event_repository: EventRepository | None = None,
        chroma_repository: ChromaRepository | None = None,
        embedding_client: EmbeddingClient | None = None,
        omniroute_client: OmnirouteClient | None = None,
    ) -> None:
        self._session_repo = chat_session_repository or ChatSessionRepository()
        self._message_repo = chat_message_repository or ChatMessageRepository()
        self._event_repo = event_repository or EventRepository()
        self._chroma_repo = chroma_repository or ChromaRepository()
        self._embedding_client = embedding_client or EmbeddingClient()
        self._omniroute_client = omniroute_client or OmnirouteClient()

    async def chat_message(
        self, message: str, session_id: str | None = None
    ) -> dict[str, Any]:
        """Process a user question, perform vector retrieval, generate grounded answer, and persist messages."""

        active_session_id = session_id or str(ObjectId())

        session = await self._session_repo.get(active_session_id)
        if not session:
            await self._session_repo.create(ChatSession(id=active_session_id))

        # 1. Embed question vector
        vectors = await self._embedding_client.embed_batch([message])
        query_vector = vectors[0] if vectors else [0.0] * 384

        # 2. Vector search in event_embeddings
        chroma_res = await self._chroma_repo.query(
            "event_embeddings", query_embedding=query_vector, limit=5
        )

        ids = chroma_res.get("ids", [[]])[0]
        distances = (
            chroma_res.get("distances", [[]])[0]
            if "distances" in chroma_res and chroma_res["distances"]
            else [1.0] * len(ids)
        )

        # Distance threshold check for L2 distance (<= 1.50 matches relevant top events)
        matched_events: list[tuple[str, float]] = []
        for eid, dist in zip(ids, distances):
            if float(dist) <= 1.50:
                matched_events.append((eid, float(dist)))

        if not matched_events:
            # 3. No match short-circuit (skip Omniroute entirely)
            answer = "I don't have information on that."
            citations: list[str] = []
            answer_source = AnswerSource.NO_MATCH

        else:
            # 4. Fetch relevant events
            matched_ids = [m[0] for m in matched_events]
            object_ids = [oid for eid in matched_ids if (oid := _as_object_id(eid))]

            events = await self._event_repo.list({"_id": {"$in": object_ids}}) if object_ids else []
            valid_events = [e for e in events if e.id and e.summary]

            if not valid_events:
                answer = "I don't have information on that."
                citations = []
                answer_source = AnswerSource.NO_MATCH
            else:
                context_list = [{"id": e.id, "summary": e.summary} for e in valid_events if e.id and e.summary]
                top_event = valid_events[0]

                # 5. Call Omniroute grounded answer
                omni_answer, omni_citations = await self._omniroute_client.generate_grounded_answer(
                    question=message, context_events=context_list, timeout=7.0
                )

                if omni_answer and omni_answer.strip():
                    answer = omni_answer.strip()
                    citations = omni_citations or ([top_event.id] if top_event.id else [])
                    answer_source = AnswerSource.OMNIROUTE
                else:
                    # 6. Fallback excerpt: return top event summary verbatim
                    answer = top_event.summary or "I don't have information on that."
                    citations = [top_event.id] if top_event.id else []
                    answer_source = AnswerSource.FALLBACK_EXCERPT

        # 7. Persist user and assistant messages
        await self._message_repo.create(
            ChatMessage(session_id=active_session_id, role="user", text=message)
        )
        await self._message_repo.create(
            ChatMessage(
                session_id=active_session_id,
                role="assistant",
                text=answer,
                citations=citations,
                answer_source=answer_source,
            )
        )

        return {
            "session_id": active_session_id,
            "answer": answer,
            "citations": citations,
            "answer_source": answer_source.value,
        }

    async def get_session_messages(self, session_id: str) -> list[dict[str, Any]]:
        """Fetch chat message history for an anonymous session (API-009)."""

        messages = await self._message_repo.list_for_session(session_id)
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "text": msg.text,
                "citations": msg.citations,
                "answer_source": msg.answer_source,
                "created_at": msg.created_at,
            }
            for msg in messages
            if msg.id
        ]

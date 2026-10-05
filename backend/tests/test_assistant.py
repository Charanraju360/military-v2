"""Unit tests for Phase 9: Grounded RAG Assistant Service & API (FEAT-APP-03 / API-008 / API-009 / TC-013 / TC-014 / TC-015)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.clients.embedding_client import EmbeddingClient
from app.clients.llm_client import LLMClient
from app.clients.structured_event_fallback import StructuredEventFallback
from app.main import app
from app.models.domain import AnswerSource, ChatMessage, ChatSession, Event, EventStatus
from app.repositories.chat_message_repository import ChatMessageRepository
from app.repositories.chat_session_repository import ChatSessionRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.event_repository import EventRepository
from app.services.assistant_service import AssistantService


class TestAssistantService(unittest.TestCase):
    """Test suite for RAG assistant retrieval, grounded answering, and fallback modes."""

    def setUp(self) -> None:
        self.mock_session_repo = AsyncMock(spec=ChatSessionRepository)
        self.mock_message_repo = AsyncMock(spec=ChatMessageRepository)
        self.mock_event_repo = AsyncMock(spec=EventRepository)
        self.mock_chroma_repo = AsyncMock(spec=ChromaRepository)
        self.mock_embedding_client = AsyncMock(spec=EmbeddingClient)
        self.mock_llm_client = AsyncMock(spec=LLMClient)
        self.structured_fallback = StructuredEventFallback()

        self.service = AssistantService(
            chat_session_repository=self.mock_session_repo,
            chat_message_repository=self.mock_message_repo,
            event_repository=self.mock_event_repo,
            chroma_repository=self.mock_chroma_repo,
            embedding_client=self.mock_embedding_client,
            llm_client=self.mock_llm_client,
            structured_fallback=self.structured_fallback,
        )
        self.client = TestClient(app)

    def test_no_match_skips_llm(self) -> None:
        """Verify queries with no relevant vector match return no_match and skip LLM (TC-015)."""
        valid_id = "665f1a48ae1f6da2f918b3f0"
        self.mock_session_repo.get.return_value = ChatSession(id=valid_id)
        self.mock_embedding_client.embed_batch.return_value = [[0.1] * 384]

        # Chroma returns empty or high distance (> 1.50)
        self.mock_chroma_repo.query.return_value = {"ids": [[]], "distances": [[]]}

        res = asyncio.run(self.service.chat_message("Unrelated question", session_id=valid_id))

        self.assertEqual(res["answer_source"], "no_match")
        self.assertEqual(res["answer"], "I don't have information on that.")
        self.assertEqual(res["citations"], [])

        # Zero calls made to LLM (TC-015 requirement)
        self.mock_llm_client.generate_grounded_answer.assert_not_called()

    def test_grounded_answer_llm_success(self) -> None:
        """Verify grounded answer with citations when LLM succeeds (TC-013)."""
        valid_id = "665f1a48ae1f6da2f918b3f0"
        self.mock_session_repo.get.return_value = ChatSession(id=valid_id)
        self.mock_embedding_client.embed_batch.return_value = [[0.1] * 384]

        # Chroma returns close match (distance 0.2 <= 1.50)
        self.mock_chroma_repo.query.return_value = {"ids": [[valid_id]], "distances": [[0.2]]}

        fake_event = Event(id=valid_id, summary="Joint naval drill in Baltic Sea", status=EventStatus.SUMMARIZED)
        self.mock_event_repo.list.return_value = [fake_event]

        # LLM succeeds
        self.mock_llm_client.generate_grounded_answer.return_value = (
            "Naval exercises took place in the Baltic Sea.",
            [valid_id],
            AnswerSource.QWEN_PRIMARY,
        )

        res = asyncio.run(self.service.chat_message("Tell me about Baltic drills", session_id=valid_id))

        self.assertEqual(res["answer_source"], "qwen_primary")
        self.assertEqual(res["answer"], "Naval exercises took place in the Baltic Sea.")
        self.assertEqual(res["citations"], [valid_id])

    def test_fallback_excerpt_on_llm_failure(self) -> None:
        """Verify fallback to structured fallback when LLM fails (TC-014)."""
        valid_id = "665f1a48ae1f6da2f918b3f0"
        self.mock_session_repo.get.return_value = ChatSession(id=valid_id)
        self.mock_embedding_client.embed_batch.return_value = [[0.1] * 384]
        self.mock_chroma_repo.query.return_value = {"ids": [[valid_id]], "distances": [[0.2]]}

        fake_event = Event(id=valid_id, summary="Verbatim stored summary of event", status=EventStatus.SUMMARIZED)
        self.mock_event_repo.list.return_value = [fake_event]

        # LLM fails (returns None, [], None)
        self.mock_llm_client.generate_grounded_answer.return_value = (None, [], None)

        res = asyncio.run(self.service.chat_message("Tell me about Baltic drills", session_id=valid_id))

        self.assertEqual(res["answer_source"], "structured_fallback")
        self.assertEqual(res["answer"], "Verbatim stored summary of event")
        self.assertEqual(res["citations"], [valid_id])

    @patch("app.api.assistant.assistant_service.chat_message", new_callable=AsyncMock)
    def test_chat_endpoint_validation(self, mock_chat: AsyncMock) -> None:
        """Verify POST /api/assistant/chat validates message length (API-008)."""
        res_empty = self.client.post("/api/assistant/chat", json={"message": ""})
        self.assertEqual(res_empty.status_code, 422)

        mock_chat.return_value = {
            "session_id": "665f1a48ae1f6da2f918b3f0",
            "answer": "Answer",
            "citations": ["665f1a48ae1f6da2f918b3f0"],
            "answer_source": "qwen_primary",
        }
        res_valid = self.client.post("/api/assistant/chat", json={"message": "Valid query"})
        self.assertEqual(res_valid.status_code, 200)



if __name__ == "__main__":
    unittest.main()

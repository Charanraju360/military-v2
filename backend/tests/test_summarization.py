"""Unit tests for Phase 7: Collective Summarization Service (FEAT-PROC-04 / FR-008 / TC-010 / TC-011)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.clients.llm_client import LLMClient
from app.clients.structured_event_fallback import StructuredEventFallback
from app.models.domain import (
    Article,
    ArticleStatus,
    Category,
    Event,
    EventArticle,
    EventStatus,
    Source,
    SourceType,
    SummarySource,
)
from app.repositories.article_repository import ArticleRepository
from app.repositories.entity_repository import EntityRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository
from app.repositories.source_repository import SourceRepository
from app.services.summarization_service import SummarizationService


class TestSummarizationService(unittest.TestCase):
    """Test suite for collective summarization, LLM provider fallback, and StructuredEventFallback."""

    def setUp(self) -> None:
        self.mock_event_repo = AsyncMock(spec=EventRepository)
        self.mock_event_article_repo = AsyncMock(spec=EventArticleRepository)
        self.mock_article_repo = AsyncMock(spec=ArticleRepository)
        self.mock_entity_repo = AsyncMock(spec=EntityRepository)
        self.mock_entity_repo.list_for_articles.return_value = []
        self.mock_source_repo = AsyncMock(spec=SourceRepository)
        self.mock_llm_client = AsyncMock(spec=LLMClient)
        self.structured_fallback = StructuredEventFallback()

        self.service = SummarizationService(
            event_repository=self.mock_event_repo,
            event_article_repository=self.mock_event_article_repo,
            article_repository=self.mock_article_repo,
            entity_repository=self.mock_entity_repo,
            source_repository=self.mock_source_repo,
            llm_client=self.mock_llm_client,
            structured_fallback=self.structured_fallback,
        )

    def test_structured_fallback_synthesize(self) -> None:
        """Verify StructuredEventFallback produces deterministic collective summary (TC-011)."""
        now = datetime.now(UTC)
        articles = [
            Article(
                id="art1",
                source_id="src1",
                url="http://ex.com/1",
                url_hash="h1",
                title="Air Strike",
                cleaned_text="Missile strike targeted 5 depots in Kyiv.",
                published_at=now,
                category_hint=Category.ATTACK,
            )
        ]
        workspace = self.structured_fallback.build_workspace(
            event_id="evt1",
            articles=articles,
            entities=[],
            sources_by_id={},
        )
        res = self.structured_fallback.synthesize(
            workspace=workspace,
            articles=articles,
            majority_category=Category.ATTACK,
        )
        self.assertTrue(len(res["summary"]) > 0)
        self.assertEqual(res["summary_source"], SummarySource.STRUCTURED_FALLBACK)
        self.assertEqual(res["category"], Category.ATTACK)

    def test_collective_summarization_llm_success(self) -> None:
        """Verify collective summarization concatenates ALL articles and uses LLM (TC-010)."""
        now = datetime.now(UTC)
        clustered_event = Event(id="evt1", status=EventStatus.CLUSTERED, article_count=2)
        self.mock_event_repo.list.return_value = [clustered_event]

        event_articles = [
            EventArticle(event_id="evt1", article_id="art1"),
            EventArticle(event_id="evt1", article_id="art2"),
        ]
        self.mock_event_article_repo.find_for_event.return_value = event_articles

        articles = [
            Article(
                id="art1",
                source_id="src1",
                url="http://ex.com/1",
                url_hash="h1",
                title="Air Strike",
                cleaned_text="Missile strike targeted depot.",
                published_at=now,
                category_hint=Category.ATTACK,
                status=ArticleStatus.PROCESSED,
            ),
            Article(
                id="art2",
                source_id="src1",
                url="http://ex.com/2",
                url_hash="h2",
                title="Second Attack Report",
                cleaned_text="Second missile hit secondary target.",
                published_at=now,
                category_hint=Category.ATTACK,
                status=ArticleStatus.PROCESSED,
            ),
        ]
        self.mock_article_repo.list_by_ids.return_value = articles
        self.mock_source_repo.get.return_value = Source(
            id="src1", name="Defense News", type=SourceType.RSS, url="http://ex.com", trust_rating=80
        )

        # Mock LLM success
        self.mock_llm_client.synthesize_event.return_value = (
            {
                "summary": "A collective summary of two missile strikes.",
                "category": "ATTACK",
                "claims": [],
                "timeline": [],
                "conflicts": [],
                "locations": ["Kyiv"],
                "uncertainty_statements": [],
            },
            SummarySource.QWEN_PRIMARY,
        )
        self.mock_event_repo.update = AsyncMock(return_value=None)

        result = asyncio.run(self.service.summarize_events())

        self.assertEqual(result["phase"], "summarize")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["summarized"], 1)
        self.assertEqual(result["fallback_used"], 0)

        # Verify update call
        self.mock_event_repo.update.assert_called_once()
        call_args = self.mock_event_repo.update.call_args[0]
        self.assertEqual(call_args[0], "evt1")
        changes = call_args[1]
        self.assertEqual(changes["summary"], "A collective summary of two missile strikes.")
        self.assertEqual(changes["summary_source"], "qwen_primary")
        self.assertEqual(changes["category"], "ATTACK")
        self.assertEqual(changes["status"], "summarized")

    def test_collective_summarization_structured_fallback_on_failure(self) -> None:
        """Verify fallback to StructuredEventFallback when LLM fails/times out (TC-011)."""
        now = datetime.now(UTC)
        clustered_event = Event(id="evt2", status=EventStatus.CLUSTERED, article_count=1)
        self.mock_event_repo.list.return_value = [clustered_event]
        self.mock_event_article_repo.find_for_event.return_value = [
            EventArticle(event_id="evt2", article_id="art3")
        ]

        articles = [
            Article(
                id="art3",
                source_id="src2",
                url="http://ex.com/3",
                url_hash="h3",
                title="Naval Exercise",
                cleaned_text="Naval forces completed war games in Baltic Sea.",
                published_at=now,
                category_hint=Category.DRILL,
                status=ArticleStatus.PROCESSED,
            )
        ]
        self.mock_article_repo.list_by_ids.return_value = articles
        self.mock_source_repo.get.return_value = Source(
            id="src2", name="Naval Wire", type=SourceType.RSS, url="http://ex.com", trust_rating=60
        )

        # Mock LLM failure (returns None, None)
        self.mock_llm_client.synthesize_event.return_value = (None, None)
        self.mock_event_repo.update = AsyncMock(return_value=None)

        result = asyncio.run(self.service.summarize_events())

        self.assertEqual(result["phase"], "summarize")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["summarized"], 1)
        self.assertEqual(result["fallback_used"], 1)

        call_args = self.mock_event_repo.update.call_args[0]
        changes = call_args[1]
        self.assertEqual(changes["summary_source"], "structured_fallback")
        self.assertEqual(changes["category"], "DRILL")
        self.assertIn("reports", changes["summary"])


if __name__ == "__main__":
    unittest.main()

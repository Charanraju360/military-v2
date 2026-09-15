"""Unit tests for Phase 7: Collective Summarization Service (FEAT-PROC-04 / FR-008 / TC-010 / TC-011)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.clients.omniroute_client import OmnirouteClient
from app.clients.textrank_fallback import TextRankFallback
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
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository
from app.repositories.source_repository import SourceRepository
from app.services.summarization_service import SummarizationService


class TestSummarizationService(unittest.TestCase):
    """Test suite for collective summarization, Omniroute integration, and TextRank fallback."""

    def setUp(self) -> None:
        self.mock_event_repo = AsyncMock(spec=EventRepository)
        self.mock_event_article_repo = AsyncMock(spec=EventArticleRepository)
        self.mock_article_repo = AsyncMock(spec=ArticleRepository)
        self.mock_source_repo = AsyncMock(spec=SourceRepository)
        self.mock_omniroute_client = AsyncMock(spec=OmnirouteClient)
        self.textrank_fallback = TextRankFallback()

        self.service = SummarizationService(
            event_repository=self.mock_event_repo,
            event_article_repository=self.mock_event_article_repo,
            article_repository=self.mock_article_repo,
            source_repository=self.mock_source_repo,
            omniroute_client=self.mock_omniroute_client,
            textrank_fallback=self.textrank_fallback,
        )

    def test_textrank_fallback_summary(self) -> None:
        """Verify TextRank fallback produces extractive summary <= max_words (TC-011)."""
        text = (
            "Military forces launched an air strike on the enemy stronghold early Thursday morning. "
            "Defense officials confirmed missile systems targeted ammunition depots. "
            "Casualty figures remain unverified as emergency teams operate on site."
        )
        summary = self.textrank_fallback.summarize(text, max_words=120)
        self.assertTrue(len(summary) > 0)
        self.assertLessEqual(len(summary.split()), 120)

    def test_collective_summarization_omniroute_success(self) -> None:
        """Verify collective summarization concatenates ALL articles and uses Omniroute (TC-010)."""
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

        # Mock Omniroute success
        self.mock_omniroute_client.summarize_event.return_value = (
            "A collective summary of two missile strikes.",
            Category.ATTACK,
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
        self.assertEqual(changes["summary_source"], "omniroute")
        self.assertEqual(changes["category"], "ATTACK")
        self.assertEqual(changes["credibility_score"], 80.0)
        self.assertEqual(changes["status"], "summarized")

    def test_collective_summarization_textrank_fallback_on_failure(self) -> None:
        """Verify fallback to TextRank when Omniroute fails/times out (TC-011)."""
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

        # Mock Omniroute failure (returns None, None)
        self.mock_omniroute_client.summarize_event.return_value = (None, None)
        self.mock_event_repo.update = AsyncMock(return_value=None)

        result = asyncio.run(self.service.summarize_events())

        self.assertEqual(result["phase"], "summarize")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["summarized"], 1)
        self.assertEqual(result["fallback_used"], 1)

        call_args = self.mock_event_repo.update.call_args[0]
        changes = call_args[1]
        self.assertEqual(changes["summary_source"], "textrank_fallback")
        self.assertEqual(changes["category"], "DRILL")
        self.assertEqual(changes["credibility_score"], 60.0)


if __name__ == "__main__":
    unittest.main()

"""Unit tests for Phase 4: Military Topic Filter Service (FEAT-PROC-01b)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.clients.omniroute_client import OmnirouteClient
from app.models.domain import Article, ArticleStatus, Category
from app.repositories.article_repository import ArticleRepository
from app.services.topic_filter_service import TopicFilterService


class TestTopicFilterService(unittest.TestCase):
    """Test suite for topic filtering logic, keyword allowlist, and Omniroute fallback."""

    def setUp(self) -> None:
        self.mock_article_repo = AsyncMock(spec=ArticleRepository)
        self.mock_omniroute_client = AsyncMock(spec=OmnirouteClient)
        self.service = TopicFilterService(
            article_repository=self.mock_article_repo,
            omniroute_client=self.mock_omniroute_client,
        )

    def test_keyword_checks(self) -> None:
        """Verify keyword matching maps correctly to documented Categories."""

        self.assertEqual(
            self.service.check_keywords("Joint Naval Exercise", "Naval maneuvers in Baltic Sea"),
            Category.DRILL,
        )
        self.assertEqual(
            self.service.check_keywords("Peace Talks Begin", "Delegates sign ceasefire treaty"),
            Category.PEACE_DEAL,
        )
        self.assertEqual(
            self.service.check_keywords("Air Strike Launched", "Missile attack on depot"),
            Category.ATTACK,
        )
        self.assertEqual(
            self.service.check_keywords("NATO Summit", "Alliance leaders discuss sanctions"),
            Category.GEOPOLITICS,
        )
        self.assertEqual(
            self.service.check_keywords("Security Pact Signed", "Bilateral defense agreement"),
            Category.AGREEMENT,
        )
        self.assertEqual(
            self.service.check_keywords("Army Procurement", "New weapons for infantry"),
            Category.OTHER_MILITARY,
        )
        # Ambiguous case: no keywords match
        self.assertIsNone(
            self.service.check_keywords("Local Gardening Contest", "Tomatoes won first prize")
        )

    def test_filter_articles_execution(self) -> None:
        """Verify filter_articles batch processing and Omniroute fallback on non-military."""

        now = datetime.now(UTC)
        cleaned_articles = [
            Article(
                id="art1",
                source_id="src1",
                url="http://ex.com/1",
                url_hash="h1",
                title="Air Strike in Region",
                cleaned_text="Missile attack reported.",
                published_at=now,
                status=ArticleStatus.CLEANED,
            ),
            Article(
                id="art2",
                source_id="src1",
                url="http://ex.com/2",
                url_hash="h2",
                title="Ambiguous Headline",
                cleaned_text="Unclear details about security.",
                published_at=now,
                status=ArticleStatus.CLEANED,
            ),
            Article(
                id="art3",
                source_id="src1",
                url="http://ex.com/3",
                url_hash="h3",
                title="Baking Competition",
                cleaned_text="Delicious cakes prepared today.",
                published_at=now,
                status=ArticleStatus.CLEANED,
            ),
        ]

        # First call returns the batch, second call returns empty list to break while loop
        self.mock_article_repo.list_by_status.side_effect = [cleaned_articles, []]
        self.mock_article_repo.update = AsyncMock(return_value=None)

        # Omniroute behavior: art2 -> military GEOPOLITICS, art3 -> non-military/failure
        self.mock_omniroute_client.classify_topic.side_effect = [
            (True, Category.GEOPOLITICS),
            (False, None),
        ]

        result = asyncio.run(self.service.filter_articles())

        self.assertEqual(result["phase"], "filter")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["filtered_ok"], 2)  # art1 (keyword) + art2 (omniroute)
        self.assertEqual(result["rejected_offtopic"], 1)  # art3 (rejected)
        self.assertEqual(len(result["errors"]), 0)

        # Verify DB updates called
        self.mock_article_repo.update.assert_any_call(
            "art1", {"status": "filtered_ok", "category_hint": "ATTACK"}
        )
        self.mock_article_repo.update.assert_any_call(
            "art2", {"status": "filtered_ok", "category_hint": "GEOPOLITICS"}
        )
        self.mock_article_repo.update.assert_any_call(
            "art3", {"status": "rejected", "rejection_reason": "off_topic"}
        )


if __name__ == "__main__":
    unittest.main()

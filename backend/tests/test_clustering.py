"""Unit tests for Phase 6: Embedding-Only Clustering Service (FEAT-PROC-03 / FR-007 / TC-009)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.models.domain import Article, ArticleStatus, Event, EventArticle, EventStatus
from app.repositories.article_repository import ArticleRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository
from app.services.clustering_service import ClusteringService


class TestClusteringService(unittest.TestCase):
    """Test suite for embedding-only clustering logic and event persistence."""

    def setUp(self) -> None:
        self.mock_article_repo = AsyncMock(spec=ArticleRepository)
        self.mock_event_repo = AsyncMock(spec=EventRepository)
        self.mock_event_article_repo = AsyncMock(spec=EventArticleRepository)
        self.mock_chroma_repo = AsyncMock(spec=ChromaRepository)

        self.service = ClusteringService(
            article_repository=self.mock_article_repo,
            event_repository=self.mock_event_repo,
            event_article_repository=self.mock_event_article_repo,
            chroma_repository=self.mock_chroma_repo,
        )

    def test_clustering_vector_only_logic(self) -> None:
        """Verify clustering operates ONLY on vector similarity, ignoring text/keywords (TC-009)."""

        article_ids = ["art1", "art2", "art3"]
        # art1 and art2 have very close vectors (cosine similarity ~1.0)
        # art3 has an orthogonal vector
        vec1 = [1.0, 0.0, 0.0] + [0.0] * 381
        vec2 = [0.99, 0.1, 0.0] + [0.0] * 381
        vec3 = [0.0, 0.0, 1.0] + [0.0] * 381

        clusters = self.service.cluster_vectors(article_ids, [vec1, vec2, vec3])

        # art1 and art2 should be in 1 cluster, art3 in a separate singleton cluster
        self.assertEqual(len(clusters), 2)
        cluster_sets = [set(c) for c in clusters]
        self.assertIn({"art1", "art2"}, cluster_sets)
        self.assertIn({"art3"}, cluster_sets)

    def test_cluster_processed_articles(self) -> None:
        """Verify full cluster_processed_articles flow creates Events, centroids, and EventArticles."""
        now = datetime.now(UTC)
        processed_articles = [
            Article(
                id="art1",
                source_id="src1",
                url="http://ex.com/1",
                url_hash="h1",
                title="Air Strike A",
                cleaned_text="Details on strike A",
                published_at=now,
                status=ArticleStatus.PROCESSED,
            ),
            Article(
                id="art2",
                source_id="src1",
                url="http://ex.com/2",
                url_hash="h2",
                title="Air Strike B",
                cleaned_text="Details on strike B",
                published_at=now,
                status=ArticleStatus.PROCESSED,
            ),
            Article(
                id="art3",
                source_id="src1",
                url="http://ex.com/3",
                url_hash="h3",
                title="Naval Exercise C",
                cleaned_text="Details on drill C",
                published_at=now,
                status=ArticleStatus.PROCESSED,
            ),
        ]

        self.mock_article_repo.list_by_status.return_value = processed_articles

        # Mock ChromaDB vector return
        vec1 = [1.0, 0.0] + [0.0] * 382
        vec2 = [0.99, 0.1] + [0.0] * 382
        vec3 = [0.0, 1.0] + [0.0] * 382

        self.mock_chroma_repo.get.return_value = {
            "ids": ["art1", "art2", "art3"],
            "embeddings": [vec1, vec2, vec3],
        }

        # Mock Event creation in DB
        created_event_1 = Event(id="evt1", status=EventStatus.CLUSTERED, article_count=2)
        created_event_2 = Event(id="evt2", status=EventStatus.CLUSTERED, article_count=1)

        self.mock_event_repo.create.side_effect = [created_event_1, created_event_2]
        self.mock_event_repo.update = AsyncMock(return_value=None)
        self.mock_event_article_repo.create = AsyncMock(return_value=None)
        self.mock_chroma_repo.upsert = AsyncMock(return_value=None)

        result = asyncio.run(self.service.cluster_processed_articles())

        self.assertEqual(result["phase"], "cluster")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["events_created"], 2)
        self.assertEqual(result["singleton_events"], 1)

        # Check ChromaDB event_embeddings upsert for centroids
        self.assertEqual(self.mock_chroma_repo.upsert.call_count, 2)
        self.mock_chroma_repo.upsert.assert_any_call(
            name="event_embeddings",
            ids=["evt1"],
            embeddings=[self.mock_chroma_repo.upsert.call_args_list[0][1]["embeddings"][0]],
            metadatas=[{"event_id": "evt1"}],
        )

        # Check EventArticle link creation
        self.assertEqual(self.mock_event_article_repo.create.call_count, 3)


if __name__ == "__main__":
    unittest.main()

"""Unit tests for Phase 5: Batch NER and Embeddings Service (FEAT-PROC-02 / FR-006)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.clients.embedding_client import EmbeddingClient
from app.models.domain import Article, ArticleStatus, Entity
from app.repositories.article_repository import ArticleRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.entity_repository import EntityRepository
from app.services.ner_embedding_service import NerEmbeddingService


class TestNerEmbeddingService(unittest.TestCase):
    """Test suite for batch embedding generation, entity extraction, and ChromaDB vector upserts."""

    def setUp(self) -> None:
        self.mock_article_repo = AsyncMock(spec=ArticleRepository)
        self.mock_entity_repo = AsyncMock(spec=EntityRepository)
        self.mock_chroma_repo = AsyncMock(spec=ChromaRepository)
        self.mock_embedding_client = AsyncMock(spec=EmbeddingClient)

        self.service = NerEmbeddingService(
            article_repository=self.mock_article_repo,
            entity_repository=self.mock_entity_repo,
            chroma_repository=self.mock_chroma_repo,
            embedding_client=self.mock_embedding_client,
        )

    def test_embedding_client_vector_generation(self) -> None:
        """Verify EmbeddingClient generates unit-normalized 384-dim vectors."""
        client = EmbeddingClient(dimension=384)
        vectors = asyncio.run(client.embed_batch(["NATO military exercise", "Peace treaty signed"]))

        self.assertEqual(len(vectors), 2)
        self.assertEqual(len(vectors[0]), 384)
        self.assertEqual(len(vectors[1]), 384)

        import numpy as np
        norm0 = float(np.linalg.norm(vectors[0]))
        self.assertAlmostEqual(norm0, 1.0, places=4)

    def test_entity_extraction(self) -> None:
        """Verify entity extraction classifies ORG, LOCATION, PERSON correctly."""
        text = "NATO announced new sanctions in Kyiv after President Zelensky met with Kremlin officials."
        entities = self.service.extract_entities(text)

        entity_dict = {e[0]: e[1] for e in entities}
        self.assertIn("NATO", entity_dict)
        self.assertEqual(entity_dict["NATO"], "ORG")
        self.assertIn("Kyiv", entity_dict)
        self.assertEqual(entity_dict["Kyiv"], "LOCATION")
        
        # Check that Zelensky is found in entities as PERSON
        zelensky_key = [k for k in entity_dict if "Zelensky" in k][0]
        self.assertEqual(entity_dict[zelensky_key], "PERSON")

    def test_process_filtered_articles_batching(self) -> None:
        """Verify process_filtered_articles extracts entities, upserts vectors, and updates status."""
        now = datetime.now(UTC)
        filtered_articles = [
            Article(
                id="art1",
                source_id="src1",
                url="http://ex.com/1",
                url_hash="h1",
                title="NATO Drill in Baltic Sea",
                cleaned_text="NATO forces conducted naval exercises in the Baltic Sea.",
                published_at=now,
                status=ArticleStatus.FILTERED_OK,
            ),
            Article(
                id="art2",
                source_id="src1",
                url="http://ex.com/2",
                url_hash="h2",
                title="Peace Talks in Geneva",
                cleaned_text="Delegates met in Geneva to discuss a ceasefire pact.",
                published_at=now,
                status=ArticleStatus.FILTERED_OK,
            ),
        ]

        self.mock_article_repo.list_by_status.side_effect = [filtered_articles, []]
        self.mock_article_repo.update = AsyncMock(return_value=None)
        self.mock_entity_repo.create = AsyncMock(return_value=None)
        self.mock_chroma_repo.upsert = AsyncMock(return_value=None)

        fake_vectors = [[0.1] * 384, [0.2] * 384]
        self.mock_embedding_client.embed_batch.return_value = fake_vectors

        result = asyncio.run(self.service.process_filtered_articles(batch_size=20))

        self.assertEqual(result["phase"], "embed")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["processed"], 2)
        self.assertEqual(result["failed"], 0)

        self.mock_chroma_repo.upsert.assert_called_once_with(
            name="article_embeddings",
            ids=["art1", "art2"],
            embeddings=fake_vectors,
            metadatas=[{"article_id": "art1"}, {"article_id": "art2"}],
        )

        self.mock_article_repo.update.assert_any_call("art1", {"status": "processed"})
        self.mock_article_repo.update.assert_any_call("art2", {"status": "processed"})


if __name__ == "__main__":
    unittest.main()

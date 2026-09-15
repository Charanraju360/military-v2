"""Batch NER and embedding processing service implementing FEAT-PROC-02 (Phase 5)."""

from __future__ import annotations

from collections import Counter
import logging
import re
from typing import Any

from app.clients.embedding_client import EmbeddingClient
from app.models.domain import ArticleStatus, Entity
from app.repositories.article_repository import ArticleRepository
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.entity_repository import EntityRepository

logger = logging.getLogger(__name__)

# Known military/geopolitical entity mappings for fast, reliable NER classification
KNOWN_ORGS = {
    "nato", "kremlin", "pentagon", "un", "united nations", "us navy", "us army",
    "us air force", "pla", "idf", "hamas", "hezbollah", "eu", "european union",
    "ministry of defense", "department of defense", "armed forces", "wagner group"
}

KNOWN_LOCATIONS = {
    "ukraine", "russia", "kyiv", "kiev", "moscow", "gaza", "israel", "red sea",
    "black sea", "taiwan", "china", "united states", "us", "usa", "beijing",
    "tehran", "iran", "syria", "lebanon", "poland", "baltic sea", "crimea",
    "donbas", "kharkiv", "odesa", "washington"
}

KNOWN_PERSONS = {
    "zelensky", "zelenskyy", "putin", "biden", "joe biden", "blinken", "netanyahu",
    "shoigu", "austin", "lloyd austin", "macron", "scholz", "jinping", "xi jinping"
}


class NerEmbeddingService:
    """Extract entities and generate vector embeddings for filtered articles in batches."""

    def __init__(
        self,
        article_repository: ArticleRepository | None = None,
        entity_repository: EntityRepository | None = None,
        chroma_repository: ChromaRepository | None = None,
        embedding_client: EmbeddingClient | None = None,
    ) -> None:
        self._article_repository = article_repository or ArticleRepository()
        self._entity_repository = entity_repository or EntityRepository()
        self._chroma_repository = chroma_repository or ChromaRepository()
        self._embedding_client = embedding_client or EmbeddingClient()

    def extract_entities(self, text: str) -> list[tuple[str, str, int]]:
        """Extract named entities from article text and return [(text, type, mention_count)]."""
        if not text:
            return []

        # Find potential proper noun candidates (capitalized phrases/words)
        words = re.findall(r"\b[A-Z][a-zA-Z0-9\.\-']*(?:\s+[A-Z][a-zA-Z0-9\.\-']*)*\b", text)
        filtered_words = [w for w in words if len(w) > 1 and w.lower() not in {"the", "a", "an", "and", "or", "in", "on", "at", "for"}]
        counts = Counter(filtered_words)

        entities: list[tuple[str, str, int]] = []
        for ent_text, count in counts.most_common(15):
            ent_lower = ent_text.lower()
            if any(org in ent_lower for org in KNOWN_ORGS):
                ent_type = "ORG"
            elif any(loc in ent_lower for loc in KNOWN_LOCATIONS):
                ent_type = "LOCATION"
            elif any(person in ent_lower for person in KNOWN_PERSONS):
                ent_type = "PERSON"
            elif ent_text.isupper() and len(ent_text) >= 2:
                ent_type = "ORG"
            elif len(ent_text.split()) >= 2:
                ent_type = "MISC"
            else:
                ent_type = "LOCATION"

            entities.append((ent_text, ent_type, count))

        return entities

    async def process_filtered_articles(self, *, batch_size: int = 20) -> dict[str, Any]:
        """Process filtered articles in batches: extract entities, generate embeddings, store vectors."""

        processed = 0
        failed = 0
        errors: list[str] = []

        try:
            filtered_articles = await self._article_repository.list_by_status(
                ArticleStatus.FILTERED_OK, batch_size=batch_size
            )

            while filtered_articles:
                batch_texts: list[str] = []
                valid_articles = [a for a in filtered_articles if a.id]

                for article in valid_articles:
                    full_text = f"{article.title}\n{article.cleaned_text or ''}"
                    batch_texts.append(full_text)

                if valid_articles:
                    try:
                        # 1. Batch embedding generation
                        vectors = await self._embedding_client.embed_batch(batch_texts)

                        # 2. Batch vector upsert into ChromaDB article_embeddings
                        article_ids = [a.id for a in valid_articles if a.id]
                        metadatas = [{"article_id": a.id} for a in valid_articles if a.id]

                        await self._chroma_repository.upsert(
                            name="article_embeddings",
                            ids=article_ids,
                            embeddings=vectors,
                            metadatas=metadatas,
                        )

                        # 3. Entity extraction and persistence for each article
                        for article in valid_articles:
                            if not article.id:
                                continue
                            try:
                                full_text = f"{article.title}\n{article.cleaned_text or ''}"
                                entity_tuples = self.extract_entities(full_text)

                                for ent_text, ent_type, mention_count in entity_tuples:
                                    await self._entity_repository.create(
                                        Entity(
                                            article_id=article.id,
                                            text=ent_text,
                                            type=ent_type,
                                            mention_count=mention_count,
                                        )
                                    )

                                # Update article status to PROCESSED
                                await self._article_repository.update(
                                    article.id, {"status": ArticleStatus.PROCESSED.value}
                                )
                                processed += 1

                            except Exception as art_error:
                                logger.exception("Error processing article %s", article.id)
                                await self._article_repository.update(
                                    article.id,
                                    {
                                        "status": ArticleStatus.FAILED.value,
                                        "rejection_reason": f"embed_error: {art_error}",
                                    },
                                )
                                failed += 1
                                errors.append(f"Article {article.id}: {art_error}")

                    except Exception as batch_error:
                        logger.exception("Error during batch embedding generation or vector upsert")
                        for article in valid_articles:
                            if article.id:
                                await self._article_repository.update(
                                    article.id,
                                    {
                                        "status": ArticleStatus.FAILED.value,
                                        "rejection_reason": f"batch_embed_error: {batch_error}",
                                    },
                                )
                                failed += 1
                        errors.append(f"Batch processing error: {batch_error}")

                # Fetch next batch
                filtered_articles = await self._article_repository.list_by_status(
                    ArticleStatus.FILTERED_OK, batch_size=batch_size
                )

        except Exception as error:
            logger.exception("Error during NER and embedding phase execution")
            errors.append(str(error))

        return {
            "phase": "embed",
            "status": "done" if not errors else "done_with_errors",
            "processed": processed,
            "failed": failed,
            "errors": errors,
        }

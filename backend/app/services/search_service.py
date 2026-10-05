"""Search service implementing keyword and semantic search for API-007 (Phase 8)."""

from __future__ import annotations

import logging
from typing import Any

from app.clients.embedding_client import EmbeddingClient
from app.models.domain import EventStatus
from app.repositories.base import _as_object_id
from app.repositories.chroma_repository import ChromaRepository
from app.repositories.event_repository import EventRepository

logger = logging.getLogger(__name__)


class SearchService:
    """Perform keyword and semantic vector searches over events."""

    def __init__(
        self,
        event_repository: EventRepository | None = None,
        chroma_repository: ChromaRepository | None = None,
        embedding_client: EmbeddingClient | None = None,
    ) -> None:
        self._event_repository = event_repository or EventRepository()
        self._chroma_repository = chroma_repository or ChromaRepository()
        self._embedding_client = embedding_client or EmbeddingClient()

    async def search_events(
        self,
        query: str,
        *,
        mode: str = "semantic",
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        """Search events by keyword or semantic vector similarity (API-007)."""

        clean_query = query.strip()
        if not clean_query:
            return {"items": [], "total": 0}

        if mode == "keyword":
            regex_pattern = {"$regex": clean_query, "$options": "i"}
            db_query = {"status": EventStatus.SUMMARIZED.value, "summary": regex_pattern}
            events = await self._event_repository.list(
                db_query, page=page, page_size=page_size
            )
            total = await self._event_repository.count(db_query)

            items = [
                {
                    "id": evt.id,
                    "summary": evt.summary,
                    "category": evt.category,
                    "article_count": evt.article_count,
                    "latest_article_at": evt.latest_article_at,
                    "relevance_score": 1.0,
                }
                for evt in events
                if evt.id
            ]
            return {"items": items, "total": total}

        else:
            vectors = await self._embedding_client.embed_batch([clean_query])
            query_vector = vectors[0] if vectors else [0.0] * 384

            chroma_res = await self._chroma_repository.query(
                "event_embeddings",
                query_embedding=query_vector,
                limit=page_size * 5,
            )

            ids = chroma_res.get("ids", [[]])[0]
            distances = (
                chroma_res.get("distances", [[]])[0]
                if "distances" in chroma_res and chroma_res["distances"]
                else [0.0] * len(ids)
            )

            if not ids:
                return {"items": [], "total": 0}

            score_map: dict[str, float] = {}
            for eid, dist in zip(ids, distances):
                rel_score = max(0.0, round(1.0 - (float(dist) / 2.0), 3))
                score_map[eid] = rel_score

            object_ids = [oid for eid in ids if (oid := _as_object_id(eid))]
            if not object_ids:
                return {"items": [], "total": 0}

            all_events = await self._event_repository.list({"_id": {"$in": object_ids}})

            event_items: list[dict[str, Any]] = []
            for evt in all_events:
                if not evt.id:
                    continue
                score = score_map.get(evt.id, 0.5)
                event_items.append(
                    {
                        "id": evt.id,
                        "summary": evt.summary,
                        "category": evt.category,
                        "article_count": evt.article_count,
                        "latest_article_at": evt.latest_article_at,
                        "relevance_score": score,
                    }
                )

            event_items.sort(key=lambda x: x["relevance_score"], reverse=True)

            start_idx = (page - 1) * page_size
            paged_items = event_items[start_idx : start_idx + page_size]

            return {"items": paged_items, "total": len(event_items)}

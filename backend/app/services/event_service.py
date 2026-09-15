"""Event read service implementing API-005 and API-006 (Phase 8)."""

from __future__ import annotations

import asyncio
from datetime import datetime
import logging
from typing import Any

from app.models.domain import Category, EventStatus
from app.repositories.article_repository import ArticleRepository
from app.repositories.entity_repository import EntityRepository
from app.repositories.event_article_repository import EventArticleRepository
from app.repositories.event_repository import EventRepository
from app.repositories.source_repository import SourceRepository

logger = logging.getLogger(__name__)


class EventService:
    """Read-only service for event lists and event details."""

    def __init__(
        self,
        event_repository: EventRepository | None = None,
        event_article_repository: EventArticleRepository | None = None,
        article_repository: ArticleRepository | None = None,
        entity_repository: EntityRepository | None = None,
        source_repository: SourceRepository | None = None,
    ) -> None:
        self._event_repository = event_repository or EventRepository()
        self._event_article_repository = event_article_repository or EventArticleRepository()
        self._article_repository = article_repository or ArticleRepository()
        self._entity_repository = entity_repository or EntityRepository()
        self._source_repository = source_repository or SourceRepository()

    async def list_events(
        self,
        *,
        category: Category | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        min_credibility: float | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        """List paginated summarized events with optional filters (API-005)."""

        items = await self._event_repository.list_filtered(
            category=category,
            date_from=date_from,
            date_to=date_to,
            min_credibility=min_credibility,
            page=page,
            page_size=page_size,
        )

        query: dict[str, Any] = {"status": EventStatus.SUMMARIZED.value}
        if category is not None:
            query["category"] = category.value
        if date_from is not None or date_to is not None:
            date_range: dict[str, datetime] = {}
            if date_from is not None:
                date_range["$gte"] = date_from
            if date_to is not None:
                date_range["$lte"] = date_to
            query["latest_article_at"] = date_range
        if min_credibility is not None:
            query["credibility_score"] = {"$gte": min_credibility}

        total = await self._event_repository.count(query)

        event_items = [
            {
                "id": evt.id,
                "category": evt.category,
                "summary": evt.summary,
                "summary_source": evt.summary_source,
                "credibility_score": evt.credibility_score,
                "article_count": evt.article_count,
                "first_article_at": evt.first_article_at,
                "latest_article_at": evt.latest_article_at,
            }
            for evt in items
            if evt.id
        ]

        return {"items": event_items, "page": page, "total": total}

    async def get_event_detail(self, event_id: str) -> dict[str, Any] | None:
        """Fetch detailed representation of a summarized event with member articles and entities (API-006)."""

        event = await self._event_repository.get(event_id)
        if not event:
            return None

        event_articles = await self._event_article_repository.find_for_event(event_id)
        article_ids = [ea.article_id for ea in event_articles]

        articles_data: list[dict[str, Any]] = []
        all_entities: dict[tuple[str, str], int] = {}

        if article_ids:
            articles = await self._article_repository.list_by_ids(article_ids)
            articles.sort(key=lambda a: a.published_at, reverse=True)

            valid_art_ids = [art.id for art in articles if art.id]
            unique_source_ids = list({art.source_id for art in articles if art.source_id})

            sources_results = await asyncio.gather(
                *[self._source_repository.get(sid) for sid in unique_source_ids]
            )
            sources_map = {
                sid: src.name
                for sid, src in zip(unique_source_ids, sources_results)
                if src
            }

            entities = await self._entity_repository.list_for_articles(valid_art_ids)
            for ent in entities:
                key = (ent.text, ent.type)
                all_entities[key] = all_entities.get(key, 0) + ent.mention_count

            for art in articles:
                if not art.id:
                    continue
                source_name = sources_map.get(art.source_id, "Unknown Source") if art.source_id else "Unknown Source"

                articles_data.append(
                    {
                        "id": art.id,
                        "title": art.title,
                        "source": source_name,
                        "url": art.url,
                        "published_at": art.published_at,
                    }
                )

        entities_data = [
            {"text": text, "type": ent_type}
            for (text, ent_type), _ in sorted(all_entities.items(), key=lambda x: x[1], reverse=True)
        ]

        return {
            "id": event.id,
            "summary": event.summary,
            "summary_source": event.summary_source,
            "category": event.category,
            "credibility_score": event.credibility_score,
            "article_count": event.article_count,
            "first_article_at": event.first_article_at,
            "latest_article_at": event.latest_article_at,
            "articles": articles_data,
            "entities": entities_data,
        }

"""Typed CRUD and indexed event queries for the `events` collection."""

from datetime import datetime

from pymongo import DESCENDING

from app.models.domain import Category, Event
from app.repositories.base import MongoRepository


class EventRepository(MongoRepository[Event]):
    collection_name = "events"
    model_type = Event

    async def list_filtered(
        self,
        *,
        category: Category | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> list[Event]:
        from app.models.domain import EventStatus
        query: dict[str, object] = {"status": EventStatus.SUMMARIZED.value}
        if category is not None:
            query["category"] = category.value
        if date_from is not None or date_to is not None:
            date_range: dict[str, datetime] = {}
            if date_from is not None:
                date_range["$gte"] = date_from
            if date_to is not None:
                date_range["$lte"] = date_to
            query["latest_article_at"] = date_range
        return await self.list(query, page=page, page_size=page_size, sort=[("latest_article_at", DESCENDING)])

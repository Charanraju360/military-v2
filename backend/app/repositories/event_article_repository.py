"""Typed CRUD for the `event_articles` collection."""

from app.models.domain import EventArticle
from app.repositories.base import MongoRepository


class EventArticleRepository(MongoRepository[EventArticle]):
    collection_name = "event_articles"
    model_type = EventArticle

    async def find_for_event(self, event_id: str) -> list[EventArticle]:
        return await self.list({"event_id": event_id})

    async def find_for_article(self, article_id: str) -> EventArticle | None:
        return self._to_model(await self.collection.find_one({"article_id": article_id}))

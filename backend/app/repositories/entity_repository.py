"""Typed CRUD for the `entities` collection."""

from app.models.domain import Entity
from app.repositories.base import MongoRepository, _as_object_id


class EntityRepository(MongoRepository[Entity]):
    collection_name = "entities"
    model_type = Entity

    async def list_for_article(self, article_id: str) -> list[Entity]:
        object_id = _as_object_id(article_id)
        return [] if object_id is None else await self.list({"article_id": str(object_id)})

    async def list_for_articles(self, article_ids: list[str]) -> list[Entity]:
        valid_ids = [str(_as_object_id(aid)) for aid in article_ids if _as_object_id(aid) is not None]
        if not valid_ids:
            return []
        return await self.list({"article_id": {"$in": valid_ids}})

"""Typed CRUD and documented queries for the `articles` collection."""

from collections.abc import Iterable

from app.models.domain import Article, ArticleStatus
from app.repositories.base import MongoRepository


class ArticleRepository(MongoRepository[Article]):
    collection_name = "articles"
    model_type = Article

    async def find_by_url_hash(self, url_hash: str) -> Article | None:
        return self._to_model(await self.collection.find_one({"url_hash": url_hash}))

    async def list_by_status(self, status: ArticleStatus, *, batch_size: int = 100) -> list[Article]:
        return await self.list({"status": status.value}, page_size=batch_size)

    async def list_by_ids(self, article_ids: Iterable[str]) -> list[Article]:
        object_ids = [object_id for value in article_ids if (object_id := self._object_id(value))]
        return await self.list({"_id": {"$in": object_ids}}, page_size=max(len(object_ids), 1))

    @staticmethod
    def _object_id(value: str):
        from app.repositories.base import _as_object_id

        return _as_object_id(value)

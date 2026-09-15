"""Typed CRUD for the `sources` collection."""

from app.models.domain import Source
from app.repositories.base import MongoRepository


class SourceRepository(MongoRepository[Source]):
    collection_name = "sources"
    model_type = Source

    async def find_by_url(self, url: str) -> Source | None:
        return self._to_model(await self.collection.find_one({"url": url}))

    async def list_active(self) -> list[Source]:
        cursor = self.collection.find({"active": True})
        return [self.model_type.model_validate(self._serialize(row)) async for row in cursor]

    @staticmethod
    def _serialize(document):
        from app.repositories.base import _serialize_document

        return _serialize_document(document)

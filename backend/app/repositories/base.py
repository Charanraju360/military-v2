"""Typed MongoDB CRUD primitives used by collection repositories."""

from __future__ import annotations

from typing import Any, Generic, Mapping, Sequence, TypeVar

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ASCENDING

from app.models.domain import CollectionModel
from app.repositories.database import DatabaseConnections, connections


ModelT = TypeVar("ModelT", bound=CollectionModel)


def _as_object_id(value: str) -> ObjectId | None:
    """Convert a public string identifier to an ObjectId when valid."""

    return ObjectId(value) if ObjectId.is_valid(value) else None


def _serialize_document(document: Mapping[str, Any]) -> dict[str, Any]:
    """Convert a MongoDB record into values accepted by collection models."""

    serialized = dict(document)
    if isinstance(serialized.get("_id"), ObjectId):
        serialized["_id"] = str(serialized["_id"])
    return serialized


class MongoRepository(Generic[ModelT]):
    """Common typed CRUD for a single documented MongoDB collection."""

    collection_name: str
    model_type: type[ModelT]

    def __init__(self, database_connections: DatabaseConnections = connections) -> None:
        self._connections = database_connections

    @property
    def collection(self) -> AsyncIOMotorCollection:
        return self._connections.mongo_database[self.collection_name]

    def _to_model(self, document: Mapping[str, Any] | None) -> ModelT | None:
        return self.model_type.model_validate(_serialize_document(document)) if document else None

    async def create(self, item: ModelT) -> ModelT:
        """Insert one typed document and return it with its MongoDB identifier."""

        document = item.model_dump(by_alias=True, exclude_none=True)
        if "_id" in document:
            object_id = _as_object_id(document["_id"])
            if object_id is None:
                document.pop("_id")
            else:
                document["_id"] = object_id
        result = await self.collection.insert_one(document)
        document["_id"] = result.inserted_id
        return self.model_type.model_validate(_serialize_document(document))

    async def get(self, item_id: str) -> ModelT | None:
        """Fetch one document by its public identifier."""

        object_id = _as_object_id(item_id)
        if object_id is None:
            return None
        return self._to_model(await self.collection.find_one({"_id": object_id}))

    async def list(
        self,
        query: Mapping[str, Any] | None = None,
        *,
        page: int = 1,
        page_size: int = 20,
        sort: Sequence[tuple[str, int]] | None = None,
    ) -> list[ModelT]:
        """List a page of typed documents using a database query."""

        cursor = self.collection.find(dict(query or {}))
        cursor = cursor.sort(list(sort or [("_id", ASCENDING)]))
        cursor = cursor.skip(max(page - 1, 0) * page_size).limit(page_size)
        return [self.model_type.model_validate(_serialize_document(row)) async for row in cursor]

    async def count(self, query: Mapping[str, Any] | None = None) -> int:
        """Return the database count for a query."""

        return await self.collection.count_documents(dict(query or {}))

    async def update(self, item_id: str, changes: Mapping[str, Any]) -> ModelT | None:
        """Apply typed field changes and return the resulting document."""

        object_id = _as_object_id(item_id)
        if object_id is None:
            return None
        await self.collection.update_one({"_id": object_id}, {"$set": dict(changes)})
        return await self.get(item_id)

    async def delete(self, item_id: str) -> bool:
        """Delete one document by identifier."""

        object_id = _as_object_id(item_id)
        if object_id is None:
            return False
        result = await self.collection.delete_one({"_id": object_id})
        return result.deleted_count == 1

    async def delete_many(self, query: Mapping[str, Any] | None = None) -> int:
        """Delete documents matching a repository-level data cleanup query."""

        result = await self.collection.delete_many(dict(query or {}))
        return result.deleted_count

"""Async-friendly typed CRUD for the documented ChromaDB embedding collections."""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from typing import Any, Literal

from chromadb.api.models.Collection import Collection

from app.repositories.database import DatabaseConnections, connections


EmbeddingCollectionName = Literal["article_embeddings", "event_embeddings"]


class ChromaRepository:
    """Provide indexed vector-store operations without embedding business rules."""

    def __init__(self, database_connections: DatabaseConnections = connections) -> None:
        self._connections = database_connections

    def _collection(self, name: EmbeddingCollectionName) -> Collection:
        return self._connections.chroma_client.get_or_create_collection(name=name)

    async def upsert(
        self,
        name: EmbeddingCollectionName,
        *,
        ids: Sequence[str],
        embeddings: Sequence[Sequence[float]],
        documents: Sequence[str] | None = None,
        metadatas: Sequence[dict[str, Any]] | None = None,
    ) -> None:
        """Upsert a batch of embeddings using ChromaDB's indexed collection."""

        await asyncio.to_thread(
            self._collection(name).upsert,
            ids=list(ids),
            embeddings=[list(vector) for vector in embeddings],
            documents=list(documents) if documents is not None else None,
            metadatas=list(metadatas) if metadatas is not None else None,
        )

    async def query(
        self,
        name: EmbeddingCollectionName,
        *,
        query_embedding: Sequence[float],
        limit: int,
    ) -> dict[str, Any]:
        """Perform an indexed nearest-neighbor query for the supplied vector."""

        return await asyncio.to_thread(
            self._collection(name).query,
            query_embeddings=[list(query_embedding)],
            n_results=limit,
        )

    async def get(self, name: EmbeddingCollectionName, ids: Sequence[str]) -> dict[str, Any]:
        """Get vectors by identifier."""

        return await asyncio.to_thread(self._collection(name).get, ids=list(ids), include=["embeddings", "documents", "metadatas"])

    async def delete(self, name: EmbeddingCollectionName, ids: Sequence[str]) -> None:
        """Delete vectors by identifier."""

        await asyncio.to_thread(self._collection(name).delete, ids=list(ids))

    async def clear(self, name: EmbeddingCollectionName) -> None:
        """Remove a documented embedding collection and all of its vectors."""

        def delete_if_present() -> None:
            client = self._connections.chroma_client
            collection_names = client.list_collections()
            names = {item if isinstance(item, str) else item.name for item in collection_names}
            if name in names:
                client.delete_collection(name=name)

        await asyncio.to_thread(delete_if_present)

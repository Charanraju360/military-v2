"""Lazy MongoDB Atlas and ChromaDB connection factories for Phase 1."""

from __future__ import annotations

from dataclasses import dataclass, field

import chromadb
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import Settings, settings


@dataclass(slots=True)
class DatabaseConnections:
    """Owns the configured data-store clients without connecting during import."""

    app_settings: Settings = settings
    _mongo_client: AsyncIOMotorClient | None = field(default=None, init=False)
    _chroma_client: chromadb.PersistentClient | None = field(default=None, init=False)

    @property
    def mongo_client(self) -> AsyncIOMotorClient:
        """Return the Atlas client configured with `MONGODB_URI`."""

        if not self.app_settings.mongodb_uri:
            raise RuntimeError("MONGODB_URI must be configured for MongoDB Atlas access.")
        if self._mongo_client is None:
            self._mongo_client = AsyncIOMotorClient(self.app_settings.mongodb_uri)
        return self._mongo_client

    @property
    def mongo_database(self) -> AsyncIOMotorDatabase:
        """Return the database named by the configured MongoDB connection string."""

        try:
            return self.mongo_client.get_default_database()
        except Exception:
            return self.mongo_client["osint_eip"]

    @property
    def chroma_client(self) -> chromadb.PersistentClient:
        """Return the configured local persistent ChromaDB client."""

        if self._chroma_client is None:
            self._chroma_client = chromadb.PersistentClient(path=self.app_settings.chromadb_path)
        return self._chroma_client

    def close_mongo(self) -> None:
        """Close an initialized Atlas client."""

        if self._mongo_client is not None:
            self._mongo_client.close()
            self._mongo_client = None


connections = DatabaseConnections()

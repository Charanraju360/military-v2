"""MongoDB indexes defined exclusively by docs/06-database-design.md §6."""

from pymongo import ASCENDING, DESCENDING, TEXT

from app.repositories.database import DatabaseConnections, connections


class IndexManager:
    """Creates the documented Atlas indexes on demand."""

    def __init__(self, database_connections: DatabaseConnections = connections) -> None:
        self._connections = database_connections

    async def ensure_indexes(self) -> None:
        """Create every index from docs/06-database-design.md §6."""

        database = self._connections.mongo_database
        await database.articles.create_index([("url_hash", ASCENDING)], unique=True)
        await database.articles.create_index([("status", ASCENDING)])
        await database.articles.create_index([("published_at", DESCENDING)])
        await database.event_articles.create_index([("article_id", ASCENDING)], unique=True)
        await database.event_articles.create_index([("event_id", ASCENDING)])
        await database.events.create_index([("category", ASCENDING), ("latest_article_at", DESCENDING)])
        await database.events.create_index([("summary", TEXT)])
        await database.chat_messages.create_index([("session_id", ASCENDING)])

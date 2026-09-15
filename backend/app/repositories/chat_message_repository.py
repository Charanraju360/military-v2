"""Typed CRUD for the `chat_messages` collection."""

from app.models.domain import ChatMessage
from app.repositories.base import MongoRepository


class ChatMessageRepository(MongoRepository[ChatMessage]):
    collection_name = "chat_messages"
    model_type = ChatMessage

    async def list_for_session(self, session_id: str) -> list[ChatMessage]:
        return await self.list({"session_id": session_id})

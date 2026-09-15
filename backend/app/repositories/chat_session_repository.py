"""Typed CRUD for anonymous `chat_sessions`."""

from app.models.domain import ChatSession
from app.repositories.base import MongoRepository


class ChatSessionRepository(MongoRepository[ChatSession]):
    collection_name = "chat_sessions"
    model_type = ChatSession

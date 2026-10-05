"""Collection models defined by docs/06-database-design.md.

These models are schema-only in Phase 0; no persistence behavior is defined here.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def utc_now() -> datetime:
    """Create a UTC timestamp for documented collection timestamp defaults."""

    return datetime.now(UTC)


class CollectionModel(BaseModel):
    """Common MongoDB identifier mapping without database behavior."""

    model_config = ConfigDict(populate_by_name=True)
    id: str | None = Field(default=None, alias="_id")


class SourceType(StrEnum):
    RSS = "rss"
    API = "api"
    SCRAPE = "scrape"


class Category(StrEnum):
    ATTACK = "ATTACK"
    GEOPOLITICS = "GEOPOLITICS"
    PEACE_DEAL = "PEACE_DEAL"
    AGREEMENT = "AGREEMENT"
    DRILL = "DRILL"
    OTHER_MILITARY = "OTHER_MILITARY"


class ArticleStatus(StrEnum):
    INGESTED = "ingested"
    CLEANED = "cleaned"
    FILTERED_OK = "filtered_ok"
    REJECTED = "rejected"
    PROCESSED = "processed"
    FAILED = "failed"


class EventStatus(StrEnum):
    CLUSTERED = "clustered"
    SUMMARIZED = "summarized"


class SummarySource(StrEnum):
    QWEN_PRIMARY = "qwen_primary"
    OPENROUTER_SECONDARY = "openrouter_secondary"
    STRUCTURED_FALLBACK = "structured_fallback"


class AnswerSource(StrEnum):
    QWEN_PRIMARY = "qwen_primary"
    OPENROUTER_SECONDARY = "openrouter_secondary"
    STRUCTURED_FALLBACK = "structured_fallback"
    NO_MATCH = "no_match"


class PipelineOverallStatus(StrEnum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Source(CollectionModel):
    """Schema for the `sources` collection."""

    name: str
    type: SourceType
    url: str
    trust_rating: int = Field(default=50, ge=0, le=100)
    active: bool = True
    field_mapping: dict[str, str] | None = None
    link_selector: str | None = None
    content_selector: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Article(CollectionModel):
    """Schema for the `articles` collection."""

    source_id: str
    url: str
    url_hash: str
    title: str
    raw_text: str | None = None
    cleaned_text: str | None = None
    published_at: datetime
    category_hint: Category | None = None
    status: ArticleStatus = ArticleStatus.INGESTED
    rejection_reason: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Entity(CollectionModel):
    """Schema for the documented `entities` fields."""

    article_id: str
    text: str
    type: str
    mention_count: int


class Event(CollectionModel):
    """Schema for the `events` collection."""

    summary: str | None = None
    summary_source: SummarySource | None = None
    category: Category | None = None
    claims: list[dict[str, Any]] = Field(default_factory=list)
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    source_refs: list[dict[str, Any]] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    uncertainty_statements: list[str] = Field(default_factory=list)
    hybrid_cluster_metadata: dict[str, Any] = Field(default_factory=dict)
    article_count: int = Field(default=0, ge=0)
    status: EventStatus = EventStatus.CLUSTERED
    centroid_embedding_id: str | None = None
    first_article_at: datetime | None = None
    latest_article_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @field_validator("claims", "timeline", "conflicts", "source_refs", mode="before")
    @classmethod
    def _coerce_dict_list(cls, value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        coerced: list[dict[str, Any]] = []
        for i, item in enumerate(value):
            if isinstance(item, dict):
                coerced.append(item)
            elif isinstance(item, str):
                coerced.append({"claim_id": f"claim:{i}", "text": item, "aspect": "statement", "value": item})
        return coerced


class EventArticle(CollectionModel):
    """Schema for the `event_articles` collection."""

    event_id: str
    article_id: str


class ChatSession(CollectionModel):
    """Schema for an anonymous `chat_sessions` record."""


class ChatMessage(CollectionModel):
    """Schema for the documented `chat_messages` fields and API representation."""

    session_id: str
    role: str
    text: str
    citations: list[str] = Field(default_factory=list)
    answer_source: AnswerSource | None = None
    created_at: datetime = Field(default_factory=utc_now)



class PipelineLog(CollectionModel):
    """Schema for the `pipeline_logs` collection."""

    started_at: datetime
    completed_at: datetime | None = None
    overall_status: PipelineOverallStatus
    phases: list[dict[str, Any]] = Field(default_factory=list)


class PipelineStatus(CollectionModel):
    """Schema for the singleton `pipeline_status` collection."""

    running: bool
    current_run_id: str | None = None
    current_phase: str | None = None

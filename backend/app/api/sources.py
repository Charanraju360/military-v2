"""Source router implementing API-010 through API-013 (Phase 8)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.models.domain import Source, SourceType
from app.repositories.source_repository import SourceRepository

router = APIRouter(tags=["sources"])
source_repository = SourceRepository()


class CreateSourcePayload(BaseModel):
    name: str = Field(..., min_length=1)
    type: SourceType
    url: str = Field(..., min_length=1)
    trust_rating: int = Field(default=50, ge=0, le=100)
    field_mapping: dict[str, str] | None = None
    link_selector: str | None = None
    content_selector: str | None = None


class UpdateSourcePayload(BaseModel):
    name: str | None = None
    type: SourceType | None = None
    url: str | None = None
    trust_rating: int | None = Field(default=None, ge=0, le=100)
    active: bool | None = None
    field_mapping: dict[str, str] | None = None
    link_selector: str | None = None
    content_selector: str | None = None


@router.get("/sources")
async def list_sources() -> list[dict[str, Any]]:
    """List all configured news sources (API-010)."""

    sources = await source_repository.list(page_size=500)
    return [
        {
            "id": src.id,
            "name": src.name,
            "type": src.type,
            "url": src.url,
            "trust_rating": src.trust_rating,
            "active": src.active,
            "field_mapping": src.field_mapping,
            "link_selector": src.link_selector,
            "content_selector": src.content_selector,
            "created_at": src.created_at,
        }
        for src in sources
        if src.id
    ]


@router.post("/sources", status_code=status.HTTP_201_CREATED)
async def create_source(payload: CreateSourcePayload) -> dict[str, Any]:
    """Create a new news source (API-011)."""

    existing = await source_repository.find_by_url(payload.url)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Source URL already exists",
        )

    new_source = Source(
        name=payload.name,
        type=payload.type,
        url=payload.url,
        trust_rating=payload.trust_rating,
        field_mapping=payload.field_mapping,
        link_selector=payload.link_selector,
        content_selector=payload.content_selector,
    )
    created = await source_repository.create(new_source)
    return {
        "id": created.id,
        "name": created.name,
        "type": created.type,
        "url": created.url,
        "trust_rating": created.trust_rating,
        "active": created.active,
        "field_mapping": created.field_mapping,
        "link_selector": created.link_selector,
        "content_selector": created.content_selector,
        "created_at": created.created_at,
    }


@router.patch("/sources/{source_id}")
async def update_source(source_id: str, payload: UpdateSourcePayload) -> dict[str, Any]:
    """Update an existing source's settings (API-012)."""

    existing = await source_repository.get(source_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return {
            "id": existing.id,
            "name": existing.name,
            "type": existing.type,
            "url": existing.url,
            "trust_rating": existing.trust_rating,
            "active": existing.active,
            "field_mapping": existing.field_mapping,
            "link_selector": existing.link_selector,
            "content_selector": existing.content_selector,
            "created_at": existing.created_at,
        }

    updated = await source_repository.update(source_id, changes)
    if not updated:
        raise HTTPException(status_code=404, detail="Source not found")

    return {
        "id": updated.id,
        "name": updated.name,
        "type": updated.type,
        "url": updated.url,
        "trust_rating": updated.trust_rating,
        "active": updated.active,
        "field_mapping": updated.field_mapping,
        "link_selector": updated.link_selector,
        "content_selector": updated.content_selector,
        "created_at": updated.created_at,
    }


@router.delete("/sources/{source_id}")
async def disable_source(source_id: str) -> dict[str, Any]:
    """Soft-disable a news source (API-013)."""

    existing = await source_repository.get(source_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")

    await source_repository.update(source_id, {"active": False})
    return {"status": "disabled", "source_id": source_id}

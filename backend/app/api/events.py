"""Event router implementing API-005 and API-006 (Phase 8)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.models.domain import Category
from app.services.event_service import EventService

router = APIRouter(tags=["events"])
event_service = EventService()


@router.get("/events")
async def list_events(
    category: Category | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    min_credibility: float | None = Query(default=None, ge=0.0, le=100.0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    """List paginated summarized events with optional filters (API-005)."""

    return await event_service.list_events(
        category=category,
        date_from=date_from,
        date_to=date_to,
        min_credibility=min_credibility,
        page=page,
        page_size=page_size,
    )


@router.get("/events/{event_id}")
async def get_event_detail(event_id: str) -> dict[str, Any]:
    """Get detailed event representation with member articles and entities (API-006)."""

    detail = await event_service.get_event_detail(event_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Event not found")
    return detail

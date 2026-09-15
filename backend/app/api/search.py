"""Search router implementing API-007 (Phase 8)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.services.search_service import SearchService

router = APIRouter(tags=["search"])
search_service = SearchService()


@router.get("/search")
async def search_events(
    query: str = Query(..., max_length=300),
    mode: str = Query(default="semantic"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    """Search events by keyword or semantic vector similarity (API-007)."""

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query must not be empty")

    return await search_service.search_events(
        query=query,
        mode=mode,
        page=page,
        page_size=page_size,
    )

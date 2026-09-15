"""Unit tests for Phase 8: Public Read & Source APIs (API-005 to API-007, API-010 to API-013, TC-012, TC-018)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.domain import Article, Category, Event, EventArticle, Source, SourceType, EventStatus
from app.services.event_service import EventService
from app.services.search_service import SearchService


class TestPublicReadAPIs(unittest.TestCase):
    """Test suite for public Events, Search, and Sources endpoints."""

    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.api.events.event_service.list_events", new_callable=AsyncMock)
    def test_list_events_no_auth(self, mock_list_events: AsyncMock) -> None:
        """Verify GET /api/events returns 200 without Authorization header (TC-012 / API-005)."""
        mock_list_events.return_value = {
            "items": [
                {
                    "id": "evt1",
                    "category": "ATTACK",
                    "summary": "Missile strike reported",
                    "credibility_score": 85.0,
                    "article_count": 2,
                    "latest_article_at": "2026-08-20T10:00:00Z",
                }
            ],
            "page": 1,
            "total": 1,
        }

        response = self.client.get("/api/events?category=ATTACK")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["id"], "evt1")

    @patch("app.api.events.event_service.get_event_detail", new_callable=AsyncMock)
    def test_get_event_detail(self, mock_get_detail: AsyncMock) -> None:
        """Verify GET /api/events/{id} returns detail or 404 (API-006)."""
        mock_get_detail.return_value = {
            "id": "evt1",
            "summary": "Summary text",
            "summary_source": "omniroute",
            "category": "DRILL",
            "credibility_score": 75.0,
            "articles": [{"id": "art1", "title": "Title", "source": "Reuters", "url": "http://ex.com", "published_at": "2026-08-20T10:00:00Z"}],
            "entities": [{"text": "NATO", "type": "ORG"}],
        }

        response = self.client.get("/api/events/evt1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "evt1")
        self.assertEqual(len(data["articles"]), 1)

        # Test 404 when event not found
        mock_get_detail.return_value = None
        response_404 = self.client.get("/api/events/nonexistent")
        self.assertEqual(response_404.status_code, 404)

    def test_search_empty_query_rejected(self) -> None:
        """Verify GET /api/search rejects empty or missing query with 400 (TC-018 / API-007)."""
        response = self.client.get("/api/search?query=")
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    @patch("app.api.search.search_service.search_events", new_callable=AsyncMock)
    def test_search_events(self, mock_search: AsyncMock) -> None:
        """Verify GET /api/search with query returns relevant items (API-007)."""
        mock_search.return_value = {
            "items": [
                {
                    "id": "evt1",
                    "summary": "Naval drill in Baltic",
                    "category": "DRILL",
                    "credibility_score": 90.0,
                    "article_count": 3,
                    "latest_article_at": "2026-08-20T10:00:00Z",
                    "relevance_score": 0.88,
                }
            ],
            "total": 1,
        }

        response = self.client.get("/api/search?query=baltic&mode=semantic")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["relevance_score"], 0.88)

    @patch("app.api.sources.source_repository.list", new_callable=AsyncMock)
    @patch("app.api.sources.source_repository.find_by_url", new_callable=AsyncMock)
    @patch("app.api.sources.source_repository.create", new_callable=AsyncMock)
    @patch("app.api.sources.source_repository.get", new_callable=AsyncMock)
    @patch("app.api.sources.source_repository.update", new_callable=AsyncMock)
    def test_sources_crud(
        self,
        mock_update: AsyncMock,
        mock_get: AsyncMock,
        mock_create: AsyncMock,
        mock_find_url: AsyncMock,
        mock_list: AsyncMock,
    ) -> None:
        """Verify public Sources CRUD operations (API-010 to API-013)."""
        now = datetime.now(UTC)
        fake_source = Source(
            id="src1", name="BBC World", type=SourceType.RSS, url="http://bbc.com/rss", trust_rating=85, active=True, created_at=now
        )
        mock_list.return_value = [fake_source]

        # API-010 GET /api/sources
        res_list = self.client.get("/api/sources")
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.json()), 1)

        # API-011 POST /api/sources (duplicate check)
        mock_find_url.return_value = fake_source
        res_dup = self.client.post(
            "/api/sources",
            json={"name": "BBC World", "type": "rss", "url": "http://bbc.com/rss", "trust_rating": 85},
        )
        self.assertEqual(res_dup.status_code, 409)

        # API-011 POST /api/sources (success)
        mock_find_url.return_value = None
        mock_create.return_value = fake_source
        res_create = self.client.post(
            "/api/sources",
            json={"name": "BBC World", "type": "rss", "url": "http://bbc.com/new_rss", "trust_rating": 85},
        )
        self.assertEqual(res_create.status_code, 201)

        # API-013 DELETE /api/sources/{id} (soft disable)
        mock_get.return_value = fake_source
        mock_update.return_value = fake_source
        res_disable = self.client.delete("/api/sources/src1")
        self.assertEqual(res_disable.status_code, 200)
        self.assertEqual(res_disable.json()["status"], "disabled")


if __name__ == "__main__":
    unittest.main()

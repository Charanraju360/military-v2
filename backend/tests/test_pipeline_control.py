"""Unit tests for Pipeline Control & Ingestion (TC-001, TC-002, TC-003, TC-004, TC-016)."""

import asyncio
from datetime import UTC, datetime
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.domain import Article, ArticleStatus, PipelineLog, PipelineOverallStatus, Source, SourceType
from app.repositories import (
    ArticleRepository,
    ChromaRepository,
    EventRepository,
    PipelineLogRepository,
    PipelineStatusRepository,
    SourceRepository,
)
from app.services.ingestion_service import IngestionService
from app.services.pipeline_orchestrator import PipelineAlreadyRunningError, PipelineOrchestrator


class TestPipelineControlAndIngestion(unittest.TestCase):
    """Test suite for pipeline locking, DB wipe rules, phase execution order, and date defaulting."""

    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.api.pipeline.orchestrator.start_run", new_callable=AsyncMock)
    def test_tc001_and_tc002_run_pipeline_locking(self, mock_start_run: AsyncMock) -> None:
        """Verify POST /api/pipeline/run returns 202 and handles 409 on concurrent trigger (TC-001 / TC-002)."""
        mock_start_run.return_value = "run_123"
        res = self.client.post("/api/pipeline/run")
        self.assertEqual(res.status_code, 202)
        self.assertEqual(res.json()["run_id"], "run_123")

        mock_start_run.side_effect = PipelineAlreadyRunningError()
        res_409 = self.client.post("/api/pipeline/run")
        self.assertEqual(res_409.status_code, 409)

    @patch("app.api.pipeline.orchestrator.clean_database", new_callable=AsyncMock)
    def test_tc003_and_tc016_clean_db(self, mock_clean_db: AsyncMock) -> None:
        """Verify POST /api/pipeline/clean-db returns 200 or 409 when running (TC-003 / TC-016)."""
        mock_clean_db.return_value = {"articles": 5, "events": 2}
        res = self.client.post("/api/pipeline/clean-db")
        self.assertEqual(res.status_code, 200)

        mock_clean_db.side_effect = PipelineAlreadyRunningError()
        res_409 = self.client.post("/api/pipeline/clean-db")
        self.assertEqual(res_409.status_code, 409)

    def test_tc004_ingestion_date_defaulting(self) -> None:
        """Verify Article.published_at defaults to ingestion timestamp if missing in source feed (TC-004 / FR-003)."""
        mock_source_repo = AsyncMock(spec=SourceRepository)
        mock_article_repo = AsyncMock(spec=ArticleRepository)

        mock_source = Source(
            id="src1", name="Test Feed", type=SourceType.RSS, url="http://ex.com/rss", trust_rating=75
        )
        mock_source_repo.list_active.return_value = [mock_source]
        mock_article_repo.find_by_url_hash.return_value = None
        mock_article_repo.create = AsyncMock(side_effect=lambda art: art)

        ingestion_service = IngestionService(
            source_repository=mock_source_repo,
            article_repository=mock_article_repo,
        )

        rss_content = """<?xml version="1.0"?>
        <rss version="2.0">
            <channel>
                <title>Test Feed</title>
                <item>
                    <title>Joint Military Drill Conducted</title>
                    <link>http://ex.com/item1</link>
                    <description>Naval drills in Baltic Sea.</description>
                </item>
            </channel>
        </rss>"""

        with patch.object(ingestion_service, "_fetch", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = (rss_content, datetime.now(UTC))

            result = asyncio.run(ingestion_service.collect_articles())

            self.assertEqual(result["phase"], "collect")
            self.assertEqual(result["new"], 1)

            mock_article_repo.create.assert_called_once()
            created_art = mock_article_repo.create.call_args[0][0]
            self.assertIsNotNone(created_art.published_at)
            self.assertIsInstance(created_art.published_at, datetime)

    def test_pipeline_phase_execution_order(self) -> None:
        """Verify orchestrator runs 7 ordered phases (clean_db, collect, clean, filter, embed, cluster, summarize) (TC-001)."""
        mock_status_repo = AsyncMock(spec=PipelineStatusRepository)
        mock_log_repo = AsyncMock(spec=PipelineLogRepository)
        mock_index_mgr = AsyncMock()

        mock_status_repo.try_acquire_run.return_value = "run_1"
        mock_status_repo.get_singleton.return_value = MagicMock(running=False, current_run_id=None)

        orchestrator = PipelineOrchestrator(
            status_repository=mock_status_repo,
            log_repository=mock_log_repo,
            index_manager=mock_index_mgr,
        )

        mock_ingest = AsyncMock(return_value={"phase": "collect", "status": "done"})
        mock_clean = AsyncMock(return_value={"phase": "clean", "status": "done"})
        mock_filter = AsyncMock(return_value={"phase": "filter", "status": "done"})
        mock_embed = AsyncMock(return_value={"phase": "embed", "status": "done"})
        mock_cluster = AsyncMock(return_value={"phase": "cluster", "status": "done"})
        mock_summarize = AsyncMock(return_value={"phase": "summarize", "status": "done"})

        orchestrator._ingestion_service.collect_articles = mock_ingest
        orchestrator._cleaning_service.clean_articles = mock_clean
        orchestrator._topic_filter_service.filter_articles = mock_filter
        orchestrator._ner_embedding_service.process_filtered_articles = mock_embed
        orchestrator._clustering_service.cluster_processed_articles = mock_cluster
        orchestrator._summarization_service.summarize_events = mock_summarize
        orchestrator._wipe_data = AsyncMock(return_value={"articles": 0})

        asyncio.run(orchestrator._execute_run("run_1"))

        self.assertTrue(mock_log_repo.append_phase.called)
        emitted_phase_names = [call[0][1]["phase"] for call in mock_log_repo.append_phase.call_args_list]

        expected_order = ["clean_db", "collect", "clean", "filter", "embed", "cluster", "summarize"]
        self.assertEqual(emitted_phase_names, expected_order)

        mock_log_repo.finalize.assert_called_once_with(
            "run_1", overall_status="completed", completed_at=unittest.mock.ANY
        )


if __name__ == "__main__":
    unittest.main()

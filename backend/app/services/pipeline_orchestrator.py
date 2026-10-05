"""Pipeline control orchestration for FEAT-CTRL-01 and FEAT-CTRL-02."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
import logging
from typing import Any, Awaitable, Callable, TYPE_CHECKING

from bson import ObjectId

from app.models.domain import PipelineLog, PipelineOverallStatus
from app.repositories import (
    ArticleRepository,
    ChatMessageRepository,
    ChatSessionRepository,
    ChromaRepository,
    EntityRepository,
    EventArticleRepository,
    EventRepository,
    IndexManager,
    PipelineLogRepository,
    PipelineStatusRepository,
    SourceRepository,
)

if TYPE_CHECKING:
    from app.services.cleaning_service import CleaningService
    from app.services.clustering_service import ClusteringService
    from app.services.ingestion_service import IngestionService
    from app.services.ner_embedding_service import NerEmbeddingService
    from app.services.summarization_service import SummarizationService
    from app.services.topic_filter_service import TopicFilterService

logger = logging.getLogger(__name__)


class PipelineAlreadyRunningError(Exception):
    """Raised when FEAT-CTRL-01/02 cannot acquire the singleton run lock."""


PhaseFunction = Callable[[], Awaitable[dict[str, Any]]]


class PipelineOrchestrator:
    """Coordinate the documented pipeline order and persistent phase reporting."""

    def __init__(
        self,
        *,
        status_repository: PipelineStatusRepository | None = None,
        log_repository: PipelineLogRepository | None = None,
        article_repository: ArticleRepository | None = None,
        entity_repository: EntityRepository | None = None,
        event_repository: EventRepository | None = None,
        event_article_repository: EventArticleRepository | None = None,
        chat_session_repository: ChatSessionRepository | None = None,
        chat_message_repository: ChatMessageRepository | None = None,
        chroma_repository: ChromaRepository | None = None,
        index_manager: IndexManager | None = None,
        source_repository: SourceRepository | None = None,
        ingestion_service: Any | None = None,
        cleaning_service: Any | None = None,
        topic_filter_service: Any | None = None,
        ner_embedding_service: Any | None = None,
        clustering_service: Any | None = None,
        summarization_service: Any | None = None,
    ) -> None:
        self._status_repository = status_repository or PipelineStatusRepository()
        self._log_repository = log_repository or PipelineLogRepository()
        self._article_repository = article_repository or ArticleRepository()
        self._entity_repository = entity_repository or EntityRepository()
        self._event_repository = event_repository or EventRepository()
        self._event_article_repository = event_article_repository or EventArticleRepository()
        self._chat_session_repository = chat_session_repository or ChatSessionRepository()
        self._chat_message_repository = chat_message_repository or ChatMessageRepository()
        self._chroma_repository = chroma_repository or ChromaRepository()
        self._index_manager = index_manager or IndexManager()
        self._source_repository = source_repository or SourceRepository()

        self._ingestion_service_instance = ingestion_service
        self._cleaning_service_instance = cleaning_service
        self._topic_filter_service_instance = topic_filter_service
        self._ner_embedding_service_instance = ner_embedding_service
        self._clustering_service_instance = clustering_service
        self._summarization_service_instance = summarization_service

    @property
    def _ingestion_service(self) -> Any:
        if self._ingestion_service_instance is None:
            from app.services.ingestion_service import IngestionService
            self._ingestion_service_instance = IngestionService(
                source_repository=self._source_repository, article_repository=self._article_repository
            )
        return self._ingestion_service_instance

    @_ingestion_service.setter
    def _ingestion_service(self, value: Any) -> None:
        self._ingestion_service_instance = value

    @property
    def _cleaning_service(self) -> Any:
        if self._cleaning_service_instance is None:
            from app.services.cleaning_service import CleaningService
            self._cleaning_service_instance = CleaningService(article_repository=self._article_repository)
        return self._cleaning_service_instance

    @_cleaning_service.setter
    def _cleaning_service(self, value: Any) -> None:
        self._cleaning_service_instance = value

    @property
    def _topic_filter_service(self) -> Any:
        if self._topic_filter_service_instance is None:
            from app.services.topic_filter_service import TopicFilterService
            self._topic_filter_service_instance = TopicFilterService(
                article_repository=self._article_repository
            )
        return self._topic_filter_service_instance

    @_topic_filter_service.setter
    def _topic_filter_service(self, value: Any) -> None:
        self._topic_filter_service_instance = value

    @property
    def _ner_embedding_service(self) -> Any:
        if self._ner_embedding_service_instance is None:
            from app.services.ner_embedding_service import NerEmbeddingService
            self._ner_embedding_service_instance = NerEmbeddingService(
                article_repository=self._article_repository,
                entity_repository=self._entity_repository,
                chroma_repository=self._chroma_repository,
            )
        return self._ner_embedding_service_instance

    @_ner_embedding_service.setter
    def _ner_embedding_service(self, value: Any) -> None:
        self._ner_embedding_service_instance = value

    @property
    def _clustering_service(self) -> Any:
        if self._clustering_service_instance is None:
            from app.services.clustering_service import ClusteringService
            self._clustering_service_instance = ClusteringService(
                article_repository=self._article_repository,
                event_repository=self._event_repository,
                event_article_repository=self._event_article_repository,
                entity_repository=self._entity_repository,
                chroma_repository=self._chroma_repository,
            )
        return self._clustering_service_instance

    @_clustering_service.setter
    def _clustering_service(self, value: Any) -> None:
        self._clustering_service_instance = value

    @property
    def _summarization_service(self) -> Any:
        if self._summarization_service_instance is None:
            from app.services.summarization_service import SummarizationService
            self._summarization_service_instance = SummarizationService(
                event_repository=self._event_repository,
                event_article_repository=self._event_article_repository,
                article_repository=self._article_repository,
                entity_repository=self._entity_repository,
                source_repository=self._source_repository,
            )
        return self._summarization_service_instance

    @_summarization_service.setter
    def _summarization_service(self, value: Any) -> None:
        self._summarization_service_instance = value

    async def start_run(self) -> str:
        """Implement FEAT-CTRL-01: atomically start an asynchronous full run."""

        run_id = str(ObjectId())
        if await self._status_repository.try_acquire_run(run_id) is None:
            raise PipelineAlreadyRunningError
        asyncio.create_task(self._execute_run(run_id), name=f"pipeline-run-{run_id}")
        return run_id

    async def clean_database(self) -> dict[str, int]:
        """Implement FEAT-CTRL-02: wipe data while retaining only control status and sources."""

        if not await self._status_repository.try_acquire_clean_lock():
            raise PipelineAlreadyRunningError
        try:
            await self._index_manager.ensure_indexes()
            return await self._wipe_data()
        finally:
            await self._status_repository.release_lock()

    async def get_live_status(self) -> dict[str, Any]:
        """Return API-002's live status and the current run's emitted phase JSON."""

        status = await self._status_repository.get_singleton()
        phases: list[dict[str, Any]] = []
        if status.current_run_id:
            log = await self._log_repository.get(status.current_run_id)
            phases = log.phases if log else []
        return {
            "running": status.running,
            "current_run_id": status.current_run_id,
            "current_phase": status.current_phase,
            "phases_so_far": phases,
        }

    async def list_logs(self, *, page: int, page_size: int) -> list[dict[str, Any]]:
        """Return API-004's historical pipeline log representation."""

        logs = await self._log_repository.list_recent(page=page, page_size=page_size)
        return [
            {
                "run_id": log.id,
                "started_at": log.started_at,
                "completed_at": log.completed_at,
                "overall_status": log.overall_status,
                "phases": log.phases,
            }
            for log in logs
        ]

    async def _execute_run(self, run_id: str) -> None:
        """Execute the required phase order without blocking the API request."""

        log_created = False
        overall_status = PipelineOverallStatus.COMPLETED
        try:
            await self._index_manager.ensure_indexes()
            clean_phase = await self._run_clean_phase(run_id)
            log_created = True
            await self._emit_phase(run_id, clean_phase)
            if clean_phase["status"] == "failed":
                overall_status = PipelineOverallStatus.FAILED
                return
            for phase_name, function in self._phase_functions():
                await self._status_repository.set_current_phase(phase_name)
                try:
                    phase_result = await function()
                except Exception as error:
                    logger.exception("Pipeline run %s failed phase %s", run_id, phase_name)
                    overall_status = PipelineOverallStatus.FAILED
                    phase_result = {"phase": phase_name, "status": "failed", "errors": [str(error)]}
                await self._emit_phase(run_id, phase_result)
        except Exception as error:  # Hard infrastructure failures must release the lock.
            logger.exception("Pipeline run %s failed", run_id)
            overall_status = PipelineOverallStatus.FAILED
            if log_created:
                await self._emit_phase(
                    run_id,
                    {"phase": "pipeline", "status": "failed", "errors": [str(error)]},
                )
        finally:
            if log_created:
                await self._log_repository.finalize(
                    run_id,
                    overall_status=overall_status.value,
                    completed_at=datetime.now(UTC),
                )
            await self._status_repository.release_lock()

    async def _run_clean_phase(self, run_id: str) -> dict[str, Any]:
        """Wipe the run data before creating the new pipeline-log document."""

        await self._status_repository.set_current_phase("clean_db")
        try:
            deleted = await self._wipe_data()
        except Exception as error:
            await self._create_run_log(run_id)
            return {"phase": "clean_db", "status": "failed", "deleted": {}, "errors": [str(error)]}
        await self._create_run_log(run_id)
        return {"phase": "clean_db", "status": "done", "deleted": deleted, "errors": []}

    async def _create_run_log(self, run_id: str) -> None:
        """Create the current log after wiping historical logs."""

        await self._log_repository.create(
            PipelineLog(
                id=run_id,
                started_at=datetime.now(UTC),
                overall_status=PipelineOverallStatus.RUNNING,
                phases=[],
            )
        )

    async def _wipe_data(self) -> dict[str, int]:
        """Delete all wipeable collections and vectors; sources and status remain intact."""

        deleted = {
            "articles": await self._article_repository.delete_many(),
            "entities": await self._entity_repository.delete_many(),
            "events": await self._event_repository.delete_many(),
            "event_articles": await self._event_article_repository.delete_many(),
            "chat_sessions": await self._chat_session_repository.delete_many(),
            "chat_messages": await self._chat_message_repository.delete_many(),
            "pipeline_logs": await self._log_repository.delete_many(),
        }
        await self._chroma_repository.clear("article_embeddings")
        await self._chroma_repository.clear("event_embeddings")
        return deleted

    async def _emit_phase(self, run_id: str, phase: dict[str, Any]) -> None:
        """Persist one human-readable JSON phase status object for FR-011."""

        await self._log_repository.append_phase(run_id, phase)
        logger.info("Pipeline run %s completed phase %s", run_id, phase["phase"])

    def _phase_functions(self) -> list[tuple[str, PhaseFunction]]:
        """Return the immutable docs/09-business-logic.md phase order."""

        return [
            ("collect", self._ingestion_service.collect_articles),
            ("clean", self._cleaning_service.clean_articles),
            ("filter", self._topic_filter_service.filter_articles),
            ("embed", self._ner_embedding_service.process_filtered_articles),
            ("cluster", self._clustering_service.cluster_processed_articles),
            ("summarize", self._summarization_service.summarize_events),
        ]

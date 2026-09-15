"""Typed CRUD for the `pipeline_logs` collection."""

from datetime import datetime
from typing import Any

from pymongo import DESCENDING

from app.models.domain import PipelineLog
from app.repositories.base import MongoRepository


class PipelineLogRepository(MongoRepository[PipelineLog]):
    collection_name = "pipeline_logs"
    model_type = PipelineLog

    async def list_recent(self, *, page: int = 1, page_size: int = 20) -> list[PipelineLog]:
        return await self.list(page=page, page_size=page_size, sort=[("started_at", DESCENDING)])

    async def append_phase(self, run_id: str, phase: dict[str, Any]) -> None:
        """Append one emitted phase JSON object to an in-progress run."""

        object_id = self._object_id(run_id)
        if object_id is None:
            return
        await self.collection.update_one({"_id": object_id}, {"$push": {"phases": phase}})

    async def finalize(self, run_id: str, *, overall_status: str, completed_at: datetime) -> None:
        """Set terminal fields for a pipeline run log."""

        object_id = self._object_id(run_id)
        if object_id is None:
            return
        await self.collection.update_one(
            {"_id": object_id},
            {"$set": {"overall_status": overall_status, "completed_at": completed_at}},
        )

    @staticmethod
    def _object_id(run_id: str):
        from app.repositories.base import _as_object_id

        return _as_object_id(run_id)

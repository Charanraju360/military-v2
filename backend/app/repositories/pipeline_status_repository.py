"""Typed singleton access for the `pipeline_status` collection."""

from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from pymongo import ReturnDocument

from app.models.domain import PipelineStatus
from app.repositories.base import MongoRepository, _serialize_document


PIPELINE_STATUS_ID = ObjectId("000000000000000000000001")


class PipelineStatusRepository(MongoRepository[PipelineStatus]):
    collection_name = "pipeline_status"
    model_type = PipelineStatus

    async def get_singleton(self) -> PipelineStatus:
        """Return the one status record, creating an idle record when absent."""

        document = await self.collection.find_one_and_update(
            {"_id": PIPELINE_STATUS_ID},
            {"$setOnInsert": {"running": False, "current_run_id": None, "current_phase": None}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return self.model_type.model_validate(_serialize_document(document))

    async def replace_singleton(self, status: PipelineStatus) -> PipelineStatus:
        """Persist the singleton status state; lock semantics are added in Phase 2."""

        document = status.model_dump(by_alias=True, exclude_none=False)
        document["_id"] = PIPELINE_STATUS_ID
        await self.collection.replace_one({"_id": PIPELINE_STATUS_ID}, document, upsert=True)
        return self.model_type.model_validate(_serialize_document(document))

    async def try_acquire_run(self, run_id: str) -> PipelineStatus | None:
        """Atomically acquire the documented one-run-at-a-time pipeline lock."""

        try:
            document = await self.collection.find_one_and_update(
                {"_id": PIPELINE_STATUS_ID, "running": False},
                {"$set": {"running": True, "current_run_id": run_id, "current_phase": "clean_db"}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return None
        return self.model_type.model_validate(_serialize_document(document)) if document else None

    async def try_acquire_clean_lock(self) -> bool:
        """Temporarily block a run while the standalone Clean DB action executes."""

        try:
            document = await self.collection.find_one_and_update(
                {"_id": PIPELINE_STATUS_ID, "running": False},
                {"$set": {"running": True, "current_run_id": None, "current_phase": "clean_db"}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            return False
        return document is not None

    async def set_current_phase(self, phase: str) -> None:
        """Publish the active phase for status polling."""

        await self.collection.update_one({"_id": PIPELINE_STATUS_ID}, {"$set": {"current_phase": phase}})

    async def release_lock(self) -> None:
        """Return the singleton control record to its idle state."""

        await self.collection.update_one(
            {"_id": PIPELINE_STATUS_ID},
            {"$set": {"running": False, "current_run_id": None, "current_phase": None}},
        )

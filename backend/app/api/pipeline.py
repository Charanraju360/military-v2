"""Public pipeline-control API endpoints (API-001 through API-004)."""

from fastapi import APIRouter, HTTPException, Query, status

from app.services.pipeline_orchestrator import PipelineAlreadyRunningError, PipelineOrchestrator

router = APIRouter(tags=["pipeline"])
orchestrator = PipelineOrchestrator()


@router.post("/pipeline/run", status_code=status.HTTP_202_ACCEPTED)
async def run_pipeline() -> dict[str, str]:
    """API-001: start the asynchronous FEAT-CTRL-01 pipeline run."""

    try:
        run_id = await orchestrator.start_run()
    except PipelineAlreadyRunningError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pipeline already running") from error
    return {"run_id": run_id, "status": "running"}


@router.get("/pipeline/status")
async def pipeline_status() -> dict[str, object]:
    """API-002: return the public live pipeline status."""

    return await orchestrator.get_live_status()


@router.post("/pipeline/clean-db")
async def clean_database() -> dict[str, str]:
    """API-003: run FEAT-CTRL-02 without executing pipeline phases."""

    try:
        await orchestrator.clean_database()
    except PipelineAlreadyRunningError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pipeline already running") from error
    return {"status": "cleaned"}


@router.get("/pipeline/logs")
async def pipeline_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict[str, object]:
    """API-004: list historical pipeline runs, newest first."""

    return {"items": await orchestrator.list_logs(page=page, page_size=page_size)}

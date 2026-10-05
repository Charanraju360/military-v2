from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import assistant, events, pipeline, search, sources
from app.repositories.pipeline_status_repository import PipelineStatusRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Release any orphaned lock from prior unexpected server shutdowns
    try:
        await PipelineStatusRepository().release_lock()
    except Exception:
        pass
    yield


app = FastAPI(title="OSINT-EIP", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")

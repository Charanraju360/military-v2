"""FastAPI application shell for the public OSINT-EIP API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import assistant, events, pipeline, search, sources


app = FastAPI(title="OSINT-EIP")

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

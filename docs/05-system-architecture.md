# System Architecture Document

## 1. Architecture Overview
Modular monolith, no auth layer. One FastAPI backend (manual pipeline control + REST API) backed by MongoDB Atlas (cloud) and ChromaDB (local vector store), serving a public React frontend. No scheduler process — pipeline runs only on explicit trigger.

## 2. Technology Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React + Tailwind | Public dashboard, search, assistant, pipeline control panel |
| Backend | FastAPI (Python 3.11+) | REST API, pipeline orchestration |
| Primary DB | MongoDB Atlas (cloud) | via `MONGODB_URI` connection string |
| Vector store | ChromaDB | Embeddings for clustering + semantic search + RAG |
| Embedding model | BGE/E5-family (batch-capable) | Vector generation |
| Clustering | Hybrid event clustering | Semantic embeddings plus entity, time, location, and metadata signals |
| NER | spaCy / GLiNER (batch-capable) | Entity extraction |
| HTML parsing | Beautiful Soup | RSS and configured scrape-source extraction, including CSS selectors |
| Summarization/RAG | Qwen3-14B primary → OpenRouter secondary → structured local fallback | Event summaries, assistant answers |
| Auth | **None** | Public access to everything |

## 3. High-Level Architecture Diagram

```mermaid
flowchart TD
    U[Any Visitor] -->|HTTPS, no login| FE[React Frontend]
    FE -->|REST/JSON| API[FastAPI Backend]
    API --> ATLAS[(MongoDB Atlas)]
    API --> VEC[(ChromaDB)]
    API --> QWEN[Qwen3-14B tunnel]
    API --> OR[OpenRouter secondary LLM]
    FE -->|Run Pipeline / Clean DB| API
    API --> PIPE[Pipeline Orchestrator]
    PIPE --> ATLAS
    PIPE --> VEC
    PIPE --> QWEN
    PIPE --> OR
    PIPE --> SF[Structured Local Fallback]
    SRC[RSS / News APIs / Scraped Pages] --> PIPE
```

## 4. Frontend Architecture
- React + Tailwind, React Query for server state, no auth context needed (no login).
- **Pages**: Event Feed (home, public), Event Detail, Search, Assistant Chat, Sources config, Pipeline Control (Run / Clean DB / live phase status / past logs).
- All routes public — no protected-route logic.

## 5. Backend Architecture
- **Routers**: `events.py`, `search.py`, `assistant.py`, `sources.py`, `pipeline.py` — no `auth.py`, no admin split.
- **Services**: `ingestion_service.py`, `cleaning_service.py`, `topic_filter_service.py`, `ner_embedding_service.py` (batch-capable), `clustering_service.py` (hybrid event clustering), `summarization_service.py` (Qwen→OpenRouter→structured fallback), `event_service.py`, `search_service.py`, `assistant_service.py`, `pipeline_orchestrator.py` (coordinates phases, emits/persists JSON, manages run lock).
- **Repositories**: unchanged pattern, plus `pipeline_log_repository.py`.
- No auth middleware. Standard error-handling + request-logging middleware remain.

## 6. Database Layer
- Motor (async MongoDB driver) → MongoDB Atlas via `MONGODB_URI`.
- ChromaDB local client; `article_embeddings` and `event_embeddings` collections; IDs match Mongo `_id`.

## 7. External Services
- **Qwen3-14B**: primary LLM, hosted externally (for example in Colab) behind a configurable tunnel endpoint. The tunnel URL and credential are environment configuration only.
- **OpenRouter**: secondary LLM path. Model name, endpoint, and credential are configurable.
- **Structured local fallback**: deterministic event synthesis from available claims, entities, timeline, source references, conflicts, and article metadata. It must not merely return top sentences or concatenate article excerpts.
- **News sources**: RSS/API/scrape per `sources` config (public-editable, no auth gate).

## 8. Data Flow
```
[Run Pipeline triggered]
   → Wipe Mongo + Chroma
   → Collector → Article[ingested] (with published_at)
   → Cleaner → Article[cleaned]
   → Topic Filter → Article[filtered_ok] or [rejected: off_topic]
   → Batch NER+Embed → Entity[], vectors, Article[processed]
   → Hybrid Clustering (semantic + entity + time + location + metadata signals) → Event + EventArticle
   → Collective Event Intelligence Summarize (Qwen→OpenRouter→structured fallback) → Event[summarized]
   → each phase emits JSON, persisted to pipeline_logs
→ Public API/Dashboard reads finished Events at any time (independent of pipeline state)
```

## 9. Request Lifecycle — Run Pipeline
1. User clicks "Run Pipeline" → `POST /api/pipeline/run`.
2. `pipeline_orchestrator` checks `pipeline_status.running`; if true, return 409.
3. Set `running=true`; wipe DB/vectors.
4. Run phases sequentially; after each, write a JSON status doc, append to the in-progress `pipeline_logs` record, and make it available to `GET /api/pipeline/status` for polling.
5. On completion (or hard failure), set `running=false`, finalize `pipeline_logs` record.
6. Frontend polls status during the run and renders each phase's JSON as it arrives.

## 10. Module Responsibilities

| Module | Responsibility |
|---|---|
| Pipeline Orchestrator | Run-lock, wipe, phase sequencing, JSON status emission/persistence |
| Collector | Fetch, dedupe, store raw articles + dates |
| Cleaner | Normalize text |
| Topic Filter | Keyword pre-filter + Qwen/OpenRouter borderline classification; reject non-military |
| NER+Embedding | Batch entity extraction + embedding generation |
| Clustering | Hybrid event grouping from vectors, entities, time, location, and metadata |
| Summarizer | Collective event intelligence synthesis with claims, timeline, conflicts, and structured fallback |
| Event/Search Service | Public read/filter/search APIs |
| Assistant Service | Event-centric retrieval + Qwen/OpenRouter grounded answer, structured fallback |

## 11. Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth | None | Single-user public tool per project requirement — removes login friction entirely |
| DB hosting | MongoDB Atlas | Cloud, connection-string based, no local Mongo ops needed |
| Clustering signal | Hybrid signals | Redesigned architecture uses semantic vectors plus entities, time, location, and metadata so related reports form event-centric clusters |
| Summarization provider | Qwen3-14B primary, OpenRouter secondary | Matches the pinned redesign; structured local fallback prevents provider outage from blocking the pipeline |
| Topic filter | Keyword pre-filter + LLM fallback | Keeps latency/cost down — LLM only called for ambiguous cases |
| Scheduling | Removed entirely | Replaced by manual trigger + full-wipe-per-run, per explicit requirement |
| NER/Embedding calls | Batched | Reduces per-article call overhead → lower total latency |

## 12. Project Directory Structure

```text
osint-eip/
├── backend/
│   └── app/
│       ├── api/
│       │   ├── events.py
│       │   ├── search.py
│       │   ├── assistant.py
│       │   ├── sources.py
│       │   └── pipeline.py
│       ├── services/
│       │   ├── ingestion_service.py
│       │   ├── cleaning_service.py
│       │   ├── topic_filter_service.py
│       │   ├── ner_embedding_service.py
│       │   ├── clustering_service.py
│       │   ├── summarization_service.py
│       │   ├── event_service.py
│       │   ├── search_service.py
│       │   ├── assistant_service.py
│       │   └── pipeline_orchestrator.py
│       ├── repositories/
│       ├── models/
│       ├── clients/
│       │   ├── llm_client.py
│       │   ├── embedding_client.py
│       │   └── structured_event_fallback.py
│       ├── config.py
│       └── main.py
├── frontend/
│   └── src/ (pages/, components/, api/)
├── docs/
├── CLAUDE.md
└── README.md
```

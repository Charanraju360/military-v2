# OSINT-EIP — AI-Based Military OSINT Event Intelligence Platform

> **Status: Specification complete, implementation not started.** No authentication anywhere — fully public dashboard, manually-triggered pipeline.

## Description
Wipes its own database on trigger, ingests military-related news only, clusters articles into events with hybrid semantic/entity/time/location/metadata signals, generates one structured collective event summary (Qwen3-14B primary, OpenRouter secondary, structured local fallback), and serves everything through a public dashboard and an event-centric RAG assistant. Every pipeline phase reports its own JSON status.

Full background: [`docs/01-project-proposal.md`](docs/01-project-proposal.md).

## Key Design Decisions
- **No login / no roles** — single public dashboard, anyone can trigger the pipeline or clean the DB.
- **MongoDB Atlas (cloud)** — connected via a `MONGODB_URI` connection string, not a local database.
- **Hybrid event clustering** — semantic embeddings plus entities, time, location, and metadata.
- **Qwen-first summarization** — Qwen3-14B primary, OpenRouter secondary, structured local fallback when LLMs fail.
- **Military-only content** — a topic filter (keyword pre-check + the configured LLM path for ambiguous cases) rejects anything not related to attacks, geopolitics, peace deals, agreements, or drills.
- **Manual pipeline control only** — no scheduler; "Run Pipeline" always wipes the DB first, then runs fresh; a separate "Clean DB" button wipes without running.
- **Latency-first** — batched NER/embedding calls, short LLM timeouts with instant fallback, indexed vector search only.

## Planned Features
1. Manual "Run Pipeline" (auto-wipes DB, runs collect→clean→filter→embed→cluster→summarize)
2. Standalone "Clean DB" button
3. Military-topic filter
4. Hybrid event clustering
5. Collective event-level summarization with claims, timeline, conflicts, and fallback
6. Article publish dates shown throughout
7. Public event dashboard with filters
8. Keyword + semantic search
9. Event-centric RAG assistant with citation + structured fallback behavior
10. Live + historical per-phase JSON pipeline status

Full detail: [`docs/03-functional-requirements.md`](docs/03-functional-requirements.md).

## Planned Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React + Tailwind |
| Backend | Python 3.11+, FastAPI |
| Database | MongoDB Atlas (cloud) |
| Vector store | ChromaDB |
| Clustering | Hybrid semantic/entity/time/location/metadata clustering |
| NER | spaCy / GLiNER (batched) |
| Summarization/RAG | Qwen3-14B → OpenRouter → structured local fallback |
| Auth | None |

## Planned Architecture Overview
```mermaid
flowchart TD
    U[Any Visitor, no login] --> FE[React Frontend]
    FE --> API[FastAPI Backend]
    API --> ATLAS[(MongoDB Atlas)]
    API --> VEC[(ChromaDB)]
    API --> QWEN[Qwen3-14B tunnel]
    API --> OR[OpenRouter]
    FE -->|Run Pipeline / Clean DB| API
```
Full detail: [`docs/05-system-architecture.md`](docs/05-system-architecture.md).

## Planned Folder Structure
```text
osint-eip/
├── backend/app/ (api/, services/, repositories/, models/, clients/, main.py)
├── frontend/src/ (pages/, components/, api/)
├── docs/
├── CLAUDE.md
└── README.md
```

## Prerequisites (Planned)
- Python 3.11+, Node.js 18+
- A MongoDB Atlas cluster + connection string
- ChromaDB (local/embedded mode)
- A Qwen3-14B tunnel endpoint and credential, when the LLM phase is reached
- An OpenRouter API key, when secondary LLM fallback is enabled

## Configuration (Planned Environment Variables)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/osint_eip
CHROMADB_PATH=./chroma_data
QWEN_BASE_URL=https://your-qwen-tunnel.example/v1
QWEN_API_KEY=your_key_here
QWEN_MODEL=qwen3-14b
QWEN_TIMEOUT_SECONDS=7
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=your_secondary_model
OPENROUTER_TIMEOUT_SECONDS=7
SOURCE_REQUEST_TIMEOUT_SECONDS=15
```

## Running (Planned)
```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Testing (Planned)
```bash
cd backend && pytest
cd frontend && npm test
```
Full test plan: [`docs/11-testing-and-test-cases.md`](docs/11-testing-and-test-cases.md).

## API Overview
Public REST API under `/api` — no auth on any route. Pipeline control (`/api/pipeline/*`), events, search, assistant, sources. Full contract: [`docs/07-api-specification.md`](docs/07-api-specification.md).

## Database Overview
MongoDB Atlas collections: `sources` (persists across wipes), `articles`, `entities`, `events`, `event_articles`, `chat_sessions`, `chat_messages`, `pipeline_logs`, `pipeline_status`. Plus a ChromaDB vector store. No `users` collection. Full schema: [`docs/06-database-design.md`](docs/06-database-design.md).

## Troubleshooting (Planned)
- **Pipeline stuck "running"**: check `pipeline_status.current_phase`; a hard crash should still release the lock — if not, this is a bug to fix per `docs/12-coding-standards.md` error-handling rules.
- **Everything rejected as off-topic**: check the keyword allowlist in `topic_filter_service.py` and confirm Qwen/OpenRouter configuration is reachable for ambiguous-case classification.
- **Summaries always use structured fallback**: check Qwen/OpenRouter endpoint, key, model, and timeout configuration.

## Documentation
Full package in [`docs/`](docs/), 13 documents (01–13). See also [`CLAUDE.md`](CLAUDE.md) for AI-agent build instructions.

## Project Status
📋 Specification redesign in progress (revision 3 — no-auth, Atlas, Qwen/OpenRouter/structured fallback, military-only filter, hybrid clustering, manual pipeline control).

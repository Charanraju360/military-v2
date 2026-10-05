# Software Requirements Specification (SRS)

## 1. Purpose
Define functional/non-functional requirements for OSINT-EIP v3: no-auth, cloud MongoDB, hybrid event clustering, Qwen/OpenRouter/structured-fallback summarization, military-topic filter, manual pipeline control.

## 2. Scope
Covers pipeline (collect→clean→filter→embed→cluster→summarize), storage, backend API, dashboard, assistant. No auth/roles.

## 3. Product Overview
A backend pipeline, manually triggered, wipes the DB then processes military news into deduplicated, collectively-summarized events. A public frontend reads results and hosts a basic assistant.

## 4. Intended Users
Single anonymous user — full public access, no accounts.

## 5. User Roles
None. All functionality (including pipeline trigger and clean DB) is accessible to anyone loading the site.

## 6. Functional Overview
1. On manual trigger, wipe DB then ingest from active sources.
2. Clean text; reject non-military articles.
3. Batch-extract entities + embeddings.
4. Cluster articles by embedding similarity only.
5. Generate one collective structured summary per event (Qwen3-14B → OpenRouter → structured local fallback).
6. Emit JSON status after each phase; persist to `pipeline_logs`.
7. Serve events/articles via API with filter/search.
8. Serve a basic RAG chat endpoint.
9. Standalone Clean DB action.

## 7. Functional Requirements

### FR-001 — Manual Pipeline Trigger
- **Description**: A single action wipes the database, then runs the full pipeline (collect→clean→filter→embed→cluster→summarize) sequentially.
- **Actor**: User (via UI button) or direct API call.
- **Preconditions**: No other pipeline run currently in progress.
- **Processing**: Acquire run lock → wipe MongoDB collections + Chroma vectors → run each phase → emit/persist JSON status per phase → release lock.
- **Output**: Sequence of phase-status JSON objects; final `pipeline_logs` record.
- **Error conditions**: Trigger while a run is active → 409, no new run started.
- **Acceptance criteria**: Given no run in progress, when triggered, then DB is empty before Phase 1 starts and a `pipeline_logs` entry exists after completion with a status per phase.

### FR-002 — Clean Database (standalone)
- **Description**: Wipe all data without running the pipeline.
- **Preconditions**: No pipeline run in progress.
- **Processing**: Delete all documents from all Mongo collections; delete all Chroma vectors.
- **Acceptance criteria**: Given data exists, when Clean DB is triggered, then all collections and vector stores are empty and no pipeline phases execute.

### FR-003 — Article Collection
- **Description**: Fetch articles from active sources (RSS/API/scrape), dedupe by URL, store with `published_at`.
- **Acceptance criteria**: Given a source with 3 items (1 duplicate URL), when collection runs, then 2 new articles are stored, each with a `published_at` value.

### FR-004 — Cleaning
- **Description**: Strip HTML/boilerplate; reject articles under 100 characters of cleaned text.
- **Acceptance criteria**: As original — cleaned text has no HTML tags; too-short articles are `rejected`.

### FR-005 — Military Topic Filter
- **Description**: Reject any article that is not military-related (attacks, geopolitics, peace deals, military agreements, drills/mock drills, or other clearly military-related news).
- **Processing**: Cheap keyword allowlist pre-check first; if inconclusive, classify via configured LLM path (Qwen3-14B primary, OpenRouter secondary). Reject if N.
- **Output**: `Article.status=rejected` (reason `off_topic`) or proceeds with `Article.category_hint` set.
- **Acceptance criteria**: Given a sports article and a NATO-drill article, when filtering runs, then the sports article is `rejected(off_topic)` and the drill article proceeds.

### FR-006 — Batch Entity Extraction & Embedding
- **Description**: Extract entities and generate embeddings for cleaned, on-topic articles, using batched model calls rather than one-article-at-a-time calls where the underlying library supports batching.
- **Acceptance criteria**: Given 10 cleaned articles, when this phase runs, then entities and embeddings exist for all 10, produced via batch calls (not 10 sequential single calls) when the model client supports it.

### FR-007 — Meaning-Only Event Clustering
- **Description**: Group articles into events using only embedding-vector similarity (UMAP reduction + HDBSCAN clustering). No keyword/text-overlap logic is used at any point in this step.
- **Acceptance criteria**: As original — 3 articles with near-identical embeddings but different wording/keywords still cluster into one event.

### FR-008 — Collective Event Summarization
- **Description**: Generate exactly one summary per event from the combined text of ALL its member articles (not per-article summaries).
- **Processing**: Build event workspace from all member articles → Qwen3-14B call (short timeout) → OpenRouter secondary on failure → structured local fallback over claims/timeline/conflicts/entities/source refs when all LLM paths fail.
- **Acceptance criteria**: Given an event with 3 articles, when summarization runs, then exactly one `Event.summary` exists reflecting content from all 3, structured fields are stored, and `Event.summary_source` records `qwen_primary`, `openrouter_secondary`, or `structured_fallback`.

### FR-009 — Event Browsing & Search
- **Description**: Public API to list/filter events and search by keyword or semantic similarity.
- **Acceptance criteria**: As original.

### FR-010 — Basic RAG Assistant
- **Description**: Answer user questions using only retrieved stored events/articles.
- **Processing**: Embed question → event vector search → assemble event evidence → Qwen grounded answer → OpenRouter fallback → structured local answer from stored evidence if all LLM paths fail.
- **Acceptance criteria**: Given all configured LLMs are unreachable and a relevant event exists, when a question is asked, then the response is synthesized from stored event evidence and flagged `source: structured_fallback`.

### FR-011 — Pipeline Phase Status Reporting
- **Description**: After each phase, emit a JSON object describing what happened (counts, errors) and persist it to `pipeline_logs`.
- **Acceptance criteria**: Given a pipeline run, when it completes, then `pipeline_logs` contains one entry with a sub-object per phase, each showing counts and any errors.

## 8. Non-Functional Requirements
See `04-non-functional-requirements.md`.

## 9. System Constraints
- MongoDB Atlas (cloud) only — connection via `MONGODB_URI`.
- No auth/session layer anywhere.
- Single pipeline run at a time (enforced by lock).

## 10. Assumptions
- Qwen3-14B is reachable most of the time; OpenRouter and structured local fallback cover outages.
- Military-topic keyword allowlist is maintainable as a config list.

## 11. Dependencies
- MongoDB Atlas, ChromaDB, Qwen3-14B tunnel, OpenRouter API, embedding model, NER model.

## 12. External Interfaces
REST API (JSON/HTTPS) frontend-backend; outbound HTTPS to sources, Qwen tunnel, and OpenRouter.

## 13. Data Requirements
See `06-database-design.md`.

## 14. User Interaction Requirements
See `08-ui-ux-specification.md`.

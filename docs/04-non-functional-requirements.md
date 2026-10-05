# Non-Functional Requirements Document

## Performance (elevated priority per project requirement: "should not have latency, should be fast")
- **NFR-001**: Dashboard event-list API responds within 300ms for a 20-event page (excludes any live pipeline work — dashboard never triggers processing).
- **NFR-002**: LLM calls (topic classification, summarization, assistant) use hard timeouts of 6–8s; on expiry, immediately fall back (Qwen → OpenRouter → structured local fallback) rather than waiting further.
- **NFR-003**: Entity extraction + embedding run in batches (FR-006), not per-article sequential calls, to reduce total pipeline wall-clock time.
- **NFR-004**: Vector similarity search (clustering + semantic search + assistant retrieval) uses ChromaDB's indexed nearest-neighbor search — never a brute-force full-corpus scan.
- **NFR-005**: All pipeline phases run asynchronously in the backend; the dashboard/API remains responsive to read requests while a pipeline run is in progress.

## Scalability
- **NFR-006**: System supports at least 50 sources and several thousand articles per run without architectural change.

## Reliability
- **NFR-007**: A single source failure does not stop collection from other sources.
- **NFR-008**: Qwen/OpenRouter failure never blocks the pipeline — structured local fallback paths guarantee every event/answer completes when sufficient stored evidence exists.
- **NFR-009**: Pipeline steps are idempotent within a run; a run always starts from a clean, empty DB (per FR-001/FR-002), so no historical-data conflicts are possible.
- **NFR-010**: Only one pipeline run may be active at a time (lock-enforced); concurrent trigger attempts are rejected, not queued silently.

## Usability
- **NFR-011**: Dashboard requires no login and no setup — first screen a visitor sees is the live event feed.
- **NFR-012**: Phase JSON status is human-readable (counts + plain error text), not raw stack traces.

## Maintainability
- **NFR-013**: Backend organized by pipeline stage/module (`05-system-architecture.md`).
- **NFR-014**: All config (Mongo Atlas URI, Qwen endpoint/key/model, OpenRouter key/model, keyword allowlist, hybrid clustering weights) via environment variables / a config file — never hardcoded.

## Portability
- **NFR-015**: Backend runs anywhere with Python 3.11+, network access to MongoDB Atlas, ChromaDB (local/embedded), the configured Qwen endpoint, and OpenRouter if secondary fallback is enabled.

## Compatibility
- **NFR-016**: Dashboard renders correctly on latest Chrome/Firefox/Edge, desktop and tablet widths.

## Resource Usage
- **NFR-017**: Embedding/NER models chosen to fit within the deployment machine's memory budget (Target: TBD, recommend ≤2GB footprint).

## Accuracy / Safety (project-specific)
- **NFR-018**: The assistant never presents ungrounded information as fact; on no-match, it says so explicitly; on LLM failure, it clearly labels a structured-fallback answer as such (per FR-010).
- **NFR-019**: Every event displays source articles and evidence fields for independent verification. No credibility score is computed or displayed.
- **NFR-020**: No article reaches the event pipeline unless it passed the military-topic filter (FR-005) — non-military content must never appear in results.

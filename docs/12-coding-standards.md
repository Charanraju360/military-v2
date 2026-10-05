# Project Coding Standards / Guidelines

## General Principles
Clean, readable code; DRY; routers/services/repositories separation; small single-purpose functions. **No auth-related code anywhere** — do not add login/session/JWT scaffolding "just in case."

## Naming
- Python: `snake_case.py` files, `PascalCase` classes, `snake_case` functions/vars, `UPPER_SNAKE_CASE` constants.
- React: `PascalCase.tsx` components, `useCamelCase` hooks, `camelCase` vars.
- MongoDB collections: `snake_case` plural (`pipeline_logs`, `event_articles`).
- API routes: `kebab-case` (`/api/pipeline/clean-db`).
- IDs (FR/NFR/API/FEAT/TC/SCR) never renumbered once referenced elsewhere — append new ones.

## Project Structure
Follow `05-system-architecture.md` §12 exactly.

## Frontend Standards
- No `AuthContext`, no protected-route wrapper, no login page — every route mounts directly.
- Shared UI primitives in `src/components/ui/`.
- All API calls through `src/api/client.ts` (no bearer-token logic needed).
- Pipeline Control page (`SCR-006`) polls `/api/pipeline/status` on an interval only while a run is active; polling stops once `running=false`.

## Backend Standards
- Routers: parse/validate → call one service method → return.
- Services: house business rules; `pipeline_orchestrator.py` is the only place that sequences phases and manages the run lock.
- `topic_filter_service.py`: keyword allowlist as a maintainable Python list/config file, not scattered inline strings.
- `ner_embedding_service.py`: prefer the model client's native batch method; if unavailable, use `asyncio.gather` over the batch rather than sequential blocking calls.
- `summarization_service.py`, `assistant_service.py`, and `topic_filter_service.py`: all LLM calls go through `llm_client.py`, which enforces provider order and timeouts centrally.
- `structured_event_fallback.py`: pure local computation, no network import inside it.

## Database Standards
- No `users` collection — do not create one.
- `sources` is the only collection exempt from wipe-on-run/clean.
- All datetimes UTC. `Article.published_at` is never null once ingestion completes (default applied at insert time).

## Error Handling
- Every phase in the orchestrator wraps its logic in try/except, records the exception message into that phase's JSON, and continues to the next phase where safe (or aborts the run cleanly, always releasing the lock).
- LLM calls: a timeout/error goes straight to the next provider or structured fallback to keep latency bounded, per NFR-002.

## Logging
- Structured logs per phase; never log full concatenated article text at INFO (log counts/IDs only).
- Log every fallback trigger (`openrouter_secondary` used, `structured_fallback` used) at WARNING so it's easy to see how often the primary path fails.

## Comments
Document *why*; reference the FEAT/FR ID a function implements in its docstring.

## Dependency Management
No new dependency without justification. Structured fallback should use stored event evidence and standard-library logic unless the docs explicitly approve another dependency.

## Git Conventions
Branch: `feature/<desc>`; commit messages reference FEAT/FR IDs, e.g. `feat(pipeline): implement FEAT-CTRL-01 run pipeline (FR-001)`.

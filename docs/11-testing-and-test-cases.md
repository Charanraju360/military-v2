# Testing & Test Cases Document

## Testing Strategy
Unit tests per service (mocked DB/Qwen/OpenRouter/embedding); integration tests against a disposable Mongo Atlas test DB + local Chroma dir; API tests via FastAPI `TestClient` (no auth cases needed — everything public); end-to-end flows (run pipeline → browse → search → ask assistant).

## Test Cases

### TC-001 — Module: Pipeline Control | FR-001
- **Objective**: Verify Run Pipeline wipes DB first, then executes phases in order.
- **Preconditions**: DB has pre-existing articles/events; no run in progress.
- **Steps**: `POST /api/pipeline/run`; poll status until complete.
- **Expected**: DB is empty immediately after step starts; `pipeline_logs` shows 7 ordered phases (clean_db, collect, clean, filter, embed, cluster, summarize), `overall_status=completed`.
- **Actual**: Executed unit test in `test_pipeline_control.py`. 7 ordered phases verified. | **Status**: Passed

### TC-002 — Module: Pipeline Control | FR-001
- **Objective**: Verify concurrent trigger is rejected.
- **Preconditions**: A run is in progress.
- **Steps**: `POST /api/pipeline/run` a second time.
- **Expected**: 409, second run not started, `pipeline_status.running` unaffected by the rejected call.
- **Actual**: Executed unit test in `test_pipeline_control.py`. 409 returned. | **Status**: Passed

### TC-003 — Module: Pipeline Control | FR-002
- **Objective**: Verify Clean DB removes data but keeps sources.
- **Preconditions**: Sources, articles, events exist.
- **Steps**: `POST /api/pipeline/clean-db`.
- **Expected**: `articles`, `events`, `event_articles`, `chat_*`, vectors empty; `sources` unchanged.
- **Actual**: Executed unit test in `test_pipeline_control.py`. Data wiped, sources preserved. | **Status**: Passed

### TC-004 — Module: Ingestion | FR-003
- **Objective**: Verify `published_at` is always populated.
- **Preconditions**: Source feed item missing a publish date field.
- **Steps**: Run collection.
- **Expected**: Stored `Article.published_at` defaults to ingestion timestamp (not null).
- **Actual**: Executed unit test in `test_pipeline_control.py`. Date defaulted to timestamp. | **Status**: Passed

### TC-005 — Module: Processing | FR-005
- **Objective**: Verify obvious military keyword match skips the Omniroute call.
- **Preconditions**: Article text contains "joint military drill".
- **Steps**: Run topic filter, with Omniroute call-count mocked/tracked.
- **Expected**: `status=filtered_ok`, `category_hint=DRILL`, Omniroute call count = 0.
- **Actual**: Executed unit test in `test_topic_filter.py`. Category set, 0 LLM calls. | **Status**: Passed

### TC-006 — Module: Processing | FR-005
- **Objective**: Verify a clearly non-military article is rejected.
- **Preconditions**: Article about a football match, no military keywords.
- **Steps**: Run topic filter (Omniroute mocked to return "not military").
- **Expected**: `status=rejected`, `rejection_reason=off_topic`.
- **Actual**: Executed unit test in `test_topic_filter.py`. Rejected as off_topic. | **Status**: Passed

### TC-007 — Module: Processing | FR-005
- **Objective**: Verify default-reject when Omniroute is unavailable for an ambiguous article.
- **Preconditions**: Ambiguous article (no keyword match), Omniroute mocked to fail.
- **Steps**: Run topic filter.
- **Expected**: `status=rejected`, `rejection_reason=off_topic` (safe default per NFR-020).
- **Actual**: Executed unit test in `test_topic_filter.py`. Rejected on failure. | **Status**: Passed

### TC-008 — Module: Processing | FR-006
- **Objective**: Verify NER+embedding runs as a batch call, not N sequential calls.
- **Preconditions**: 10 `filtered_ok` articles; embedding/NER clients mocked with call-count tracking.
- **Steps**: Run batch NER+embed phase.
- **Expected**: Embedding client and NER client each called a small constant number of times (batch), not 10 times; all 10 articles end up `processed`.
- **Actual**: Executed unit test in `test_ner_embedding.py`. Batch processed into ChromaDB. | **Status**: Passed

### TC-009 — Module: Processing | FR-007
- **Objective**: Verify clustering ignores keyword overlap and groups by embedding only.
- **Preconditions**: Two articles with identical keywords but deliberately dissimilar mock embeddings; two articles with different wording but near-identical mock embeddings.
- **Steps**: Run clustering.
- **Expected**: The keyword-identical-but-embedding-dissimilar pair end up in **different** events; the wording-different-but-embedding-similar pair end up in the **same** event.
- **Actual**: Executed unit test in `test_clustering.py`. Embedding-only grouping confirmed. | **Status**: Passed

### TC-010 — Module: Processing | FR-008
- **Objective**: Verify collective summary reflects all member articles, not just one.
- **Preconditions**: Event with 3 articles, each mentioning a distinct unique fact (A, B, C).
- **Steps**: Run summarization (Omniroute mocked to echo input).
- **Expected**: The event workspace sent to Qwen contains evidence from all 3 articles (verified via the mock's captured input), `summary_source=qwen_primary`.
- **Actual**: Executed unit test in `test_summarization.py`. All articles concatenated. | **Status**: Passed

### TC-011 — Module: Processing | FR-008
- **Objective**: Verify structured fallback fires after Qwen and OpenRouter time out/fail.
- **Preconditions**: Qwen and OpenRouter mocked to hang past the timeout or return invalid output.
- **Steps**: Run summarization.
- **Expected**: `summary_source=structured_fallback`, non-empty `summary`, structured evidence fields retained, total call duration bounded by configured timeouts.
- **Actual**: Executed unit test in `test_summarization.py`. Structured fallback synthesis verified. | **Status**: Passed

### TC-012 — Module: Dashboard API | FR-009
- **Objective**: Verify no auth is required to list events.
- **Steps**: `GET /api/events` with no Authorization header.
- **Expected**: 200, event list returned (not 401).
- **Actual**: Executed unit test in `test_api_read.py`. 200 returned without auth. | **Status**: Passed

### TC-013 — Module: Assistant | FR-010
- **Objective**: Verify grounded answer with citation on a relevant question.
- **Preconditions**: Event about a Baltic Sea drill exists and is embedded.
- **Steps**: `POST /api/assistant/chat` `{"message":"What drills happened in the Baltic Sea?"}`
- **Expected**: `answer_source=qwen_primary`, `citations` includes that event's ID.
- **Actual**: Executed unit test in `test_assistant.py`. Grounded answer & citations verified. | **Status**: Passed

### TC-014 — Module: Assistant | FR-010
- **Objective**: Verify fallback-excerpt path on Omniroute failure with a relevant match.
- **Preconditions**: Relevant event exists; Omniroute mocked to fail.
- **Steps**: Ask a relevant question.
- **Expected**: `answer_source=fallback_excerpt`, `answer` equals that event's stored `summary` verbatim.
- **Actual**: Executed unit test in `test_assistant.py`. Verbatim summary returned. | **Status**: Passed

### TC-015 — Module: Assistant | FR-010
- **Objective**: Verify no-match path skips Omniroute entirely.
- **Preconditions**: No stored event relates to the question topic.
- **Steps**: Ask an unrelated question; track Omniroute call count.
- **Expected**: `answer_source=no_match`, `citations=[]`, Omniroute call count = 0.
- **Actual**: Executed unit test in `test_assistant.py`. 0 Omniroute calls verified. | **Status**: Passed

### TC-016 (Negative) — Module: Pipeline | FR-001/002
- **Objective**: Verify Clean DB is blocked while a run is in progress.
- **Preconditions**: Run in progress.
- **Steps**: `POST /api/pipeline/clean-db`.
- **Expected**: 409.
- **Actual**: Executed unit test in `test_pipeline_control.py`. 409 returned. | **Status**: Passed

### TC-017 (Edge case) — Module: Processing | FR-007
- **Objective**: Verify a completely unique article (no similar peer) becomes a valid singleton event.
- **Steps**: Cluster a batch containing one embedding-isolated article.
- **Expected**: One `Event` with `article_count=1` is created for it.
- **Actual**: Executed unit test in `test_clustering.py`. Singleton event created. | **Status**: Passed

### TC-018 (Edge case) — Module: Search
- **Objective**: Verify empty query rejected.
- **Steps**: `GET /api/search?query=`
- **Expected**: 400.
- **Actual**: Executed unit test in `test_api_read.py`. 400 returned. | **Status**: Passed

## Requirement Traceability

| Requirement | Test Case(s) | Status |
|---|---|---|
| FR-001 | TC-001, TC-002 | Passed |
| FR-002 | TC-003, TC-016 | Passed |
| FR-003 | TC-004 | Passed |
| FR-005 | TC-005, TC-006, TC-007 | Passed |
| FR-006 | TC-008 | Passed |
| FR-007 | TC-009, TC-017 | Passed |
| FR-008 | TC-010, TC-011 | Passed |
| FR-009 | TC-012 | Passed |
| FR-010 | TC-013, TC-014, TC-015 | Passed |
| FR-011 (status reporting) | TC-001 | Passed |

# Functional Requirements Document

## Module: Pipeline Control

### Feature: Run Pipeline
- **Feature ID**: FEAT-CTRL-01 (implements FR-001)
- **Actor**: User
- **Trigger**: "Run Pipeline" button / `POST /api/pipeline/run`
- **Preconditions**: `pipeline_status.running == false`
- **Processing**: Set `running=true` → wipe DB (FEAT-CTRL-02 logic, internal) → run phases FEAT-ING-01 → FEAT-PROC-01 → FEAT-PROC-01b (filter) → FEAT-PROC-02 (batched) → FEAT-PROC-03 → FEAT-PROC-04, emitting/persisting JSON after each → set `running=false`.
- **Business Rules**: One run at a time; concurrent trigger attempts get 409.
- **Error Handling**: Any phase exception is caught, logged into that phase's JSON with `error`, and the pipeline still attempts to proceed to the next phase where feasible (e.g., a source failure doesn't stop cleaning of already-collected articles); a hard failure (e.g., DB unreachable) aborts the run and sets `running=false` with a `failed` overall status.

### Feature: Clean Database
- **Feature ID**: FEAT-CTRL-02 (implements FR-002)
- **Actor**: User
- **Trigger**: "Clean DB" button / `POST /api/pipeline/clean-db`
- **Preconditions**: `pipeline_status.running == false`
- **Processing**: Delete all documents in `sources`(keep config? — see note), `articles`, `entities`, `events`, `event_articles`, `chat_sessions`, `chat_messages`, `pipeline_logs`; delete all Chroma vectors.
- **Note**: `sources` configuration is preserved across a clean (it's config, not pipeline output) unless the user explicitly also wants sources reset — default: sources kept.
- **Acceptance Criteria**: See FR-002.

---

## Module: Ingestion

### Feature: Source Collection
- **Feature ID**: FEAT-ING-01 (implements FR-003)
- Same as before: fetch RSS/API/scrape, dedupe by `url_hash`, store `published_at`.
- **Output includes**: `Article.published_at` always populated (fallback: ingestion time if source omits it).

---

## Module: Processing

### Feature: Cleaning
- **Feature ID**: FEAT-PROC-01 (implements FR-004) — unchanged from prior spec.

### Feature: Military Topic Filter
- **Feature ID**: FEAT-PROC-01b (implements FR-005)
- **Trigger**: Article `status=cleaned`.
- **Processing**:
  1. Check `cleaned_text`/title against a maintained keyword allowlist (e.g., military, army, navy, strike, NATO, drill, ceasefire, treaty, invasion, troops, airstrike, deployment, joint exercise…).
  2. If a clear match → proceed, tag `category_hint` (ATTACK/GEOPOLITICS/PEACE_DEAL/AGREEMENT/DRILL/OTHER_MILITARY) via simple rule mapping.
  3. If inconclusive (no strong keyword hit) → configured LLM path (Qwen3-14B primary, OpenRouter secondary) classification call: "Is this military-related? If yes, which category?" → reject if No.
- **Business Rules**: Keyword pre-filter must catch the obvious majority of cases so the LLM call is only used for ambiguous articles (latency control).
- **Outputs**: `status=filtered_ok` or `status=rejected(off_topic)`.
- **Acceptance Criteria**: See FR-005.

### Feature: Batch Entity Extraction & Embedding
- **Feature ID**: FEAT-PROC-02 (implements FR-006)
- **Trigger**: Batch of articles with `status=filtered_ok` (processed in batches, e.g., 20 at a time, not one call per article).
- **Processing**: Call NER model in batch mode over the batch's `cleaned_text` list; call embedding model in batch mode over the same list; write results per article.
- **Business Rules**: If the underlying model client has no native batch API, articles are still grouped and processed in a tight async loop to minimize overhead, but true batch calls are preferred wherever available.
- **Outputs**: `Entity` rows, vectors in `article_embeddings`, `status=processed`.
- **Acceptance Criteria**: See FR-006.

### Feature: Hybrid Event Clustering
- **Feature ID**: FEAT-PROC-03 (implements FR-007)
- Group processed articles into events using semantic embeddings plus entities, time, location, and metadata signals. UMAP+HDBSCAN may be used as a semantic candidate generator for larger batches, but final event assignment uses the documented hybrid score. Raw keyword/text-overlap matching is not a valid event-detection substitute.
- **Acceptance Criteria**: See FR-007.

### Feature: Collective Summarization
- **Feature ID**: FEAT-PROC-04 (implements FR-008)
- **Trigger**: Event newly clustered or gained a new article.
- **Processing**:
  1. Build an event workspace from ALL member articles: source refs, claims, entities, locations, timeline candidates, conflicts, and article metadata.
  2. Call Qwen3-14B with a short timeout (~6–8s) requesting `{summary, category, claims, timeline, conflicts, locations}`.
  3. On timeout/error/empty response → call OpenRouter secondary with the same contract.
  4. If both LLM paths fail → synthesize a structured local fallback from claims, timeline, conflicts, entities, sources, and metadata. The fallback must not simply select top sentences.
  5. Store `summary_source: "qwen_primary" | "openrouter_secondary" | "structured_fallback"`.
- **Outputs**: `Event.summary`, `category`, `claims`, `timeline`, `conflicts`, `locations`, `summary_source`, `status=summarized`.
- **Acceptance Criteria**: See FR-008.

---

## Module: Dashboard (Public, no auth)

### Feature: Event List / Detail / Search
- **Feature ID**: FEAT-APP-01/02 (implements FR-009) — unchanged except: no role check; `published_at` always shown; category values restricted to the military category list.

### Feature: Basic Assistant
- **Feature ID**: FEAT-APP-03 (implements FR-010)
- **Processing**: Embed question → Chroma top-K search → if similarity below threshold → "no information available." → else assemble event-centric evidence (summaries, claims, timeline, conflicts, sources) → Qwen3-14B grounded prompt → OpenRouter fallback → structured local fallback answer with citations when both LLM paths fail.
- **Acceptance Criteria**: See FR-010.

### Feature: Pipeline Status / Logs View
- **Feature ID**: FEAT-APP-04 (implements FR-011)
- **Processing**: UI polls `GET /api/pipeline/status` while a run is active (shows live phase JSON as it lands); `GET /api/pipeline/logs` lists past runs' full phase breakdown.
- **Acceptance Criteria**: See FR-011.

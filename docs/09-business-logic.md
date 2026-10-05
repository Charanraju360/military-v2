# Business Logic Document

## Workflow: Run Pipeline (top-level orchestration)
- **Trigger**: `POST /api/pipeline/run`
- **Actor**: User
- **Preconditions**: `pipeline_status.running == false`

**Step 1**: Set `pipeline_status.running=true`, create new `pipeline_logs` doc (`overall_status=running`).
**Step 2**: Wipe DB — delete all `articles`, `entities`, `events`, `event_articles`, `chat_sessions`, `chat_messages` (keep `sources`); delete all Chroma vectors. Emit/append phase `{phase:"clean_db", status:"done"}`.
**Step 3**: Run Collection workflow → append its phase JSON.
**Step 4**: Run Cleaning workflow → append.
**Step 5**: Run Topic Filter workflow → append.
**Step 6**: Run Batch NER+Embedding workflow → append.
**Step 7**: Run Clustering workflow → append.
**Step 8**: Run Collective Summarization workflow → append.
**Step 9**: Set `overall_status=completed`, `completed_at=now`, `pipeline_status.running=false`.

**Error Handling**: Any phase raising an unrecoverable exception → mark that phase's JSON with `error`, set `overall_status=failed`, still set `running=false` (never leave the lock stuck).
**Business Rules**: Steps always run in this exact order; no phase is skipped even if the prior phase produced zero items (a zero-count phase just logs zeros and moves on).

---

## Workflow: Article Collection (unchanged mechanics, date required)
Same as prior spec (fetch → dedupe by url_hash → insert `Article[status=ingested]`), with the added rule: **`published_at` is always set** — parsed from the source if present, else defaulted to the collection timestamp. Phase output: `{phase:"collect", new:N, skipped_dupes:N, source_errors:[...]}`.

---

## Workflow: Cleaning
Unchanged (strip HTML, reject <100 chars). Phase output: `{phase:"clean", cleaned:N, rejected_short:N}`.

---

## Workflow: Military Topic Filter (NEW)
- **Trigger**: Article `status=cleaned`.

**Step 1**: Lowercase-match `title + cleaned_text` (first ~500 chars) against the military keyword allowlist.
**Step 2**: If matched → `status=filtered_ok`, set `category_hint` via simple rule table (e.g., "drill"/"exercise" → DRILL; "ceasefire"/"treaty" → PEACE_DEAL; "strike"/"attack" → ATTACK; "NATO"/"summit"/"alliance" → GEOPOLITICS; "agreement"/"pact" → AGREEMENT; else OTHER_MILITARY).
**Step 3**: If no keyword match → call the configured LLM path once (Qwen3-14B primary, OpenRouter secondary): "Classify as military or not; if military, which category." Timeout 6s.
**Step 4**: The LLM path says non-military, or all configured LLM paths fail with no keyword fallback possible → `status=rejected`, `rejection_reason=off_topic`.
**Step 5**: The LLM path says military → `status=filtered_ok`, `category_hint` = its answer.

**Business Rules**: The keyword pre-filter is intentionally biased toward catching obvious matches cheaply; only genuinely ambiguous articles reach the LLM call, keeping latency down (NFR-002/003).
**Edge Cases**: Qwen/OpenRouter unreachable during an ambiguous check → article is rejected by default (`off_topic`, reason `classification_unavailable`) rather than let through unchecked — safer default given NFR-020 (no non-military content in results).
Phase output: `{phase:"filter", filtered_ok:N, rejected_offtopic:N}`.

---

## Workflow: Batch NER + Embedding (updated)
- **Trigger**: Batch of `filtered_ok` articles (grouped, e.g. 20 at a time).

**Step 1**: Collect `cleaned_text` for the batch.
**Step 2**: Call NER model in batch mode (single call for the batch, or the client's most efficient batching pattern) → entity lists per article.
**Step 3**: Call embedding model in batch mode → vectors per article.
**Step 4**: Deduplicate entities per article, upsert vectors into `article_embeddings`, set `status=processed`.
**Business Rules**: Batching exists specifically to reduce total call overhead vs. one-call-per-article (per project's "less latency" requirement).
Phase output: `{phase:"embed", processed:N, failed:N}`.

---

## Workflow: Hybrid Event Clustering (redesigned)
- **Trigger**: Article `status=processed`.

**Step 1**: Load article embeddings from ChromaDB and structured metadata from MongoDB: entities, location entities, `published_at`, source ids, and category hints.
**Step 2**: Compute pairwise event relatedness using configurable weights:
- semantic embedding similarity
- entity overlap
- location overlap
- temporal proximity
- lightweight metadata compatibility
**Step 3**: Build connected clusters for articles whose weighted relatedness passes the configured hybrid threshold. For larger batches, UMAP+HDBSCAN may still be used as a semantic candidate generator, but final event grouping uses the documented hybrid score.
**Step 4**: Persist `Event`, `EventArticle`, event centroid embedding, and `hybrid_cluster_metadata`.

**Business Rules**: The clustering workflow may use already-extracted structured signals, but must not use raw keyword/text-overlap matching as a substitute for event detection.
Phase output: `{phase:"cluster", events_created:N, singleton_events:N, hybrid_signals:["semantic","entity","location","time","metadata"]}`.

---

## Workflow: Collective Summarization (updated)
- **Trigger**: Event `status=clustered` (or gained a new article since last summarized — not applicable mid-run since a run always starts from empty, but kept for architectural consistency).

**Step 1**: Assemble an event workspace from **all** member articles: article metadata, source refs, extracted entities, location entities, timestamps, initial claims, potential timeline entries, and potential cross-source conflicts.
**Step 2**: Call Qwen3-14B primary with the event workspace, requesting structured JSON: `{summary, category, claims, timeline, conflicts, locations}`. Timeout 6–8s.
**Step 3 (primary failure/timeout/empty)**: Call the configured OpenRouter secondary model with the same event workspace and the same JSON contract.
**Step 4 (all LLM paths fail/timeout/empty)**: Run structured local fallback over the event workspace. The fallback synthesizes from claims, timeline, entities, conflicts, source refs, and metadata. It must not simply select top sentences, concatenate article excerpts, or pretend extraction is summarization.
**Step 5**: Validate category against the fixed enum, defaulting to majority `category_hint` among member articles if invalid; store structured fields and `summary_source`.
**Step 6**: Set `status=summarized`.

**Business Rules**: The summary always reflects the **combined** content of the whole cluster — never generated from just one member article.
Phase output: `{phase:"summarize", summarized:N, fallback_used:N, failed:N}`.

---

## Workflow: Basic RAG Assistant (updated, no auth)
**Step 1**: Embed the user's message.
**Step 2**: Vector-search `event_embeddings` top-K (default 5).
**Step 3**: If best similarity < threshold → `answer_source=no_match`, fixed "no information" text, `citations=[]`. Skip Omniroute entirely.
**Step 4**: Else, assemble event-centric evidence: summaries, claims, timeline, conflicts, source refs, and citations from retrieved events.
**Step 5**: Call Qwen3-14B primary, then OpenRouter secondary on failure/timeout, using a grounded prompt over the event evidence.
**Step 6 (LLM success)**: `answer_source=qwen_primary` or `openrouter_secondary`, parse answer + citations.
**Step 7 (all LLM paths fail)**: `answer_source=structured_fallback` — return a concise answer synthesized from the retrieved event evidence and cite the matched events.
**Step 6**: Persist user + assistant `ChatMessage` rows under the (anonymous, browser-scoped) session.

**Business Rules**: The assistant is event-centric — retrieve events and their structured evidence, ground the answer, and cite stored event/source evidence. It must not answer from unrelated top article chunks.

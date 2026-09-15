# API Specification Document

Base path: `/api`. **No authentication on any endpoint** — fully public.

---

## Module: Pipeline

### API-001 — Run Pipeline
- **Endpoint**: `/api/pipeline/run`
- **Method**: POST
- **Purpose**: Wipe DB then run the full pipeline.
- **Request Body**: none
- **Success Response** (202 Accepted — async run started):
```json
{ "run_id": "665f9a...", "status": "running" }
```
- **Error Responses**: 409 `{ "detail": "Pipeline already running" }`

### API-002 — Pipeline Status (poll)
- **Endpoint**: `/api/pipeline/status`
- **Method**: GET
- **Success Response** (200):
```json
{ "running": true, "current_run_id": "665f9a...", "current_phase": "cluster",
  "phases_so_far": [ {"phase":"clean_db","status":"done"}, {"phase":"collect","new":40,"skipped_dupes":6} ] }
```

### API-003 — Clean Database
- **Endpoint**: `/api/pipeline/clean-db`
- **Method**: POST
- **Success Response** (200): `{ "status": "cleaned" }`
- **Error Responses**: 409 if a run is in progress.

### API-004 — List Pipeline Run Logs
- **Endpoint**: `/api/pipeline/logs`
- **Method**: GET
- **Query Parameters**: `page`, `page_size`
- **Success Response** (200): `{ "items": [ { "run_id":"...", "started_at":"...", "overall_status":"completed", "phases":[...] } ] }`

---

## Module: Events

### API-005 — List Events
- **Endpoint**: `/api/events`
- **Method**: GET
- **Query Parameters**: `category` (ATTACK|GEOPOLITICS|PEACE_DEAL|AGREEMENT|DRILL|OTHER_MILITARY), `date_from`, `date_to`, `min_credibility`, `page`, `page_size`
- **Success Response** (200):
```json
{ "items": [ { "id":"665f1a...", "category":"DRILL", "summary":"...", "credibility_score":78.5,
  "article_count":4, "latest_article_at":"2026-08-20T10:15:00Z" } ], "page":1, "total":7 }
```

### API-006 — Get Event Detail
- **Endpoint**: `/api/events/{event_id}`
- **Method**: GET
- **Success Response** (200):
```json
{ "id":"665f1a...", "summary":"...", "summary_source":"omniroute", "category":"DRILL",
  "credibility_score":78.5,
  "articles":[ { "id":"665e02...", "title":"...", "source":"Reuters", "url":"...", "published_at":"2026-08-19T08:00:00Z" } ],
  "entities":[ {"text":"NATO","type":"ORG"} ] }
```
- **Error Responses**: 404

---

## Module: Search

### API-007 — Search Events
- **Endpoint**: `/api/search`
- **Method**: GET
- **Query Parameters**: `query` (required, ≤300 chars), `mode` (keyword|semantic, default semantic), `page`, `page_size`
- **Success Response** (200): `{ "items":[ {"id":"...", "summary":"...", "relevance_score":0.87} ], "total":3 }`
- **Error Responses**: 400 empty query

---

## Module: Assistant

### API-008 — Send Chat Message
- **Endpoint**: `/api/assistant/chat`
- **Method**: POST
- **Request Body**: `{ "message": "What drills happened this week?", "session_id": "665c00..." }` (`session_id` optional, browser-generated if new)
- **Success Response** (200):
```json
{ "session_id":"665c00...", "answer":"This week, a joint naval drill took place in the Baltic Sea...",
  "citations":["665f1a..."], "answer_source":"omniroute" }
```
- On Omniroute failure with a relevant match:
```json
{ "session_id":"665c00...", "answer":"<event's stored summary verbatim>", "citations":["665f1a..."], "answer_source":"fallback_excerpt" }
```
- On no relevant match:
```json
{ "session_id":"665c00...", "answer":"I don't have information on that.", "citations":[], "answer_source":"no_match" }
```
- **Validation**: `message` non-empty, ≤1000 chars.

### API-009 — Get Session Messages
- **Endpoint**: `/api/assistant/sessions/{session_id}/messages`
- **Method**: GET
- **Success Response** (200): `{ "items":[ {"role":"user","text":"..."}, {"role":"assistant","text":"...","citations":[...],"answer_source":"omniroute"} ] }`

---

## Module: Sources (public — no admin gate)

### API-010 — List Sources
- **Endpoint**: `/api/sources` — Method: GET

### API-011 — Create Source
- **Endpoint**: `/api/sources` — Method: POST
- **Request Body**: `{ "name":"Reuters World", "type":"rss", "url":"https://...", "trust_rating":85 }`
- **Success Response** (201): created source.
- **Error Responses**: 409 duplicate URL, 400 validation

### API-012 — Update Source
- **Endpoint**: `/api/sources/{source_id}` — Method: PATCH

### API-013 — Disable Source
- **Endpoint**: `/api/sources/{source_id}` — Method: DELETE (soft: `active=false`)

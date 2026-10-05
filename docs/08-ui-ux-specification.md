# UI/UX Design Specification

No login anywhere. Every screen is public and reachable directly.

## General Visual System
Same as before: minimal dashboard style, one shared component set (`Card`, `Button`, `Badge`, `Modal`, `Table`), consistent spacing/typography, responsive under 768px.

## SCR-001 — Event Feed (Home)
- **Route**: `/` (default landing page — no login redirect)
- **Layout**: Header (logo, search bar, nav: Feed/Search/Assistant/Sources/Pipeline) + filter sidebar (category from military list, date range) + event card grid + pagination.
- **EventCard shows**: category badge, collective summary excerpt, article count, **publish-date range** (`first_article_at`–`latest_article_at`), "view" link.
- **Empty State**: "No events yet — run the pipeline from the Pipeline Control page." with a shortcut link.
- **Loading/Error States**: as before.

## SCR-002 — Event Detail
- **Route**: `/events/:eventId`
- **Layout**: category badge, **collective summary** (clearly labeled "Summary of N articles"), `summary_source` shown subtly, claims/timeline/conflicts where available, entity tags, article table with **published date column**, "Ask the assistant about this" button.

## SCR-003 — Search
- **Route**: `/search?q=...`
- Same as before: mode toggle keyword/semantic, results as EventCards with relevance + date.

## SCR-004 — Assistant Chat
- **Route**: `/assistant`
- **Layout**: session list (left) + chat thread (right).
- **Assistant message rendering**: normal answer + citation chips when `answer_source=qwen_primary` or `openrouter_secondary`; a small "(from stored event evidence - AI was unavailable)" label when `answer_source=structured_fallback`; plain "no info" bubble when `answer_source=no_match`.
- **Input**: message box, Send button, "New chat".

## SCR-005 — Sources
- **Route**: `/sources`
- **Purpose**: View/add/edit/disable ingestion sources. No admin gate — anyone can manage sources.
- **Layout**: Table (name, type, url, trust rating, active toggle) + "Add source" modal.

## SCR-006 — Pipeline Control (NEW, replaces Admin screens)
- **Route**: `/pipeline`
- **Purpose**: Trigger the pipeline, clean the DB, watch live phase-by-phase JSON, review past run logs.
- **Layout**:
  - Top: two buttons — **"Run Pipeline"** (disabled while `running=true`) and **"Clean DB"** (disabled while running).
  - Confirmation dialog on both buttons: "This will erase all current data. Continue?"
  - Live status panel: while running, polls `GET /api/pipeline/status` (e.g. every 1–2s) and appends each completed phase's JSON as a readable card (phase name, key counts, any errors highlighted in red).
  - History section below: list of past runs (`GET /api/pipeline/logs`), each expandable to show its full phase breakdown.
- **States**: Idle (buttons enabled, "no run in progress"), Running (buttons disabled, live phase cards streaming in), Completed (summary banner: "Pipeline finished — N events created"), Failed (error banner with the failing phase highlighted).
- **Validation**: Run/Clean blocked client-side (button disabled) and server-side (409) if already running.

## Global Navigation
Header nav: Feed, Search, Assistant, Sources, Pipeline. No login/profile/logout — none of that exists.

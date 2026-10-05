# Project Proposal

## 1. Title
AI-Based Military OSINT Event Intelligence Platform (OSINT-EIP)

## 2. Introduction
OSINT-EIP collects military-related news (attacks, geopolitics, peace deals, agreements, drills), clusters articles describing the same real event by semantic meaning, produces one collective summary per event via LLM (with local fallback), and serves it through a public, no-login dashboard with a basic RAG Q&A assistant.

## 3. Background
Military/geopolitical news is duplicated across many outlets. Manually tracking and deduplicating it is slow.

## 4. Problem Statement
No lightweight self-hosted tool exists that (a) filters to military-relevant news only, (b) groups articles by actual meaning (not keywords) into one event, (c) gives one collective summary per event, and (d) lets a user ask questions grounded only in stored data — fast, and with no login friction.

## 5. Proposed System
A manually-triggered pipeline: wipe DB → collect → clean → military-topic filter → NER+embed → hybrid event clustering → structured collective LLM summarize (Qwen3-14B, OpenRouter secondary, structured fallback) → serve via public dashboard + event-centric assistant. Every phase emits a JSON status the user can read.

## 6. Objectives
- OBJ-1: Ingest from RSS/API/scrape sources on manual trigger.
- OBJ-2: Reject any non-military article before it becomes an event.
- OBJ-3: Cluster purely on embedding similarity — zero keyword-matching logic.
- OBJ-4: One collective summary per event, covering all its member articles.
- OBJ-5: Qwen3-14B-first summarization with OpenRouter secondary and structured local fallback on failure/timeout.
- OBJ-6: Public dashboard, no auth, no roles, no login screen.
- OBJ-7: Manual "Run Pipeline" (wipes DB then runs) and standalone "Clean DB" controls, each phase reporting JSON status.
- OBJ-8: Low latency throughout — async pipeline, fast vector search, short LLM timeouts.

## 7. Scope
**In Scope**: military-news ingestion, cleaning, topic filtering, embedding, clustering, collective summarization w/ fallback, public dashboard, search, basic RAG assistant, manual pipeline trigger, clean-DB action, phase-level JSON status/logs.
**Out of Scope**: authentication/roles, scheduled auto-ingestion, non-military news, translation, predictive analytics, incremental (non-wipe) pipeline runs.

## 8. Target Users
Single anonymous user — anyone opening the site sees the full dashboard directly. No user accounts.

## 9. Major Features
1. Manual pipeline trigger (auto-wipes DB first)
2. Standalone Clean DB button
3. Military-only topic filter (cheap keyword pre-filter + LLM classify for borderline cases)
4. Meaning-based clustering (embeddings only)
5. Collective per-event summarization (Qwen3-14B → OpenRouter → structured fallback)
6. Article publish date shown
7. Public event dashboard (filter/search)
8. Semantic + keyword search
9. Event-centric RAG assistant (Qwen3-14B → OpenRouter → structured fallback)
10. Per-phase JSON pipeline status/log

## 10. Technology Stack
- Frontend: React + Tailwind
- Backend: FastAPI (Python)
- Database: MongoDB Atlas (cloud, via connection string)
- Vector store: ChromaDB
- Clustering: UMAP + HDBSCAN (embeddings only)
- NER: spaCy / GLiNER
- Summarization/RAG: Qwen3-14B (primary) → OpenRouter (secondary) → structured local fallback
- No auth layer

## 11. Expected Outcome
A fast, public, single-page-feeling platform: click "Run Pipeline," watch phase-by-phase JSON progress, then browse deduplicated military events with collective summaries, dates, claims, timeline, conflicts, and ask the assistant grounded questions.

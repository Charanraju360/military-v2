# Definition of Done

## Feature-Level Definition of Done
```text
[ ] Requirement implemented (traces to FR-xxx)
[ ] Business logic implemented per 09-business-logic.md
[ ] UI implemented per 08-ui-ux-specification.md (if user-facing)
[ ] API implemented per 07-api-specification.md (if API-exposed) — confirmed NO auth check added
[ ] Database integration matches 06-database-design.md
[ ] Input validation implemented
[ ] Error handling implemented for documented error conditions, including Omniroute-fail fallback paths where applicable
[ ] Unit tests written
[ ] Mapped TC-xxx executed and passing
[ ] Code follows 12-coding-standards.md
[ ] No unrelated files modified
[ ] Existing functionality re-verified (no regressions)
[ ] Latency-sensitive paths (Omniroute calls, batch NER/embed, vector search) confirmed to use their documented timeout/batching approach
```

## Project-Level Definition of Done
```text
[ ] All FR-xxx implemented
[ ] All API-xxx implemented and match contracts, and confirmed to require NO authentication
[ ] All SCR-xxx screens implemented, reachable directly with no login redirect
[ ] All DB collections match 06-database-design.md; no `users` collection exists
[ ] All TC-xxx executed with recorded results
[ ] Full pipeline (Run Pipeline button) runs end-to-end: wipe → collect → clean → filter → embed → cluster → summarize, against at least one real source
[ ] Clean DB button verified to wipe data while preserving `sources`
[ ] Military topic filter verified to reject non-military test articles
[ ] Clustering verified to ignore keyword overlap (embedding-only)
[ ] Omniroute→TextRank fallback verified to trigger correctly on simulated failure
[ ] Assistant fallback-excerpt and no-match paths both verified
[ ] Per-phase JSON status verified visible in UI during a live run and retrievable afterward from pipeline_logs
[ ] README.md and CLAUDE.md reflect the final (no-auth, Atlas, Omniroute+TextRank) design
[ ] Cross-document consistency re-verified across all 15 docs + implementation
```

## Non-Goals
Authentication/roles, scheduled auto-ingestion, incremental (non-wipe) runs, formal load testing, translation, predictive analytics — all explicitly out of scope per `01-project-proposal.md`.

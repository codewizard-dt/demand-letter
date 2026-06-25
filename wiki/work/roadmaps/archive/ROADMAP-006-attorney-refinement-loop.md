---
id: ROADMAP-006
title: Attorney Refinement Loop
status: done
created: 2026-06-22
updated: 2026-06-25
owner: David Taylor
linked_decisions: [DEC-0003]
tags: [refinement, chat, sse, diff, attorney-ux]
---

# ROADMAP-006: Attorney Refinement Loop

Allow attorneys to give further instructions on a generated draft to refine it via AI — the scoped second-pass Claude call the PRD requires. Instructions are scoped to a section (or the whole letter), streamed back in real-time, and the attorney can diff, accept, or revert the change.

---

### Phase 1 — Backend

- [x] [[TASK-060: refinements DB table — Prisma model + migration]]
- [x] [[TASK-061: POST /jobs/:id/refine handler — SSE streaming, scope filtering, persist, audit log]]
- [x] [[TASK-061: POST /jobs/:id/refine handler — SSE streaming, scope filtering, persist, audit log]] _(scope filtering — covered by handler)_
- [x] [[TASK-061: POST /jobs/:id/refine handler — SSE streaming, scope filtering, persist, audit log]] _(persist before/after on stream completion)_
- [x] [[TASK-061: POST /jobs/:id/refine handler — SSE streaming, scope filtering, persist, audit log]] _(LlmAuditLog via provider wrapper)_

---

### Phase 2 — Frontend

- [x] [[TASK-063: Refinement panel UI — instruction input, SSE consumer, inline diff, accept/revert buttons]]
- [x] [[TASK-063: Refinement panel UI — instruction input, SSE consumer, inline diff, accept/revert buttons]] _(SSE consumer + inline preview)_
- [x] [[TASK-063: Refinement panel UI — instruction input, SSE consumer, inline diff, accept/revert buttons]] _(diff view)_
- [x] [[TASK-062: PATCH accept/reject refinement endpoints — update jobs.output_text on accept]]
- [x] [[TASK-062: PATCH accept/reject refinement endpoints — update jobs.output_text on accept]] _(reject/revert endpoint)_
- [x] [[TASK-064: Refinement history list — collapsible panel of past instructions and acceptance status]]

---

### Phase 3 — Verification

- [x] [[TASK-065: E2E verification — attorney refinement loop (all Phase 3 scenarios)]]
- [x] [[TASK-065: E2E verification — attorney refinement loop (all Phase 3 scenarios)]] _(scoped instruction: medical_narrative only)_
- [x] [[TASK-065: E2E verification — attorney refinement loop (all Phase 3 scenarios)]] _(revert after accept)_
- [x] [[TASK-065: E2E verification — attorney refinement loop (all Phase 3 scenarios)]] _(refinements table data integrity)_
- [x] [[TASK-065: E2E verification — attorney refinement loop (all Phase 3 scenarios)]] _(cost dashboard: refinement rows)_

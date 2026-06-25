---
id: ROADMAP-004
title: Generation Engine
status: done
created: 2026-06-22
updated: 2026-06-25 <!-- TASK-050 completed -->
owner: David Taylor
linked_decisions: [DEC-0001, DEC-0002, DEC-0003]
tags: [generation, docxtemplater, grounded, medical-narrative, sse]
---

# ROADMAP-004: Generation Engine

Replace the naive free-text Claude generation with a deterministic docxtemplater-driven fill: assemble the data object from the provenance store, boilerplate zones stay byte-exact from the template, and Claude on Bedrock generates _only_ the medical narrative zone (§4) — the one zone where AI provides the most leverage. The final output is a properly structured DOCX that matches the template exactly.

---

### Phase 1 — Data Assembly & Sufficiency Pre-check

- [x] [[TASK-036: Generation data builder: assemble docxtemplater data object from extracted_fields]] → wiki/work/tasks/archive/TASK-036-generation-data-builder.md
- [x] [[TASK-037: Sufficiency pre-check: fail fast with 400 if any required template slot is uncovered]] → wiki/work/tasks/completed/TASK-037-sufficiency-precheck-generate-gate.md
- [x] [[TASK-038: field-schema.ts: centralize snake_case → camelCase docxtemplater tag mapping]] → wiki/work/tasks/archive/TASK-038-field-schema-ts-canonical-mapping.md
- [x] [[TASK-039: Loop fields: handle {#specials}…{/specials} per-provider line items in data object]] → wiki/work/tasks/completed/TASK-039-loop-fields-per-provider-specials.md

---

### Phase 2 — Medical Narrative Generation

- [x] [[TASK-040: Medical narrative Bedrock prompt: generate §4 prose from extracted medical blocks]] → wiki/work/tasks/completed/TASK-040-medical-narrative-bedrock-prompt.md
- [x] [[TASK-041: Grounding constraint: validate medical narrative citations against provided block IDs]] → wiki/work/tasks/completed/TASK-041-medical-narrative-grounding-constraint.md
- [x] [[TASK-042: SSE streaming: stream medical narrative tokens to frontend while docxtemplater fill waits]] → wiki/work/tasks/completed/TASK-042-sse-streaming-medical-narrative.md
- [x] [[TASK-043: LlmAuditLog: verify medical_narrative feature rows are written correctly]] → wiki/work/tasks/completed/TASK-043-llm-audit-log-medical-narrative.md

---

### Phase 3 — docxtemplater Render

- [x] [[TASK-044: docxtemplater render: load tagged template DOCX from S3 and render with data object]] → wiki/work/tasks/completed/TASK-044-docxtemplater-render-s3-template-load.md
- [x] Set `nullGetter`: if a slot is unexpectedly missing from the data object, **fail closed** — throw a structured error rather than silently rendering an empty field (implemented in TASK-044 / docx-renderer.ts)
- [x] `render(data)`: insert all field values; boilerplate zones outside tags are reproduced byte-exact (no LLM routing); loops and conditionals (`{#hasLiens}…{/hasLiens}`) resolved from data (implemented in TASK-044 / docx-renderer.ts)
- [x] Catch docxtemplater structured errors (`unopened_tag`, `unclosed_tag`, `multi_error`) and return a 500 with the error payload — never emit a partially-filled document (implemented in TASK-044 / docx-renderer.ts)
- [x] [[TASK-048: Wire renderTemplate into post-jobs-generate.ts: upload DOCX to S3 and set jobs.status = complete]] → wiki/work/tasks/archive/TASK-048-save-docx-to-s3-complete-job.md

---

### Phase 4 — Frontend Upgrade

- [x] [[TASK-047: Generate Button Gap Gate: Disable Until Gap Report Clears]] → wiki/work/tasks/completed/TASK-047-generate-button-gap-gate.md
- [x] [[TASK-046: SSE consumer: parse SSE stream from POST /jobs/:id/generate and show "Building document…" progress indicator]] → wiki/work/tasks/completed/TASK-046-sse-consumer-frontend-progress-indicator.md
- [x] [[TASK-050: GET /jobs/:id/output presigned URL endpoint and Download DOCX button]] → wiki/work/tasks/completed/TASK-050-presigned-url-download-docx-button.md
- [x] [[TASK-049: Citation Panel: Extraction Review Sidebar with Block Highlighting]] → wiki/work/tasks/completed/TASK-049-citation-panel-extraction-review.md

---

### Phase 5 — Verification

- [x] [[TASK-045: ROADMAP-004 Phase 5 — End-to-End Verification: Full Pipeline Smoke Test]] → wiki/work/tasks/completed/TASK-045-roadmap-004-phase-5-e2e-verification.md

---
title: Tasks Index
updated: 2026-06-24
---

# Tasks — Active Items

Lists **only active** tasks (`todo`, `in-progress`). When a task leaves the active set (`done`, `trashed`), delete its line here — the file itself never moves; status lives in its frontmatter. See the [lifecycle](lifecycle.md).

Entry format: `- [TASK-NNN — Title](TASK-NNN-slug.md) — one-line summary · status`

- [TASK-005 — Bedrock Model Access — Verify Inference Profile and Smoke-Test](TASK-005-bedrock-model-access.md) — verify us. inference profile ID and smoke-test invocation · todo
- [TASK-032 — ROADMAP-003 Phase 1–2: Case-Record Document Type Branching, Textract Async, Provenance Store Schema, and Block Enumeration API](TASK-032-case-record-ingestion-phase-1-2.md) — implement document type detection, async Textract, and provenance store (blocks table + GET /jobs/:id/blocks API) · todo
- [TASK-033 — ROADMAP-003 Phase 3 — Grounded Extraction: Claude on Bedrock with per-field block_id citations, structured tool_use output, extracted_fields DB table, and LlmAuditLog integration](TASK-033-grounded-extraction-phase-3.md) — Claude on Bedrock reads full block list and fills the canonical ~40-field schema with per-field block_id citations, persisted in extracted_fields table, logged to LlmAuditLog · todo
- [TASK-034 — ROADMAP-003 Phase 4 — Sufficiency Gate & Gap Report](TASK-034-sufficiency-gate-gap-report.md) — compare extracted_fields against template_slots with configurable confidence threshold, produce gap report, attorney-judgment UI for uncovered slots, generation gate · todo
- [TASK-035 — ROADMAP-003 Phase 5 — End-to-End Verification](TASK-035-roadmap-003-phase-5-e2e-verification.md) — upload Pat Donahue case documents, verify full pipeline: Textract/parse → blocks in DB → Claude extraction → gap report surfaces three attorney-judgment fields → attorney fills → gap clears; assert block_id citations; assert cost dashboard case-extraction rows · todo
- [TASK-036 — Generation Data Builder](TASK-036-generation-data-builder.md) — assemble docxtemplater data object from extracted_fields + attorney-judgment values for a given job · todo
- [TASK-037 — Sufficiency Pre-check for Generation Gate](TASK-037-sufficiency-precheck-generate-gate.md) — fail fast with 400 if any required template slot is uncovered before generation · todo
- [TASK-038 — field-schema.ts Canonical Field Mapping](TASK-038-field-schema-ts-canonical-mapping.md) — centralize snake_case → camelCase docxtemplater tag mapping in a single source of truth · todo
- [TASK-039 — Loop Fields: Per-Provider Specials Table](TASK-039-loop-fields-per-provider-specials.md) — handle {#specials}…{/specials} loop syntax for per-provider line items in the data object · todo
- [TASK-040 — Medical Narrative Bedrock Prompt](TASK-040-medical-narrative-bedrock-prompt.md) — generate §4 prose from extracted medical blocks via Claude on Bedrock with medical_narrative feature · todo
- [TASK-041 — Medical Narrative Grounding Constraint](TASK-041-medical-narrative-grounding-constraint.md) — validate that every factual claim in the narrative cites a provided block ID · todo
- [TASK-042 — SSE Streaming for Medical Narrative](TASK-042-sse-streaming-medical-narrative.md) — stream medical narrative tokens to frontend via SSE while docxtemplater fill waits · todo
- [TASK-043 — LlmAuditLog for Medical Narrative](TASK-043-llm-audit-log-medical-narrative.md) — verify medical_narrative LlmAuditLog rows are written and appear in cost dashboard · todo
- [TASK-044 — docxtemplater Render: Load Tagged Template from S3](TASK-044-docxtemplater-render-s3-template-load.md) — load tagged template DOCX from S3 and render with data object using docxtemplater · todo

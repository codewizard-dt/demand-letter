---
id: ROADMAP-004
title: Generation Engine
status: active
created: 2026-06-22
updated: 2026-06-24
owner: David Taylor
linked_decisions: [DEC-0001, DEC-0002, DEC-0003]
tags: [generation, docxtemplater, grounded, medical-narrative, sse]
---

# ROADMAP-004: Generation Engine

Replace the naive free-text Claude generation with a deterministic docxtemplater-driven fill: assemble the data object from the provenance store, boilerplate zones stay byte-exact from the template, and Claude on Bedrock generates _only_ the medical narrative zone (§4) — the one zone where AI provides the most leverage. The final output is a properly structured DOCX that matches the template exactly.

---

### Phase 1 — Data Assembly & Sufficiency Pre-check

- [ ] [[TASK-036: Generation data builder: assemble docxtemplater data object from extracted_fields]]
- [ ] [[TASK-037: Sufficiency pre-check: fail fast with 400 if any required template slot is uncovered]]
- [ ] [[TASK-038: field-schema.ts: centralize snake_case → camelCase docxtemplater tag mapping]]
- [ ] [[TASK-039: Loop fields: handle {#specials}…{/specials} per-provider line items in data object]]

---

### Phase 2 — Medical Narrative Generation

- [ ] [[TASK-040: Medical narrative Bedrock prompt: generate §4 prose from extracted medical blocks]]
- [ ] [[TASK-041: Grounding constraint: validate medical narrative citations against provided block IDs]]
- [ ] [[TASK-042: SSE streaming: stream medical narrative tokens to frontend while docxtemplater fill waits]]
- [ ] [[TASK-043: LlmAuditLog: verify medical_narrative feature rows are written correctly]]

---

### Phase 3 — docxtemplater Render

- [ ] [[TASK-044: docxtemplater render: load tagged template DOCX from S3 and render with data object]]
- [ ] Set `nullGetter`: if a slot is unexpectedly missing from the data object, **fail closed** — throw a structured error rather than silently rendering an empty field
- [ ] `render(data)`: insert all field values; boilerplate zones outside tags are reproduced byte-exact (no LLM routing); loops and conditionals (`{#hasLiens}…{/hasLiens}`) resolved from data
- [ ] Catch docxtemplater structured errors (`unopened_tag`, `unclosed_tag`, `multi_error`) and return a 500 with the error payload — never emit a partially-filled document
- [ ] Save output DOCX to S3 (`jobs.output_s3_key`); update `jobs.status = "complete"`

---

### Phase 4 — Frontend Upgrade

- [ ] Generation view: once sufficiency gate clears, "Generate" button becomes enabled
- [ ] SSE consumer: streams medical narrative text in real-time → "Building document…" progress indicator
- [ ] On stream complete: "Download DOCX" button appears; `GET /jobs/:id/output` returns the S3 presigned URL for the output DOCX
- [ ] Citation panel (optional but valuable): sidebar showing which blocks each extracted field came from; click a block → highlight in source document preview

---

### Phase 5 — Verification

- [ ] Full end-to-end with Pat Donahue: upload template + case docs → zone detection → annotation → ingestion → extraction → attorney judgment fills → generate → download DOCX
- [ ] Output DOCX: §7 settlement conditions and CCP §999 language are byte-exact copies from the template; no paraphrasing
- [ ] Medical narrative (§4) references correct diagnoses and providers from the source records; no hallucinated facts
- [ ] nullGetter fires and returns a structured error if a required slot is missing from the data object (simulate by omitting one field)
- [ ] Cost dashboard shows `medical-narrative` rows alongside `zone-classification` and `case-extraction`

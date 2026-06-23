---
id: ROADMAP-004
title: Generation Engine
status: active
created: 2026-06-22
updated: 2026-06-22
owner: David Taylor
linked_decisions: [DEC-0001, DEC-0002, DEC-0003]
tags: [generation, docxtemplater, grounded, medical-narrative, sse]
---

# ROADMAP-004: Generation Engine

Replace the naive free-text Claude generation with a deterministic docxtemplater-driven fill: assemble the data object from the provenance store, boilerplate zones stay byte-exact from the template, and Claude on Bedrock generates *only* the medical narrative zone (§4) — the one zone where AI provides the most leverage. The final output is a properly structured DOCX that matches the template exactly.

---

### Phase 1 — Data Assembly & Sufficiency Pre-check

- [ ] Generation data builder: assemble the docxtemplater `data` object from `extracted_fields` + attorney-judgment values for a given job
- [ ] Sufficiency pre-check: fail fast with a 400 if any slot in `template_slots` (required = true) has no corresponding `extracted_fields` row with `is_null = false`
- [ ] Map field names to docxtemplater tag names (e.g. `patient_name` → `{patientName}`); centralize this mapping in a `field-schema.ts` constant so it's a single source of truth
- [ ] Handle loop fields (specials table per provider): `{#specials}…{/specials}` loop syntax; the data object carries an array of `{provider, amount, date}` objects

---

### Phase 2 — Medical Narrative Generation

- [ ] Claude on Bedrock medical narrative prompt (`feature: "medical-narrative"`): given the extracted medical blocks (diagnoses, providers, imaging, treatment timeline), generate the narrative prose for §4 in the register and style of the template's sample narrative
- [ ] Grounding constraint: every factual claim in the narrative must be supported by a cited block id; disallow invented diagnoses, medications, or provider names
- [ ] SSE streaming: the medical narrative is the only Claude call; stream its output token-by-token to the frontend while the docxtemplater fill waits
- [ ] Log to `LlmAuditLog` with `feature: "medical-narrative"`

---

### Phase 3 — docxtemplater Render

- [ ] Load tagged template DOCX from S3 (`templates.s3_key_tagged`)
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

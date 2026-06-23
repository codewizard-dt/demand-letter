---
id: ROADMAP-003
title: Case-Record Ingestion & Provenance
status: active
created: 2026-06-22
updated: 2026-06-22
owner: David Taylor
linked_decisions: [DEC-0003]
tags: [textract, provenance, grounded-extraction, sufficiency-gate]
---

# ROADMAP-003: Case-Record Ingestion & Provenance

Replace naive base64-to-Claude document passing with the Textract→Claude hybrid pipeline. Documents are type-branched (text-layer vs scanned), async Textract runs on scanned PDFs and produces bbox-level blocks stored in the provenance store, then Claude grounded extraction fills the canonical ~40-field schema with per-field Textract block-ID citations. A sufficiency gate surfaces missing slots as a gap report before generation is allowed to proceed.

---

### Phase 1 — Document Type Branching

- [ ] Type-detection router: check if a PDF has a text layer (pdfjs-dist or pdf-parse) → if yes, structured parse (extract text with page/paragraph offsets); if no / image-only, route to Textract
- [ ] Async Textract job: `StartDocumentAnalysis` (LAYOUT + TABLES + FORMS) → SQS queue → Lambda consumer → SNS completion notification → update job status
- [ ] `.docx` case documents: parse with mammoth or officegen (page/paragraph offsets) → bypass Textract
- [ ] `source_files` DB table: `id`, `job_id`, `s3_key`, `type` (pdf-native / pdf-scanned / docx), `textract_job_id`, `status`

---

### Phase 2 — Provenance Store

- [ ] `blocks` DB table: `id` (Textract block id), `source_file_id`, `type` (LINE / WORD / CELL / etc.), `text`, `page`, `bbox` (JSONB: left, top, width, height), `confidence`, `created_at`
- [ ] Block insert after each Textract completion or structured-parse run; never log raw block text to CloudWatch (PHI — see ROADMAP-005 for full scrubbing; for now, omit text from Lambda logs)
- [ ] `GET /jobs/:id/blocks` — paginated block list for debugging and the citation UI

---

### Phase 3 — Grounded Extraction

- [ ] Claude on Bedrock extraction prompt: given the full block list (id + text + page) as context, fill the canonical ~40-field schema; each field value must be accompanied by the source `block_id`(s) it was drawn from, or `null` + a reason string if the value is absent
- [ ] Structured output: use Claude's `tool_use` / JSON mode to emit the schema as validated JSON — no free-form prose
- [ ] `extracted_fields` DB table: `id`, `job_id`, `field_name`, `value`, `block_ids` (JSONB array), `confidence`, `is_null`, `null_reason`
- [ ] Log to `LlmAuditLog` with `feature: "case-extraction"` via provider wrapper

---

### Phase 4 — Sufficiency Gate & Gap Report

- [ ] After extraction: compare `extracted_fields` against the slot list from `template_slots` (ROADMAP-002)
- [ ] A slot is covered if: `is_null = false` AND `confidence >= threshold` (configurable; default 0.80) OR an attorney-judgment value has been provided
- [ ] Gap report: list of uncovered slots with `null_reason` where available
- [ ] Attorney-judgment collection UI: present gap report; attorney fills demand amount, general damages figure, future medical reserve, and any other uncovered slots; stored in `extracted_fields` with `block_ids = []` and a sentinel `source: "attorney-judgment"`
- [ ] Generation is blocked until gap report is empty or all remaining gaps are marked "accept missing"

---

### Phase 5 — Verification

- [ ] Upload Pat Donahue case documents → Textract/text-parse runs → blocks stored in DB with correct page and bbox values → Claude extraction fills expected fields → gap report surfaces the three attorney-judgment fields (demand amount, general damages, future medical) → attorney fills → gap report clears
- [ ] Every extracted field carries at least one `block_id` citation; no field has `block_ids = []` unless it's an attorney-judgment slot
- [ ] Cost dashboard shows `case-extraction` rows with expected token counts

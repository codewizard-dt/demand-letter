---
id: ROADMAP-002
title: Template Ingestion & Zone Detection
status: active
created: 2026-06-22
updated: 2026-06-22
owner: David Taylor
linked_decisions: [DEC-0001, DEC-0002]
tags: [template, zone-detection, annotation, docxtemplater]
---

# ROADMAP-002: Template Ingestion & Zone Detection

Replace the naive "send the template as context" approach with proper template parsing, LLM zone labeling, and an attorney annotation UI that persists confirmed zone maps as docxtemplater delimiter tags. After this roadmap, every template has a slot list the sufficiency gate can consume and a tagged DOCX the generation engine can fill.

---

### Phase 1 — Docx Structural Parse

- [ ] Template ingestion service: parse `.docx` → extract zones (paragraphs and runs) as structured OOXML spans; **never flatten to plain text** — flattening forfeits formatting fidelity
- [ ] Zone extraction preserves: paragraph style, run font/bold/italic, OOXML run path (paragraph index + run index), raw text per run
- [ ] `zones` DB table: `id`, `template_id`, `zone_index`, `type` (null until classified), `run_path` (JSONB array of paragraph/run indices), `text_content`, `suggested_field_name`, `confirmed`, `confirmed_by`, `confirmed_at`
- [ ] `templates` DB table: `id`, `job_id`, `s3_key_original`, `s3_key_tagged`, `slot_count`, `ingested_at`

---

### Phase 2 — LLM Zone Classification

- [ ] Claude on Bedrock classification prompt: given the full zone list (text + position), classify each as `boilerplate-verbatim` or `variable-populated` and suggest a field name from the canonical ~40-field schema
- [ ] Store LLM proposals in `zones.type` + `zones.suggested_field_name` (not yet confirmed)
- [ ] Log to `LlmAuditLog` with `feature: "zone-classification"` via the provider wrapper from ROADMAP-001

---

### Phase 3 — Attorney Annotation UI

- [ ] React annotation view: displays the template rendered as a list of zones; each zone shows its text excerpt, LLM-proposed label (`boilerplate-verbatim` / `variable-populated`), and suggested field name
- [ ] Attorney can confirm, override label, or rename the field for each zone
- [ ] "Confirm All" shortcut for zones where LLM confidence is high
- [ ] Submit → `PATCH /templates/:id/zones` → persist confirmed labels and field names to DB

---

### Phase 4 — Delimiter Tag Injection

- [ ] After annotation is submitted: inject `{field_name}` delimiters into the `.docx` OOXML at each confirmed variable zone (write a clean single-run tag into the run's text node); boilerplate zones left byte-exact and untouched
- [ ] Save tagged DOCX to S3 (`templates.s3_key_tagged`)
- [ ] Run docxtemplater `InspectModule` on the tagged DOCX → enumerate all `{tag}` slots → store slot list in `templates.slot_count` + a `template_slots` join table (slot_name, required)
- [ ] `GET /templates/:id/slots` — returns the slot list for the sufficiency gate

---

### Phase 5 — Verification

- [ ] Upload Pat Donahue template → zones displayed in annotation UI → attorney confirms/overrides → tagged DOCX saved to S3 → `InspectModule` enumerates the expected ~40 slots
- [ ] Boilerplate zones (§7 settlement conditions, CCP §999 language) are marked `boilerplate-verbatim` by the LLM and left byte-exact after tag injection
- [ ] Cost dashboard shows `zone-classification` feature rows with expected token counts

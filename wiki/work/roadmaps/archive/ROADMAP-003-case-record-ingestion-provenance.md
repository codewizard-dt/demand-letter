---
id: ROADMAP-003
title: Case-Record Ingestion & Provenance
status: done
created: 2026-06-22
updated: 2026-06-24
owner: David Taylor
linked_decisions: [DEC-0003]
tags: [textract, provenance, grounded-extraction, sufficiency-gate]
---

# ROADMAP-003: Case-Record Ingestion & Provenance

Replace naive base64-to-Claude document passing with the Textract→Claude hybrid pipeline. Documents are type-branched (text-layer vs scanned), async Textract runs on scanned PDFs and produces bbox-level blocks stored in the provenance store, then Claude grounded extraction fills the canonical ~40-field schema with per-field Textract block-ID citations. A sufficiency gate surfaces missing slots as a gap report before generation is allowed to proceed.

---

### Phase 1 — Document Type Branching

- [x] [[TASK-032: ROADMAP-003 Phase 1–2 Case-Record Document Type Branching, Textract Async, Provenance Store Schema, and Block Enumeration API]]

---

### Phase 2 — Provenance Store

- [x] [[TASK-032: ROADMAP-003 Phase 1–2 Case-Record Document Type Branching, Textract Async, Provenance Store Schema, and Block Enumeration API]]

---

### Phase 3 — Grounded Extraction

- [x] [[TASK-033: ROADMAP-003 Phase 3 — Grounded Extraction: Claude on Bedrock with per-field block_id citations, structured tool_use output, extracted_fields DB table, and LlmAuditLog integration]]

---

### Phase 4 — Sufficiency Gate & Gap Report

- [x] [[TASK-034: ROADMAP-003 Phase 4 — Sufficiency Gate & Gap Report]]

---

### Phase 5 — Verification

- [x] [[TASK-035: ROADMAP-003 Phase 5 — End-to-End Verification]]

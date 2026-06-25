# Evals

Evaluation suite for the demand letter generator's AI features. Follows the 5-stage framework defined in `.docs/guides/evals-framework.md`.

## Stage 1 — Golden Sets (`evals/golden/`)

Run on every commit. Zero LLM cost — assertions over recorded output.

| ID | Description | Feature | Tested file(s) | Added |
|----|-------------|---------|----------------|-------|
| gs-001 | CCP §999 opening paragraph → boilerplate_verbatim | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-002 | `[CLIENT FULL NAME]` → variable_populated / claimant_name | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-003 | Multi-zone input produces valid JSON array (no prose) | zone_classification | zone-classifier.ts | 2026-06-24 |
| gs-004 | `[DATE OF INCIDENT]` → date_of_loss (not a hallucinated variant) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-005 | Zone with specific dollar figure → boilerplate_verbatim (not variable) | zone_classification | zone-classifier.ts | 2026-06-24 |
| gs-006 | `[$DEMAND_AMOUNT]` → demand_amount (not amount or settlement_amount) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-007 | Policy limits placeholder → policy_limits (not demand_amount synonym) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-008 | Claim number in Re: line → claim_number (not reference_number) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-009 | Attorney name in signature block → attorney_name (not boilerplate) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-010 | Adjuster salutation → adjuster_name (not claimant or insured name) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-011 | Boilerplate paragraph untouched by injectDelimiters() — protection guard | delimiter_injection | docx-injector.ts | 2026-06-24 |
| gs-012 | Variable zone gets {field_name} tag run — positive injection path | delimiter_injection | docx-injector.ts | 2026-06-24 |
| gs-013 | Empty confirmedZones → original buffer returned unchanged (early-return guard) | delimiter_injection | docx-injector.ts | 2026-06-24 |
| gs-014 | enumerateSlots() returns bare tag names (no braces) from injected buffer | slot_enumeration | docx-inspect.ts | 2026-06-24 |
| gs-015 | Multi-zone: distinct tags per zone, sandwiched boilerplate untouched | delimiter_injection | docx-injector.ts | 2026-06-24 |
| gs-016 | detectDocumentType() classifies .docx as 'docx' (extension-only, no buffer read) | doc_type_branching | document-type-detector.ts | 2026-06-24 |
| gs-017 | detectDocumentType() returns 'pdf-scanned' for PDF with empty text layer | doc_type_branching | document-type-detector.ts | 2026-06-24 |
| gs-018 | computeGapReport() returns gaps:[] when all slots have confidence ≥ 0.80 | sufficiency_gate | sufficiency-gate.ts | 2026-06-24 |
| gs-019 | computeGapReport() surfaces slot in gaps when confidence < 0.80 | sufficiency_gate | sufficiency-gate.ts | 2026-06-24 |
| gs-020 | computeGapReport() excludes slot from gaps when acceptMissing=true | sufficiency_gate | sufficiency-gate.ts | 2026-06-24 |
| gs-021 | runGroundedExtraction() includes block_ids for every populated field | grounded_extraction | extraction-service.ts | 2026-06-24 |
| gs-022 | runGroundedExtraction() sets is_null=true with null_reason when no blocks support a field | grounded_extraction | extraction-service.ts | 2026-06-24 |

## Coverage status

| Stage | Status | Count |
|-------|--------|-------|
| 1 — Golden Sets | Active | 22 (15 original + 7 Roadmap 3) |
| 2 — Labeled Scenarios | Not started | — |
| 3 — Replay Harnesses | Not started | — |
| 4 — Rubrics | Not started | — |
| 5 — Experiments | Not started | — |

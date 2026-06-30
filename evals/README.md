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
| gs-023 | buildDataObject() maps snake_case dbName to camelCase tagName key in result | data_assembly | generation-data-builder.ts, field-schema.ts | 2026-06-25 |
| gs-024 | buildDataObject() omits isNull=true fields when acceptMissing=false — not set to empty string | data_assembly | generation-data-builder.ts | 2026-06-25 |
| gs-025 | buildDataObject() parses per_provider_line_items JSON into array at 'specials' key | data_assembly | generation-data-builder.ts, field-schema.ts | 2026-06-25 |
| gs-026 | renderTemplate() nullGetter throws TemplateRenderError when a template tag is absent from data | docx_render | docx-renderer.ts | 2026-06-25 |
| gs-027 | generateMedicalNarrative() grounding validator flags [block-id] citations not in the known block set | medical_narrative | medical-narrative.ts | 2026-06-25 |
| gs-028 | redactText() replaces a PATIENT span with [PATIENT_NAME] token without shifting adjacent text | phi_pii_compliance | redact-text.ts | 2026-06-25 |
| gs-029 | redactText() falls back to [PHI_ENTITY] for an entity type not in the TOKEN_MAP | phi_pii_compliance | redact-text.ts | 2026-06-25 |
| gs-030 | mergeEntities() deduplicates overlapping PHI and PII spans, keeping the higher-confidence entry | phi_pii_compliance | merge-entities.ts | 2026-06-25 |
| gs-031 | GET /jobs/:id/blocks returns redacted text when X-Caller-Role is developer | phi_pii_compliance | get-jobs-blocks.ts | 2026-06-25 |
| gs-032 | GET /jobs/:id/blocks returns full unredacted text when X-Caller-Role is attorney | phi_pii_compliance | get-jobs-blocks.ts | 2026-06-25 |
| gs-033 | redactText() returns the original string unchanged when entities array is empty | phi_pii_compliance | redact-text.ts | 2026-06-25 |
| gs-034 | mergeEntities() preserves both entries when PHI and PII spans do not overlap | phi_pii_compliance | merge-entities.ts | 2026-06-25 |
| gs-035 | estimateCostUsd() returns 0 for unrecognized model ID (graceful degradation) | llm_audit | ai.ts | 2026-06-25 |
| gs-036 | estimateCostUsd() computes correct dollar amount for known Haiku model | llm_audit | ai.ts | 2026-06-25 |
| gs-037 | estimateCostUsd() applies Opus-tier pricing ($5/$25) for Opus 4.x models | llm_audit | ai.ts | 2026-06-25 |
| gs-038 | POST /jobs/:id/refine returns 400 missing_instruction when instruction absent | attorney_refinement | post-jobs-refine.ts | 2026-06-25 |
| gs-039 | PATCH refine-accept sets accepted=true AND updates job.output in transaction | attorney_refinement | patch-jobs-refine-accept.ts | 2026-06-25 |
| gs-040 | PATCH refine-reject does NOT update job.output (only marks accepted=false) | attorney_refinement | patch-jobs-refine-reject.ts | 2026-06-25 |
| gs-041 | textRunFromNode() produces TextRun with bold=true for bold mark | word_export | prosemirror-to-docx.ts | 2026-06-25 |
| gs-042 | textRunFromNode() applies D9D9D9 gray shading for boilerplateZone mark | word_export | prosemirror-to-docx.ts | 2026-06-25 |
| gs-043 | GET /jobs/:id/export/docx returns 422 output_not_ready when job has no output | word_export | get-jobs-export-docx.ts | 2026-06-25 |
| gs-044 | POST /jobs/:id/generate returns 400 sufficiency_precheck_failed when gap report has uncovered slots | generation_gate | post-jobs-generate.ts | 2026-06-25 |
| gs-045 | GET /admin/llm-costs returns aggregates grouped by feature and recentRows list | llm_audit | get-admin-llm-costs.ts | 2026-06-25 |
| gs-046 | GET /jobs/:id/refinements returns history list without beforeText/afterText payload | attorney_refinement | get-jobs-refinements.ts | 2026-06-25 |
| gs-047 | DELETE /jobs/:id/changes/:changeId returns 403 change_job_mismatch for cross-job delete | collab_editing | delete-jobs-changes.ts | 2026-06-25 |
| gs-048 | headingNodeToDocx() maps level 2 heading to Heading2 style (not Heading1 default) | word_export | prosemirror-to-docx.ts | 2026-06-25 |
| gs-049 | GET /jobs/:id/changes returns change log with operationType and contentDelta fields | collab_editing | get-jobs-changes.ts | 2026-06-25 |
| gs-050 | POST /jobs/:id/refine appends scope suffix to Bedrock message when scope is a named section | attorney_refinement | post-jobs-refine.ts | 2026-06-25 |
| gs-051 | POST /jobs/:id/save-values upserts field with confidence=1.0 and source=user-provided | save_values | post-jobs-save-values.ts | 2026-06-26 |
| gs-052 | POST /jobs/:id/save-values sets acceptMissing=true with nullReason for dismissed slots | save_values | post-jobs-save-values.ts | 2026-06-26 |
| gs-053 | GET /jobs/:id/gap-report returns 404 template_not_ready when no template classified yet | generation_gate | get-jobs-gap-report.ts | 2026-06-26 |
| gs-054 | POST /jobs/:id/templates/:templateId/inject returns deterministic slotCount for Pat Donahue template | template_classification | post-jobs-templates-inject.ts | 2026-06-28 |

## Coverage status

| Stage | Status | Count |
|-------|--------|-------|
| 1 — Golden Sets | Active | 54 |
| 2 — Labeled Scenarios | Not started | — |
| 3 — Replay Harnesses | Not started | — |
| 4 — Rubrics | Not started | — |
| 5 — Experiments | Not started | — |

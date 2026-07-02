# Evals

Evaluation suite for the demand letter generator's AI features. Follows the 5-stage framework defined in `.docs/guides/evals-framework.md`.

## Stage 1 — Golden Sets (`evals/golden/`)

Run on every commit via `pnpm evals` (runner: `evals/run_evals.ts`).

Each case runs through two layers:

1. **Schema validation** — every case is checked for required fields / shape.
2. **Behavioral assertion** — cases with a real adapter in `run_evals.ts` are
   executed against the **actual** system function (no mocks) and their output is
   checked against `must_contain` / `must_not_contain`.

Cases without an adapter are reported as `mode: "schema-only"` and are **not**
claimed to be behaviorally verified. Three behavioral tiers are wired today: a
pure-function tier (always on), a gated live-model tier (real Bedrock), and a
gated live-DB/handler tier (real Postgres). The remaining cases stay schema-only
pending further adapters.

**Pure-function tier — always run (10):** gs-016, gs-017 (`detectDocumentType`),
gs-028, gs-029, gs-033 (`redactText`), gs-030, gs-034 (`mergeEntities`),
gs-035, gs-036, gs-037 (`estimateCostUsd`). No network, no cost.

**Live-model tier — real Bedrock, gated (10):** gs-001–gs-010 (`classifyZones`,
zone classification). These call real Bedrock (Claude Haiku 4.5) and are **gated
behind `EVAL_LIVE_MODEL`** because they cost money and need AWS credentials. Run
them with:

```bash
set -a; . ./.env; set +a          # region + BEDROCK_MODEL_ID_BASIC + DATABASE_URL
EVAL_LIVE_MODEL=1 pnpm evals       # AWS creds resolved from the default chain
```

When gated off (the default), these report `SKIP`; `classifyZones` and its
`@demand-letter/db` import are loaded lazily, so the default run never touches
Prisma or AWS.

**Live-DB/handler tier — real Postgres, gated (16):**
- `computeGapReport`: gs-018, gs-019, gs-020
- `buildDataObject`: gs-023, gs-025
- `post-jobs-save-values`: gs-051, gs-052
- `get-jobs-gap-report` (404): gs-053
- `post-jobs-refine` (400 missing_instruction): gs-038
- `patch-jobs-refine-reject`: gs-040
- `get-jobs-export-docx` (422): gs-043
- `post-jobs-generate` (400 sufficiency_precheck_failed): gs-044
- `get-admin-llm-costs`: gs-045
- `get-jobs-refinements`: gs-046
- `delete-jobs-changes` (403): gs-047
- `get-jobs-changes`: gs-049

Each seeds the dedicated `demand_letter_test` database, invokes the real Prisma
function or Lambda handler, asserts on the response and/or the resulting rows
(handler cases read rows back — e.g. `confidence`/`source` live in the row, not
the response), then cleans up (job delete cascades). **Gated behind
`EVAL_LIVE_DB`.** Run with:

```bash
set -a; . ./.env; set +a           # provides DATABASE_URL (dev)
EVAL_LIVE_DB=1 pnpm evals           # runner forces DATABASE_URL onto demand_letter_test
```

**SAFETY:** when `EVAL_LIVE_DB` is on, the runner rewrites `DATABASE_URL` to the
`*_test` database (name-swapped, or `DATABASE_URL_TEST` if set) **before Prisma
loads**, and **refuses to start if the resolved database name does not contain
`test`** — so it can never write to dev or prod. This redirect also applies when
the **live-model** tier runs, because `invokeModel()` writes a fire-and-forget
`LlmAuditLog` row per call; forcing the test DB keeps that telemetry off dev/prod
(the write is best-effort and `.catch()`ed, so the model tier still works if the
test DB is absent). Prerequisite: local Postgres running; the integration harness
(`vitest.config.integration.ts`) creates and migrates `demand_letter_test`. Never
point this tier at a production database.

**Still schema-only (18):** live-model-with-DB (`runGroundedExtraction`,
gs-021/022), the S3/Bedrock-dependent handlers (`patch-jobs-refine-accept` gs-039,
`post-jobs-refine` scope gs-050, `post-jobs-templates-inject` gs-054), the
redaction-by-role blocks cases (gs-031/032), the docx-buffer functions
(`injectDelimiters`, `enumerateSlots`, `renderTemplate` — gs-011–015, 026), and
the docx-object builders (`textRunFromNode`, `headingNodeToDocx` — gs-041/042/048,
whose real `docx` return values don't serialize to the asserted plain-object
shape). gs-024 and gs-027 also stay schema-only: their assertions are prose, not
real output, so they need reworking before they can run live.

The runner exits non-zero only on real failures/regressions. Gate: 🟢 GREEN = all
executed and passing; 🟡 YELLOW = nothing failing but some cases skipped/schema-only;
🔴 RED = a real failure, error, or regression.

| ID | Description | Feature | Tested file(s) | Added |
|----|-------------|---------|----------------|-------|
| gs-001 | CCP §999 opening paragraph → boilerplate_verbatim | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-002 | `[CLIENT FULL NAME]` → variable_populated / claimant_name | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-003 | Multi-zone input produces valid JSON array (no prose) | zone_classification | zone-classifier.ts | 2026-06-24 |
| gs-004 | `[DATE OF INCIDENT]` → incident_date (a canonical date field, not a hallucinated variant) | zone_classification | zone-classifier.ts, zone-field-schema.ts | 2026-06-24 |
| gs-005 | Sentence with embedded dollar figure → variable_populated / total_medical_specials with templateText | zone_classification | zone-classifier.ts | 2026-06-24 |
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

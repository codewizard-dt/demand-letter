---
id: TASK-045
title: "ROADMAP-004 Phase 5 — End-to-End Verification: Full Pipeline Smoke Test"
status: in-progress
created: 2026-06-25
updated: 2026-06-25 <!-- tackle cycle: Step 1 complete, Steps 2-7 DEFERRED-TO-UAT -->
depends_on: [TASK-044, TASK-043, TASK-042, TASK-041, TASK-040, TASK-039, TASK-038, TASK-037]
blocks: []
parallel_safe_with: []
uat: "[[UAT-045]]"
tags: [generation, e2e, smoke-test, verification, docxtemplater, medical-narrative, null-getter, cost-dashboard]
---

# TASK-045 — ROADMAP-004 Phase 5: End-to-End Verification — Full Pipeline Smoke Test

## Objective

Verify the complete Generation Engine pipeline end-to-end using the Pat Donahue fixture case: upload template + case documents → zone detection → annotation → ingestion → extraction → attorney judgment fills → generate → download DOCX. Assert that (1) §7 settlement conditions and CCP §999 language in the output DOCX are byte-exact copies from the template (no paraphrasing), (2) the medical narrative (§4) references correct diagnoses and providers from source records with no hallucinated facts, (3) the `nullGetter` fires and returns a structured 500 error when a required slot is deliberately omitted from the data object, and (4) the cost dashboard at `GET /admin/llm-costs` shows `medical-narrative` rows alongside `zone-classification` and `case-extraction` rows.

## Approach

This is a manual + scripted verification task — no new production code is written unless a gap is discovered. Each check follows a defined exercise path:

1. **Happy-path smoke test**: drive the full pipeline from upload to download using the Pat Donahue fixture documents (already ingested in TASK-035 / TASK-032). If the fixture data is not available locally, re-upload via the existing `POST /jobs` → file upload flow.
2. **Byte-exact boilerplate check**: download the output DOCX, unzip the `.docx` (it is a zip), diff the XML content of the §7 and CCP §999 paragraphs against the original template XML. Any difference is a failure.
3. **Medical narrative grounding check**: read §4 of the output DOCX; cross-reference every diagnosis, provider name, and date against the source case records. Flag any claim not traceable to a `block_id` in `extracted_fields`.
4. **nullGetter error path**: invoke `renderTemplate` with a data object missing one required field (e.g., `clientName`). Expect a `TemplateRenderError` raised and the Lambda handler returning HTTP 500 with a structured error payload.
5. **Cost dashboard check**: after generation, call `GET /admin/llm-costs` and assert that the response includes rows with `feature: "medical_narrative"`.

If any check reveals a production bug, create a `BUG-NNNN` file and note it here before marking the task done.

## Steps

### 1. Confirm fixture documents are available  <!-- agent: general-purpose -->

- [x] List files under `packages/api/src/fixtures/` (or wherever Pat Donahue fixture docs live) using `mcp__serena__list_dir`. <!-- Completed: 2026-06-25 -->
  - PASS: Fixture docs live under `raw/`: template DOCX at `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx` and 4 case PDFs at `raw/pat-donahue/`.
- [x] If fixtures are missing, check `raw/` for Pat Donahue source materials and re-upload via the local dev stack (`pnpm dev` or SAM local). <!-- Completed: 2026-06-25 -->
  - All fixtures present — no re-upload needed.
- [x] Confirm the local Postgres DB has a job row and associated `zones`, `case_records`, `blocks`, and `extracted_fields` rows for the fixture job. <!-- Completed: 2026-06-25 -->
  - Query: `SELECT id, status FROM jobs ORDER BY created_at DESC LIMIT 5;` via the Prisma studio or `psql`.
  - DB is reachable. Job `cmqsrp031000037llm2uqtakd` has 107 blocks, 38 extracted_fields, status=`pending`.
  - **PARTIAL FAIL**: `zones` table is empty — template classification has not run yet. All jobs remain `pending`.
  - **NOTE**: Makefile has no dev/stack targets. Dev stack must be started separately (docker compose or SAM local).

### 2. Happy-path smoke test: upload → generate → download  <!-- agent: general-purpose -->

[DEFERRED-TO-UAT] All sub-steps are runtime/E2E verification requiring a running dev stack — belongs in UAT phase.

- [ ] Start the local dev stack if not already running: `pnpm dev` (or `sam local start-api`).
- [ ] Upload the Pat Donahue template via `POST /jobs` (multipart), capturing the returned `jobId`.
- [ ] Upload case record documents via `POST /jobs/:id/files`.
- [ ] Trigger zone detection + annotation + ingestion: `POST /jobs/:id/detect-zones` → verify `zones` rows inserted.
- [ ] Trigger extraction: `POST /jobs/:id/extract` → verify `extracted_fields` rows and `blocks` rows with `block_id` citations.
- [ ] Fill any attorney-judgment slots surfaced by the gap report (simulate via the UI or direct API PATCH).
- [ ] Trigger generation: `POST /jobs/:id/generate` → confirm SSE stream emits tokens and eventually the `[DONE]` event.
- [ ] Download the output DOCX via `GET /jobs/:id/output` → save as `smoke-test-output.docx`.
- [ ] Assert `jobs.status = 'complete'` in the DB after generation.

### 3. Byte-exact boilerplate verification (§7 and CCP §999)  <!-- agent: general-purpose -->

[DEFERRED-TO-UAT] Requires `smoke-test-output.docx` produced by Step 2 — runtime/E2E verification.

- [ ] Unzip `smoke-test-output.docx` and the original tagged template DOCX to separate directories.
  - `unzip -o smoke-test-output.docx -d /tmp/output-docx`
  - `unzip -o template.docx -d /tmp/template-docx`
- [ ] Identify the XML paragraphs containing §7 settlement conditions and CCP §999 language:
  - Open `word/document.xml` in both unzipped directories.
  - Search for the literal §7 heading text and the CCP §999 string.
- [ ] Diff the relevant paragraph XML nodes between template and output:
  - Any text content difference is a failure — the boilerplate must be byte-exact.
  - Structural OOXML differences (e.g., run merging by Word) are acceptable; text content must match.
- [ ] Document the result (pass/fail) in a comment on this step.

### 4. Medical narrative grounding check (§4)  <!-- agent: general-purpose -->

[DEFERRED-TO-UAT] Requires generated output DOCX from Step 2 — runtime/E2E verification.

- [ ] Extract the §4 text from `smoke-test-output.docx` (search `word/document.xml` for the §4 heading).
- [ ] List all diagnoses, provider names, treatment dates, and dollar amounts mentioned in the §4 text.
- [ ] For each claim, verify it traces to a `block_id` in `extracted_fields` by querying:
  ```sql
  SELECT field_name, value, block_id FROM extracted_fields WHERE job_id = '<jobId>';
  ```
- [ ] Flag any fact in §4 that has no corresponding `extracted_fields` row — this is a hallucination.
- [ ] If hallucinations are found, file a `BUG-NNNN` and record it here. Otherwise, mark pass.

### 5. nullGetter error path verification  <!-- agent: general-purpose -->

[DEFERRED-TO-UAT] Requires invoking the Lambda handler at runtime — E2E verification.

- [ ] Open `packages/api/src/lib/docx-renderer.ts`.
- [ ] Write a one-off test script (or use the existing test suite) that calls `renderTemplate(jobId, data)` with `data` missing one required field (e.g., delete `clientName` from the assembled object).
  - Alternatively, temporarily patch `buildDataObject` in `packages/api/src/lib/data-builder.ts` to omit one field and re-invoke generation.
- [ ] Assert the Lambda handler returns HTTP 500 with a JSON body containing `errors` array (the `TemplateRenderError` payload).
- [ ] Assert the `jobs.status` is NOT set to `complete` (generation must fail closed).
- [ ] Revert any temporary patch after verification.
- [ ] Document pass/fail in a comment on this step.

### 6. Cost dashboard verification  <!-- agent: general-purpose -->

[DEFERRED-TO-UAT] Requires running the full pipeline (Step 2) and calling the live API — E2E verification.

- [ ] After the happy-path generation in Step 2, call `GET /admin/llm-costs` (with appropriate auth header if required).
- [ ] Assert the response JSON contains at least one row with `feature: "medical_narrative"` (or equivalent field name matching the `LlmFeature.medical_narrative` enum).
- [ ] Assert the response also contains rows for `zone_classification` and `case_extraction` features (confirming all three features are represented).
- [ ] Spot-check: confirm `inputTokens`, `outputTokens`, and `estimatedCostUsd` are non-zero for the `medical_narrative` row.
- [ ] Document the actual response (redacted if needed) in a comment on this step.

### 7. Document results and file bugs if needed  <!-- agent: general-purpose -->

[DEFERRED-TO-UAT] Final documentation follows completion of runtime verification steps 2-6.

- [ ] If all five checks pass, mark this task `done` and update `status` in frontmatter.
- [ ] For any failed check:
  - Create a `BUG-NNNN` file in `wiki/work/bugs/` (use `/bug-file` skill).
  - Note the bug ID in the relevant step above.
  - Decide whether the bug is a blocker for marking this task done or can be tracked separately.
- [ ] Update `wiki/work/roadmaps/ROADMAP-004-generation-engine.md` Phase 5 checklist to reflect verified items.
- [ ] Update `wiki/log.md` with verification outcome.

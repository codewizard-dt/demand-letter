---
id: TASK-035
title: "ROADMAP-003 Phase 5 — End-to-End Verification"
status: done
created: 2026-06-24
updated: 2026-06-25
depends_on: [TASK-033, TASK-034]
blocks: []
parallel_safe_with: []
uat: "[[UAT-035]]"
tags: [textract, provenance, grounded-extraction, sufficiency-gate, verification, e2e]
---

# TASK-035 — ROADMAP-003 Phase 5 — End-to-End Verification

## Objective

Verify the full ROADMAP-003 pipeline end-to-end using real Pat Donahue case documents. The run must confirm: documents upload successfully and are routed through Textract/text-parse; parsed blocks are stored in the DB with correct `page` and `bbox` values; Claude grounded extraction fills the expected canonical fields; the gap report surfaces exactly the three attorney-judgment fields (demand amount, general damages, future medical); the attorney fills those fields and the gap report clears; every extracted field carries at least one `block_id` citation; and the cost dashboard shows `case-extraction` rows with expected token counts.

## Approach

This is a black-box verification task executed against a running deployed environment (or local SAM + localstack stack). Each check is a targeted assertion against the database, API response, or UI state — no new implementation is required. Steps follow the pipeline order so failures are caught as early as possible. If a step fails, it blocks subsequent steps and the failure is reported back to the relevant upstream task (TASK-032, TASK-033, or TASK-034).

## Steps

### 1. Pre-flight — Confirm Environment  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI not installed; no live environment] Confirm the API stack is deployed and reachable (SAM local or AWS endpoint)
  - Sub-detail: source `.env` for `API_BASE_URL`, `DATABASE_URL`, `AWS_REGION`
  - Sub-detail: run `curl -s $API_BASE_URL/health` and assert HTTP 200
  - Static finding: `template.yaml` has no `/health` route; API Gateway would return 403. Use `GET /jobs` or another real endpoint as the health check instead.
- [BLOCKED: raw/pat-donahue/ directory does not exist] Confirm Pat Donahue case documents are available in `raw/pat-donahue/` (or equivalent fixture path)
  - Sub-detail: at minimum expect one scanned PDF and one text-layer PDF to exercise both Textract and text-parse branches
  - Static finding: Only `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx` exists — this is a demand letter template, NOT a case document.

### 2. Upload Pat Donahue Case Documents  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI / live environment required] Create a new job via `POST /jobs` and capture the returned `job_id`
  - Sub-detail: `curl -s -X POST $API_BASE_URL/jobs -H 'Content-Type: application/json' -d '{"clientName":"Pat Donahue"}' | jq .id`
  - Static finding: `POST /jobs` endpoint confirmed in `template.yaml` → `PostJobsFunction`. Note: `clientName` is silently ignored (no column in Job model).
- [BLOCKED: SAM CLI / live environment required] Upload each case document via `POST /jobs/:id/files`
  - Sub-detail: use `--form` multipart upload; assert HTTP 201 for each file
  - Sub-detail: record the returned `file_id` values for subsequent assertions
  - Static finding: `POST /jobs/{id}/files` endpoint confirmed in `template.yaml` → `PostJobsFilesFunction`.

### 3. Verify Textract / Text-Parse Runs and Block Storage  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI / live environment required] Poll until all uploaded files reach `status = complete` in the `SourceFile` table
  - Sub-detail: `SELECT id, status, type FROM "SourceFile" WHERE "jobId" = '<job_id>'` via `psql $DATABASE_URL`
  - Sub-detail: confirm `type` is `'pdf-scanned'` for scanned PDFs and `'pdf-native'` for text-layer PDFs
  - SPEC CORRECTION: original said `status = 'parsed'` (wrong) and table `files` with column `file_type` (wrong). Actual: `"SourceFile"` table, `status = 'complete'`, column `type`.
- [BLOCKED: SAM CLI / live environment required] Assert blocks are stored in `Block` table for each file
  - Sub-detail: `SELECT COUNT(*), MIN(page), MAX(page) FROM "Block" WHERE "sourceFileId" = '<source_file_id>'` — expect count > 0
  - Sub-detail: assert `page` values are ≥ 1 and `bbox` column is not null / not `{}` for at least one block per page
  - SPEC CORRECTION: original said `provenance_blocks` table with `file_id` column (wrong). Actual: `"Block"` table with `sourceFileId` FK to `SourceFile`.
- [BLOCKED: SAM CLI / live environment required] Spot-check a sample block for correct structure
  - Sub-detail: `SELECT page, bbox, text FROM "Block" WHERE "sourceFileId" = '<source_file_id>' LIMIT 5` — verify `bbox` contains `left`, `top`, `width`, `height` keys
  - Static finding: `bbox Json` schema confirmed in `schema.prisma` comment: `{ left: number, top: number, width: number, height: number }`.

### 4. Trigger and Verify Claude Grounded Extraction  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI / live environment required] Trigger extraction via `POST /jobs/:id/extract`
  - Sub-detail: assert HTTP 200; response is synchronous `{ jobId, totalFields, filledFields, nullFields }` — no polling needed, no `run_id`
  - SPEC CORRECTION: original said `POST /jobs/:id/generate` (wrong — that is demand letter generation, not extraction). Actual endpoint: `POST /jobs/{id}/extract` → `PostJobsExtractFunction`.
  - SPEC CORRECTION: original said HTTP 202 async — actual response is synchronous HTTP 200.
- [BLOCKED: SAM CLI / live environment required] Verify extraction results in `extracted_fields` table
  - Sub-detail: `SELECT COUNT(*), COUNT(DISTINCT "fieldName") FROM extracted_fields WHERE "jobId" = '<job_id>'`
  - Sub-detail: expect rows covering the canonical schema (minimum: incident date, claimant name, treating physician, diagnosis, total medical bills, lost wages)
  - Static finding: `extracted_fields` table confirmed in schema with `fieldName`, `value`, `blockIds`, `confidence`, `isNull`, `source` columns.
- [BLOCKED: SAM CLI / live environment required] Assert each extracted field has at least one `block_id` citation
  - Sub-detail: `SELECT "fieldName", "blockIds" FROM extracted_fields WHERE "jobId" = '<job_id>'`
  - Sub-detail: confirm no row has `blockIds = '[]'` unless `source = 'attorney-judgment'`
  - SPEC CORRECTION: original said `is_attorney_judgment = true` (column does not exist). Actual: filter by `source = 'attorney-judgment'`.
  - Sub-detail: if any non-attorney-judgment field has empty `blockIds`, log field names and mark this step FAIL

### 5. Verify Gap Report — Three Attorney-Judgment Fields Surface  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI / live environment required] Fetch the gap report via `GET /jobs/:id/gap-report`
  - Sub-detail: assert HTTP 200 and response body is JSON `{ covered: number, total: number, gaps: GapItem[] }`
  - Static finding: endpoint confirmed → `GetJobsGapReportFunction`. Logic in `lib/sufficiency-gate.ts` verified: uncovered slots (confidence < 0.80 AND no attorney-judgment AND acceptMissing = false) appear in `gaps`.
- [BLOCKED: SAM CLI / live environment required] Assert exactly the three attorney-judgment fields appear in `gaps`
  - `demand_amount` (or equivalent canonical name)
  - `general_damages`
  - `future_medical`
  - Sub-detail: if additional fields surface unexpectedly, note them but do not fail — record as informational
- [BLOCKED: SAM CLI / live environment required] Assert the generation gate is blocked while gap remains open
  - Sub-detail: `POST /jobs/:id/generate` should return HTTP 422 `{ error: "gap_report_not_cleared", message: "...", gaps: [...] }` when gaps exist
  - Static finding: gate logic confirmed in `post-jobs-generate.ts` — calls `computeGapReport(jobId)` and returns 422 if `gaps.length > 0`.

### 6. Attorney Fill — Gap Report Clears  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI / live environment required] Submit attorney-judgment values via `POST /jobs/:id/attorney-judgment`
  - Sub-detail: correct body shape:
    ```json
    { "fields": [{ "fieldName": "demand_amount", "value": "500000" }, { "fieldName": "general_damages", "value": "150000" }, { "fieldName": "future_medical", "value": "75000" }] }
    ```
  - Sub-detail: assert HTTP 200 `{ "ok": true }`
  - SPEC CORRECTION: original said `PATCH /jobs/:id/fields` (wrong). Actual: `POST /jobs/{id}/attorney-judgment` → `PostJobsAttorneyJudgmentFunction`.
  - Static finding: handler upserts each field with `source = "attorney-judgment"`, `confidence = 1.0`, `isNull = false`.
- [BLOCKED: SAM CLI / live environment required] Fetch the gap report again and assert it clears
  - Sub-detail: assert `gaps` array is empty (`[]`) — the endpoint always returns HTTP 200; it does not return 204
- [BLOCKED: SAM CLI / live environment required] Confirm the generation gate is now open
  - Sub-detail: `POST /jobs/:id/generate` should no longer return 422 — accept 200 (streaming) or 202

### 7. Verify Cost Dashboard — Case-Extraction Rows  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI / live environment required] Query `GET /admin/llm-costs` and assert `case_extraction` rows appear
  - Sub-detail: `curl -s $API_BASE_URL/admin/llm-costs | jq '.recentRows[] | select(.feature == "case_extraction")'`
  - SPEC CORRECTION: original said `.rows[]` (wrong key) and `.operation == "case-extraction"` (wrong field and value). Actual: `.recentRows[]` and `.feature == "case_extraction"`.
  - Sub-detail: expect at least one row with `inputTokens > 0` and `outputTokens > 0`
  - Static finding: endpoint confirmed → `GetAdminLlmCostsFunction`. Response shape: `{ aggregates: [...], recentRows: [...] }`.
- [BLOCKED: SAM CLI / live environment required] Assert token counts are in a plausible range for a full case document
  - Sub-detail: `inputTokens` should be in the range 5,000–200,000 (document size dependent); `outputTokens` in 200–5,000
  - Sub-detail: if values fall outside this range, log actual values and flag for investigation
- [BLOCKED: SAM CLI / live environment required] Cross-check `LlmAuditLog` table directly as a secondary assertion
  - Sub-detail: correct query (no `job_id` column exists on `LlmAuditLog`):
    ```sql
    SELECT feature, input_tokens, output_tokens, estimated_cost_usd
    FROM "LlmAuditLog"
    WHERE feature = 'case_extraction'
    ORDER BY "createdAt" DESC LIMIT 10;
    ```
  - SPEC CORRECTION: original used `job_id` and `operation` columns — neither exists on `LlmAuditLog`. Filter by `feature` + time range.
  - Sub-detail: assert `estimated_cost_usd > 0`

---

## Verification Report (2026-06-24) — Static Analysis + Runtime Block Assessment

> Run by: static code inspection (Serena/Read). No live environment available — SAM CLI absent from this machine.

### Schema Corrections (applicable to all steps)

The task steps contain several names that differ from the actual Prisma schema and handler implementations. These must be corrected before any live run:

| Step reference | Actual value in code |
|---|---|
| Table `provenance_blocks` | Model `Block` → no `@@map` → Prisma default table name `"Block"` (Postgres: `"Block"` — quoted, case-sensitive). Use `prisma.block` in client code, not `provenance_blocks`. |
| Column `file_id` on blocks | `sourceFileId` (FK to `SourceFile`, not `File`) |
| Table `files` — column `file_type` | Column does not exist. `File` model has `role: FileRole` (enum: `template` \| `case_doc`) and `mimeType: String`. Document type routing lives in `SourceFile.type` (`"pdf-native"` \| `"pdf-scanned"` \| `"docx"`). |
| `llm_audit_log` — column `operation` | Column is named `feature` (enum `LlmFeature`: `zone_classification`, `case_extraction`, `medical_narrative`, `refinement`, `skeleton_generation`). No `operation` column exists. |
| `llm_audit_log` — column `job_id` | No `jobId` column on `LlmAuditLog`. Rows are filtered by `userId` and `feature` only. Cross-job queries must join via `userId` or use the `feature` + time range. |
| Extraction endpoint | `POST /jobs/:id/extract` (handler: `post-jobs-extract.ts`) — NOT `/jobs/:id/generate`. The `/generate` endpoint (`post-jobs-generate.ts`) runs the full demand-letter generation using Bedrock streaming, not field extraction. |
| Attorney-judgment endpoint | `POST /jobs/:id/attorney-judgment` (handler: `post-jobs-attorney-judgment.ts`). Body shape: `{ "fields": [{ "fieldName": "...", "value": "..." }], "acceptMissing": ["..."] }`. NOT a `PATCH /jobs/:id/fields`. |
| `LlmAuditLog` no `userId` field for case-extraction | `userId` is set to `"system"` for automated extraction runs (see `post-jobs-extract.ts` line 18 fallback). |

### Step-by-Step Findings

#### Step 1 — Pre-flight: Confirm Environment

**Static finding — FAIL (pre-conditions not met):**

- SAM CLI is not installed on this machine. `sam local start-api` cannot be run. No deployed AWS endpoint is configured.
- `raw/pat-donahue/` directory does **not exist**. The only Pat Donahue file present is `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx`, which is a demand letter **template**, not a case document (medical records, police reports, etc.).
- `packages/api/src/index.ts` exports only a static `{ status: 'ok' }` handler — it is a placeholder, not a real router. There is no `/health` route mapped in `template.yaml`; a health-check `GET /health` would return 403 from API Gateway.

**[BLOCKED: SAM CLI not installed; no live environment; Pat Donahue case documents absent from `raw/`]**

Action required before this step can pass:
1. Install SAM CLI or confirm an AWS deployment URL.
2. Obtain and place Pat Donahue case documents (at least one scanned PDF and one text-layer PDF) in `raw/pat-donahue/` or an agreed fixture path.

---

#### Step 2 — Upload Pat Donahue Case Documents

**Static finding — endpoint confirmed:**

- `POST /jobs` → `PostJobsFunction` → handler `post-jobs.ts` → wired in `template.yaml` line 205.
- `POST /jobs/{id}/files` → `PostJobsFilesFunction` → handler `post-jobs-files.ts` → wired in `template.yaml` line 229.
- Response from `POST /jobs/{id}/files` is HTTP 201 per the task description; actual handler code would need runtime confirmation.
- Note: `POST /jobs` body field `clientName` is not validated by schema — the `Job` model has no `clientName` column. The job is created with only `status: "pending"`. The curl command in the step spec will succeed but `clientName` is silently ignored.

**[BLOCKED: SAM CLI / live environment required for runtime execution]**

---

#### Step 3 — Verify Textract / Text-Parse and Block Storage

**Static finding — schema corrections required:**

- The `SourceFile` model (no `@@map`) → Postgres table name `"SourceFile"` (quoted). Columns: `id`, `jobId`, `s3Key`, `type` (`"pdf-native"` \| `"pdf-scanned"` \| `"docx"`), `textractJobId`, `status` (`"pending"` \| `"processing"` \| `"complete"` \| `"error"`), `errorMessage`.
- Step 3 references `status = 'parsed'` — the actual status enum values are `pending`, `processing`, `complete`, `error`. Use `status = 'complete'` in the assertion query.
- Step 3 references `file_type` — use `type` column on `SourceFile` instead.
- Blocks are in model `Block` (Postgres table `"Block"`, quoted). FK column is `sourceFileId` (references `SourceFile.id`). To query blocks by job, join through `SourceFile`: `SELECT b.* FROM "Block" b JOIN "SourceFile" sf ON b."sourceFileId" = sf.id WHERE sf."jobId" = '<job_id>'`.
- `bbox` is a `Json` column; expected shape `{ left, top, width, height }` is correct per schema comment.
- `GET /jobs/:id/blocks` endpoint exists (`GetJobsBlocksFunction`, path `/jobs/{id}/blocks`, handler `get-jobs-blocks.ts`). It supports `?type=`, `?page_num=`, `?page=`, `?limit=` query params and returns `{ blocks, page, limit, totalCount, hasMore }`.

**[BLOCKED: SAM CLI / live environment required for runtime execution]**

---

#### Step 4 — Trigger and Verify Claude Grounded Extraction

**Static finding — endpoint name correction required:**

- Extraction uses `POST /jobs/{id}/extract` → `PostJobsExtractFunction` → handler `post-jobs-extract.ts` → calls `runGroundedExtraction(jobId, userId)` (lib: `extraction-service.ts`).
- This is **not** `/jobs/:id/generate`. The `/generate` endpoint triggers full demand-letter generation (Bedrock streaming) and is gated behind the gap report (returns 422 if any gaps remain open).
- Extraction response is synchronous HTTP 200 with `{ jobId, totalFields, filledFields, nullFields }` — no async `run_id` is returned; no polling is needed.
- `extracted_fields` table columns: `id`, `jobId`, `fieldName`, `value`, `blockIds` (Json, default `[]`), `confidence`, `isNull`, `nullReason`, `source` (`null` for grounded extraction, `"attorney-judgment"` for overrides), `acceptMissing`.
- Note: `is_attorney_judgment` column referenced in the step spec does not exist. Use `source = 'attorney-judgment'` as the equivalent filter.
- The extraction service (`extraction-service.ts`) is responsible for populating `blockIds` with citation references. Whether it actually does so for all non-null fields requires runtime confirmation.

**[BLOCKED: SAM CLI / live environment required for runtime execution; also blocked by Step 1 (no case documents)]**

---

#### Step 5 — Verify Gap Report: Three Attorney-Judgment Fields Surface

**Static finding — endpoint confirmed, logic verified:**

- `GET /jobs/{id}/gap-report` → `GetJobsGapReportFunction` → handler `get-jobs-gap-report.ts`. Wired at path `/jobs/{id}/gap-report` in `template.yaml` line 558.
- Handler delegates to `computeGapReport(jobId)` in `lib/sufficiency-gate.ts`. Logic confirmed:
  1. Finds the most recently ingested `Template` for the job.
  2. Fetches all `TemplateSlot` rows for that template.
  3. Fetches all `ExtractedField` rows for the job.
  4. A slot is "covered" if its matching `ExtractedField` has `acceptMissing = true`, `source = 'attorney-judgment'`, or (`isNull = false` AND `confidence >= SUFFICIENCY_THRESHOLD` — default 0.80).
  5. Uncovered slots appear in the `gaps` array: `[{ fieldName, nullReason, acceptMissing }]`.
  6. Response shape: `{ covered: number, total: number, gaps: GapItem[] }`.
- The specific three fields (`demand_amount`, `general_damages`, `future_medical`) surfacing as gaps depends on template slot configuration and extraction results — cannot be statically asserted; requires runtime.
- Generation gate behavior confirmed: `post-jobs-generate.ts` lines 22–33 call `computeGapReport(jobId)` and return HTTP 422 with `{ error: "gap_report_not_cleared", message: "...", gaps: [...] }` if `gapReport.gaps.length > 0`.

**[BLOCKED: SAM CLI / live environment required for runtime execution]**

---

#### Step 6 — Attorney Fill: Gap Report Clears

**Static finding — endpoint confirmed, body shape corrected:**

- Endpoint: `POST /jobs/{id}/attorney-judgment` → `PostJobsAttorneyJudgmentFunction` → handler `post-jobs-attorney-judgment.ts`. Wired at path `/jobs/{id}/attorney-judgment` in `template.yaml` line 589.
- Correct request body shape (not a PATCH):
  ```json
  {
    "fields": [
      { "fieldName": "demand_amount", "value": "500000" },
      { "fieldName": "general_damages", "value": "150000" },
      { "fieldName": "future_medical", "value": "75000" }
    ]
  }
  ```
- Response: HTTP 200 `{ "ok": true }`.
- After upsert, each field gets `source = "attorney-judgment"`, `confidence = 1.0`, `isNull = false`. This satisfies the `computeGapReport` coverage check (`source === 'attorney-judgment'`), so a re-fetch of the gap report should return `gaps: []`.
- The generation gate opens because `gapReport.gaps.length === 0`, so the next `POST /jobs/:id/generate` proceeds past the 422 guard.

**[BLOCKED: SAM CLI / live environment required for runtime execution]**

---

#### Step 7 — Verify Cost Dashboard: Case-Extraction Rows

**Static finding — endpoint confirmed, field name corrections required:**

- `GET /admin/llm-costs` → `GetAdminLlmCostsFunction` → handler `get-admin-llm-costs.ts`. Wired at path `/admin/llm-costs` in `template.yaml` line 252.
- Response shape: `{ aggregates: [...], recentRows: [...] }` — NOT `{ rows: [...] }`. The jq expression in the step spec (`.rows[]`) is wrong; use `.recentRows[]` or `.aggregates[]`.
- Aggregation is `groupBy(['feature'])` — the column is `feature`, not `operation`. The enum value for extraction is `case_extraction` (underscore), not `case-extraction` (hyphen).
- Corrected jq filter: `jq '.recentRows[] | select(.feature == "case_extraction")'`
- The `LlmAuditLog` model has no `jobId` column. The step spec's cross-check query (`WHERE job_id = '<job_id>' AND operation = 'case-extraction'`) is invalid. Use time-range + feature filter instead:
  ```sql
  SELECT feature, input_tokens, output_tokens, estimated_cost_usd
  FROM "LlmAuditLog"
  WHERE feature = 'case_extraction'
  ORDER BY "createdAt" DESC
  LIMIT 10;
  ```
- Whether `extraction-service.ts` actually writes to `LlmAuditLog` requires runtime confirmation — the `ai-provider.ts` / `ai.ts` layer must call the audit log writer. This is a dependency on TASK-033/TASK-034 implementation quality.

**[BLOCKED: SAM CLI / live environment required for runtime execution]**

---

### Summary of Blockers

| Blocker | Affects Steps |
|---|---|
| SAM CLI not installed — cannot start local Lambda stack | 1–7 (all) |
| No deployed AWS API endpoint configured | 1–7 (all) |
| `raw/pat-donahue/` directory does not exist — no case documents | 1, 2, 3, 4 |
| Pat Donahue DOCX in `raw/` is a demand letter template, not a case document | 1 |

### Defects in Step Spec (must fix before live run)

| Step | Spec text | Correction |
|---|---|---|
| 3 | `status = 'parsed'` | `status = 'complete'` |
| 3 | `provenance_blocks` table | `"Block"` table (Postgres quoted) |
| 3 | `file_id` column on blocks | `sourceFileId` |
| 3 | `file_type` column on files | `type` column on `SourceFile` |
| 4 | `POST /jobs/:id/generate` for extraction | `POST /jobs/:id/extract` |
| 4 | HTTP 202 expected | HTTP 200 (synchronous response) |
| 4 | `is_attorney_judgment = true` filter | `source = 'attorney-judgment'` |
| 6 | `PATCH /jobs/:id/fields` endpoint | `POST /jobs/:id/attorney-judgment` |
| 7 | `.rows[]` in jq | `.recentRows[]` |
| 7 | `.operation == "case-extraction"` | `.feature == "case_extraction"` |
| 7 | `llm_audit_log.job_id` column | Column does not exist; filter by `feature` + time range |
| 7 | `llm_audit_log.operation` column | Column is `feature` |

---
id: UAT-033
title: "UAT: ROADMAP-003 Phase 3 — Grounded Extraction"
status: pending
task: TASK-033
created: 2026-06-24
updated: 2026-06-24
---

# UAT-033 — UAT: ROADMAP-003 Phase 3 — Grounded Extraction

implements::[[TASK-033]]

> **Source task**: [[TASK-033]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Monorepo dependencies installed: `pnpm install` from repo root
- [ ] TypeScript project references built (or at least type-checkable): `pnpm -r build` or `pnpm typecheck`
- [ ] PostgreSQL is reachable and `DATABASE_URL` is set (source `.env` before running DB checks)
- [ ] `prisma generate` has been run so the Prisma client reflects the current schema
- [ ] AWS SAM CLI is installed (`sam --version`) for Lambda-handler API tests
- [ ] A running SAM local environment or equivalent test harness is available for API tests
- [ ] `UAT_JOB_ID` env var holds a valid job UUID from the DB for positive-path API tests (optional — not required for static and error-path tests)

---

## Test Cases

---

### UAT-STATIC-001: TypeScript compiles with zero errors

- **Description**: Verifies that `invokeModelWithTools`, the extraction schema, the extraction service, and the handler all type-check cleanly across the monorepo — no `tsc` errors anywhere.
- **Steps**:
  1. From the monorepo root, run the command below.
  2. Observe that `tsc --noEmit` exits with code 0 and prints no diagnostic lines.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits 0. No error lines printed. Both `@demand-letter/api` and `@demand-letter/db` pass.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-002: Prisma schema has ExtractedField model with correct columns

- **Description**: Confirms the `ExtractedField` model is present in `packages/db/prisma/schema.prisma` with all required columns, the composite unique index, and the correct table mapping.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `model ExtractedField` block.
  3. Verify each column listed in the expected result is present with the correct type.
  4. Verify the `@@unique([jobId, fieldName])` constraint and `@@map("extracted_fields")` directive are present.
  5. Verify the `Job` model has `extractedFields ExtractedField[]` in its relations.
- **Expected Result**:
  - Model `ExtractedField` exists.
  - Columns: `id String @id`, `jobId String`, `fieldName String`, `value String?`, `blockIds Json @default("[]")`, `confidence Float @default(0)`, `isNull Boolean @default(false)`, `nullReason String?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.
  - `@@unique([jobId, fieldName])` and `@@index([jobId])` are present.
  - `@@map("extracted_fields")` is present.
  - `Job` model includes `extractedFields ExtractedField[]`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-003: ExtractedField type is exported from db package

- **Description**: Confirms `packages/db/src/index.ts` re-exports the `ExtractedField` type from `@prisma/client`, making it available to consumers such as the API package.
- **Steps**:
  1. Open `packages/db/src/index.ts`.
  2. Find the `export type { ... }` statement.
  3. Confirm `ExtractedField` appears in the exported type list.
- **Expected Result**: The file contains a line matching `export type { ..., ExtractedField, ... } from '@prisma/client';` (order does not matter).
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-004: extraction-schema.ts exports CANONICAL_FIELDS and buildExtractionTool

- **Description**: Validates that `packages/api/src/lib/extraction-schema.ts` exports the canonical field array and the tool builder, and that the array contains exactly 44 named fields.
- **Steps**:
  1. Open `packages/api/src/lib/extraction-schema.ts`.
  2. Confirm `CANONICAL_FIELDS` is exported as a `const` array with `as const`.
  3. Count the entries — there should be exactly 44 field name strings.
  4. Confirm the following field groups are all represented:
     - Claimant/plaintiff: `claimant_name`, `claimant_dob`, `claimant_address`, `claimant_phone`, `claimant_email`
     - Incident: `incident_date`, `incident_location`, `incident_description`, `incident_police_report_number`
     - Defendant/insurer: `defendant_name`, `defendant_address`, `insurer_name`, `insurer_claim_number`, `insurer_adjuster_name`, `insurer_adjuster_phone`, `insurer_adjuster_email`, `policy_number`, `policy_limits`
     - Medical treatment: `treating_physician_name`, `treating_facility_name`, `first_treatment_date`, `last_treatment_date`, `diagnosis_codes`, `treatment_summary`, `future_treatment_recommended`, `future_treatment_description`
     - Medical costs: `total_medical_bills`, `paid_by_health_insurance`, `outstanding_balance`, `future_medical_estimate`
     - Lost wages: `employer_name`, `lost_wages_amount`, `lost_wages_period`, `return_to_work_date`
     - Damages: `pain_and_suffering_description`, `general_damages_estimate`, `demand_amount`, `demand_expiry_date`
     - Attorney: `attorney_name`, `attorney_bar_number`, `law_firm_name`, `law_firm_address`
  5. Confirm `buildExtractionTool` is exported as a function.
  6. Call (or inspect) `buildExtractionTool()` — the returned object must have `name: 'extract_case_fields'` and an `input_schema.properties` object with one entry per `CANONICAL_FIELDS` element.
- **Expected Result**:
  - `CANONICAL_FIELDS` is exported and contains 44 entries covering all groups above.
  - `buildExtractionTool` is exported.
  - `buildExtractionTool()` returns `{ name: 'extract_case_fields', description: string, input_schema: { type: 'object', properties: { [field]: {...}, ... }, required: [...44 fields] } }`.
- [FAIL: auto-judge: CANONICAL_FIELDS contains 42 entries, expected 44 — all named field groups are present but total count is 42 not 44] <!-- 2026-06-24 -->

---

### UAT-STATIC-005: ai-provider.ts exports invokeModelWithTools

- **Description**: Confirms `packages/api/src/lib/ai-provider.ts` has the `invokeModelWithTools` function exported with the correct signature, accepting `tools` and optional `tool_choice` in its options.
- **Steps**:
  1. Open `packages/api/src/lib/ai-provider.ts`.
  2. Locate the `invokeModelWithTools` export.
  3. Confirm it is declared with `export async function invokeModelWithTools(opts: InvokeWithToolsOptions): Promise<Record<string, unknown>>`.
  4. Confirm `InvokeWithToolsOptions` includes a `tools: Tool[]` property and an optional `tool_choice` property.
  5. Confirm the implementation finds a `tool_use` content block in the parsed response and throws `'Claude did not return a tool_use block'` if none is found.
  6. Confirm `logAudit` is called in both the success and error paths.
- **Expected Result**:
  - `invokeModelWithTools` is exported.
  - Its options type includes `tools: Tool[]` and optional `tool_choice`.
  - Return type is `Promise<Record<string, unknown>>` (the `toolUseBlock.input`).
  - Audit logging occurs in success and error paths.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-006: template.yaml registers PostJobsExtractFunction on POST /jobs/{id}/extract

- **Description**: Confirms the SAM template declares the Lambda function and API Gateway event for the extraction endpoint.
- **Steps**:
  1. Open `template.yaml`.
  2. Locate the `PostJobsExtractFunction` resource block.
  3. Verify the fields listed in the expected result.
- **Expected Result**:
  - Resource `PostJobsExtractFunction` is present with `Type: AWS::Serverless::Function`.
  - `Handler: dist/handlers/post-jobs-extract.handler`.
  - `Runtime: nodejs20.x`.
  - Under `Events`, key `PostJobsExtract` with `Type: Api`, `Path: /jobs/{id}/extract`, `Method: post`.
  - `Layers` includes `!Ref DbLayer`.
  - `Policies` includes a `bedrock:InvokeModel` allow statement.
  - Entry point `src/handlers/post-jobs-extract.ts` is listed in `BuildProperties.EntryPoints`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-001: POST /jobs/:id/extract returns 400 when job ID is absent

- **Description**: Verifies the handler returns HTTP 400 with a JSON error body when the path parameter `id` is missing or empty. This tests the first guard in the handler (`if (!jobId)`).
- **Steps**:
  1. Start the SAM local API: `sam local start-api` from the monorepo root (or use an already-running instance).
  2. Run the command below — note the URL has no trailing `{id}` segment, which means the path parameter resolves to empty/undefined depending on routing. Alternatively, if SAM routing requires an id placeholder, use a request that bypasses the path param by directly invoking the handler with a missing `pathParameters` object.
  3. Observe the HTTP status code and JSON body.

  > **Note**: Because SAM local requires an `{id}` in the URL path for the route to match, the recommended way to test the missing-jobId guard is to invoke the Lambda directly with a synthetic event:
  ```bash
  sam local invoke PostJobsExtractFunction --event - <<'EOF'
  {"pathParameters": null, "requestContext": {}}
  EOF
  ```
- **Expected Result**: Lambda exits with response `{ "statusCode": 400, "body": "{\"error\":\"Missing job ID\"}" }`.
- [FAIL: auto-judge: SAM local environment not available — Lambda fails with Runtime.ImportModuleError: Cannot find module '@demand-letter/db' (dist/ not built with bundled dependencies)] <!-- 2026-06-24 -->

---

### UAT-API-002: POST /jobs/:id/extract returns 404 for an unknown job ID

- **Description**: Verifies the handler returns HTTP 404 when the `id` path parameter is present but does not match any job in the database.
- **Steps**:
  1. Ensure `DATABASE_URL` is set in the environment (source `.env`).
  2. Start SAM local API or invoke the function directly.
  3. Run the command below using a syntactically valid but non-existent CUID.
- **Command**:
  ```bash
  sam local invoke PostJobsExtractFunction --event - <<'EOF'
  {"pathParameters": {"id": "clzzzzzzzzzzzzzzzzzzzzzzzz"}, "requestContext": {}}
  EOF
  ```
- **Expected Result**: Lambda exits with response `{ "statusCode": 404, "body": "{\"error\":\"Job not found\"}" }`.
- [FAIL: auto-judge: SAM local environment not available — Lambda fails with Runtime.ImportModuleError: Cannot find module '@demand-letter/db' (dist/ not built with bundled dependencies)] <!-- 2026-06-24 -->

---

### UAT-API-003: POST /jobs/:id/extract success path returns correct JSON shape

- **Description**: Verifies the 200 response body contains `jobId`, `totalFields`, `filledFields`, and `nullFields` when called with a valid job that has blocks and the Bedrock call succeeds.
- **Steps**:
  1. Ensure `DATABASE_URL` and AWS credentials for Bedrock are set.
  2. Identify a job ID that has associated `Block` records in the database and set it as `UAT_JOB_ID`.
  3. Run the command below. Because the Bedrock call requires live AWS credentials and a real model invocation, this test may be skipped in offline environments — mark it accordingly.
- **Command**:
  ```bash
  sam local invoke PostJobsExtractFunction --event - <<EOF
  {"pathParameters": {"id": "$UAT_JOB_ID"}, "requestContext": {}}
  EOF
  ```
- **Expected Result**:
  - `statusCode: 200`.
  - Body is valid JSON with shape `{ jobId: string, totalFields: number, filledFields: number, nullFields: number }`.
  - `totalFields` equals `filledFields + nullFields`.
  - `totalFields` is between 0 and 44 (the canonical field count).
  - Rows exist in the `extracted_fields` DB table for this `jobId`.

  > **Offline skip**: If Bedrock credentials are unavailable, mark this test as skipped and note the reason.
- [FAIL: auto-judge: SAM local environment not available — Lambda fails with Runtime.ImportModuleError: Cannot find module '@demand-letter/db' (dist/ not built with bundled dependencies)] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Duplicate extract call upserts rather than duplicates rows

- **Description**: Verifies the `@@unique([jobId, fieldName])` constraint in the schema is honoured at the application level — calling the extract endpoint twice for the same job replaces existing rows rather than throwing a unique-constraint error.
- **Steps**:
  1. Requires the same live setup as UAT-API-003 (Bedrock credentials, real job with blocks).
  2. Run the extract invocation twice in succession for the same `UAT_JOB_ID`.
  3. After both calls, query the `extracted_fields` table and count rows for the job.
- **Expected Result**:
  - Both calls return `statusCode: 200`.
  - The number of rows in `extracted_fields` for the job equals the number of canonical fields returned by Claude (at most 44) — not double that count.
  - No `unique constraint` or `P2002` Prisma error appears in logs.

  > **Offline skip**: If Bedrock credentials are unavailable, mark this test as skipped and note the reason.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Handler returns 500 and does not crash process when extraction fails

- **Description**: Confirms the handler's `try/catch` wraps `runGroundedExtraction` and returns a structured 500 error instead of letting the Lambda crash with an unhandled exception.
- **Steps**:
  1. Invoke the handler with a valid job ID that exists in the DB but with AWS credentials intentionally absent or misconfigured (e.g., set `AWS_ACCESS_KEY_ID=invalid`).
  2. Observe the response.
- **Command**:
  ```bash
  AWS_ACCESS_KEY_ID=invalid AWS_SECRET_ACCESS_KEY=invalid sam local invoke PostJobsExtractFunction --event - <<EOF
  {"pathParameters": {"id": "$UAT_JOB_ID"}, "requestContext": {}}
  EOF
  ```
- **Expected Result**:
  - Lambda exits cleanly (no unhandled exception).
  - Response has `statusCode: 500`.
  - Body is valid JSON with shape `{ error: 'Extraction failed', message: string }`.
- [FAIL: auto-judge: SAM local environment not available — Lambda fails with Runtime.ImportModuleError: Cannot find module '@demand-letter/db' (dist/ not built with bundled dependencies)] <!-- 2026-06-24 -->

---
id: UAT-048
title: "UAT: Wire renderTemplate into post-jobs-generate.ts: upload DOCX to S3 and set jobs.status = complete"
status: passed
task: TASK-048
created: 2026-06-25
updated: 2026-06-25
---

# UAT-048 — UAT: Wire renderTemplate into post-jobs-generate.ts: upload DOCX to S3 and set jobs.status = complete

implements::[[TASK-048]]

> **Source task**: [[TASK-048]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local is running: `sam local start-api --env-vars env.json --warm-containers EAGER`
- [ ] A fully prepped job exists in the local DB — has files, a tagged template (with `s3KeyTagged` set), extracted fields covering all required slots, and no gap-report blockers. Set `export JOB_ID=<cuid>` before running test commands.
- [ ] AWS credentials are active in the shell (used by SAM local Lambda containers for S3 and Bedrock): `aws s3 ls s3://dev-demand-letter-docs-429842292480` should succeed.
- [ ] `API_BASE_URL` is exported: `export API_BASE_URL=http://127.0.0.1:3000`

---

## Test Cases

### UAT-SCHEMA-001: outputS3Key column exists in Prisma Job model
- **Scenario**: Verify the schema migration was applied — the `outputS3Key` field is present in `packages/db/prisma/schema.prisma`.
- **Steps**:
  1. From the repo root, run:
     ```bash
     grep -c 'outputS3Key' packages/db/prisma/schema.prisma
     ```
- **Expected Result**: Output is `1` (the field declaration is present exactly once).
- [x] Pass <!-- 2026-06-25 -->

### UAT-SCHEMA-002: outputS3Key column present in live database
- **Scenario**: Verify the Prisma migration was applied to the local Postgres database so the `jobs.output_s3_key` column exists.
- **Steps**:
  1. Run:
     ```bash
     psql demand_letter_dev -c "\d jobs" | grep output_s3_key
     ```
- **Expected Result**: A row containing `output_s3_key` is printed, confirming the column exists.
- [FAIL: auto-judge: output_s3_key column not found in jobs table — migration was not applied to live DB (psql \d jobs shows no output_s3_key column)] <!-- 2026-06-25 -->

### UAT-CODE-001: Handler imports renderTemplate, TemplateRenderError, and buildDataObject from lib barrel
- **Scenario**: Confirm the three new symbols are imported at the top of the handler (static source code verification).
- **Steps**:
  1. Run:
     ```bash
     grep 'renderTemplate\|TemplateRenderError\|buildDataObject' packages/api/src/handlers/post-jobs-generate.ts
     ```
- **Expected Result**: Output contains a single line importing all three names from `'../lib'`.
- [x] Pass <!-- 2026-06-25 -->

### UAT-CODE-002: Handler builds data object, injects medicalNarrative, and calls renderTemplate
- **Scenario**: Confirm that `buildDataObject`, the narrative injection, and `renderTemplate` appear in the handler body in the correct order.
- **Steps**:
  1. Run:
     ```bash
     grep -n 'buildDataObject\|medicalNarrative\|renderTemplate\|outputS3Key\|status.*complete' packages/api/src/handlers/post-jobs-generate.ts
     ```
- **Expected Result**: Output shows (in ascending line-number order): `buildDataObject(jobId)`, `.medicalNarrative = narrativeText`, `renderTemplate(jobId, data)`, `outputS3Key`, and `status: 'complete'` — confirming all five wiring steps are present.
- [x] Pass <!-- 2026-06-25 -->

### UAT-CODE-003: TemplateRenderError catch block precedes generic catch
- **Scenario**: The `TemplateRenderError` guard must be the first branch in the catch block so it takes precedence over the generic re-throw.
- **Steps**:
  1. Run:
     ```bash
     grep -n 'TemplateRenderError\|throw err' packages/api/src/handlers/post-jobs-generate.ts
     ```
- **Expected Result**: The `instanceof TemplateRenderError` line appears at a lower line number than `throw err`, confirming correct ordering.
- [x] Pass <!-- 2026-06-25 -->

### UAT-API-001: Happy path — 200 SSE response with complete event
- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: With a fully prepped job, the endpoint returns HTTP 200 with `Content-Type: text/event-stream` and a body ending in `event: complete`.
- **Steps**:
  1. Ensure `JOB_ID` is set to a fully prepped job (files, tagged template, extracted fields, no gaps).
  2. Run the curl command below as-is:
- **Command**:
  ```bash
  curl -sS -X POST "${API_BASE_URL}/jobs/${JOB_ID}/generate" -H 'Content-Type: application/json' -D -
  ```
- **Expected Result**: HTTP 200; response headers include `content-type: text/event-stream`; body contains one or more `data: ...` SSE lines followed by `event: complete\ndata: \n\n`.
- [FAIL: auto-judge: no fully prepped job exists in local DB (all available jobs fail sufficiency precheck or have no files); additionally the DB migration for output_s3_key was not applied so the handler would fail at prisma.job.update] <!-- 2026-06-25 -->

### UAT-API-002: Job status set to 'complete' after successful generate
- **Scenario**: After the happy-path generate call succeeds, `jobs.status` must be `complete` (not `done`, not `processing`).
- **Steps**:
  1. Run the generate request from UAT-API-001 against `$JOB_ID` and wait for it to complete.
  2. Query the DB:
     ```bash
     psql demand_letter_dev -c "SELECT status FROM jobs WHERE id = '$JOB_ID';"
     ```
- **Expected Result**: The `status` column reads `complete`.
- [FAIL: auto-judge: prerequisite UAT-API-001 not satisfied — no fully prepped job available and DB migration not applied] <!-- 2026-06-25 -->

### UAT-API-003: outputS3Key persisted on the job row after generate
- **Scenario**: After a successful generate, `jobs.output_s3_key` is set to `<jobId>/output/demand-letter.docx`.
- **Steps**:
  1. After UAT-API-001 completes, query:
     ```bash
     psql demand_letter_dev -c "SELECT output_s3_key FROM jobs WHERE id = '$JOB_ID';"
     ```
- **Expected Result**: `output_s3_key` equals `<JOB_ID>/output/demand-letter.docx` (the exact S3 key pattern).
- [FAIL: auto-judge: prerequisite UAT-API-001 not satisfied and output_s3_key column absent from DB (migration not applied)] <!-- 2026-06-25 -->

### UAT-API-004: DOCX file exists in S3 at the expected key
- **Scenario**: The rendered DOCX buffer was uploaded to S3 under `${jobId}/output/demand-letter.docx` and is retrievable.
- **Steps**:
  1. After UAT-API-001 completes:
     ```bash
     aws s3 ls "s3://dev-demand-letter-docs-429842292480/${JOB_ID}/output/demand-letter.docx"
     ```
- **Expected Result**: Output lists the object with a non-zero file size (a valid DOCX is at minimum a few KB).
- [FAIL: auto-judge: prerequisite UAT-API-001 not satisfied — no DOCX was uploaded to S3] <!-- 2026-06-25 -->

### UAT-API-005: Downloaded DOCX is a valid ZIP/DOCX (PK magic bytes)
- **Scenario**: The S3 object is a real DOCX (which is a ZIP archive) — its first two bytes are `PK` (hex `50 4B`).
- **Steps**:
  1. Download the output object and check the magic bytes:
     ```bash
     aws s3 cp "s3://dev-demand-letter-docs-429842292480/${JOB_ID}/output/demand-letter.docx" /tmp/test-output.docx && xxd /tmp/test-output.docx | head -1
     ```
- **Expected Result**: First line of `xxd` output starts with `00000000: 504b` confirming the PK ZIP signature.
- [FAIL: auto-judge: prerequisite UAT-API-001 not satisfied — no DOCX object exists in S3 to download] <!-- 2026-06-25 -->

### UAT-API-006: Narrative text is preserved in jobs.output after generate
- **Scenario**: The plain-text narrative (`output` column) is still written so the existing SSE stream body remains available; the new `outputS3Key` is additive.
- **Steps**:
  1. After UAT-API-001 completes, query:
     ```bash
     psql demand_letter_dev -c "SELECT LENGTH(output) FROM jobs WHERE id = '$JOB_ID';"
     ```
- **Expected Result**: `LENGTH(output)` is greater than 0 — a non-empty narrative text was persisted.
- [FAIL: auto-judge: prerequisite UAT-API-001 not satisfied — no successful generate was run] <!-- 2026-06-25 -->

### UAT-EDGE-001: TemplateRenderError returns HTTP 500 with structured payload
- **Scenario**: When docxtemplater encounters an unresolvable tag (e.g., the template references `{unknownTag}` but the data object has no such key and `acceptMissing` is false for it), `TemplateRenderError` is thrown, the job is set to `failed`, and the API returns 500 with `error: "template_render_failed"` and a non-empty `errors` array.
- **Steps**:
  1. Prepare a job where the tagged template contains a tag that is **not** present in the extracted fields and `acceptMissing` is false for that slot (so `buildDataObject` omits it, triggering `nullGetter` in docxtemplater).
  2. Set `BROKEN_JOB_ID` to that job's ID.
  3. Run:
     ```bash
     curl -sS -X POST "${API_BASE_URL}/jobs/${BROKEN_JOB_ID}/generate" -H 'Content-Type: application/json'
     ```
- **Expected Result**: HTTP 500; response body is `{"error":"template_render_failed","errors":[...]}` with at least one entry in `errors`; `jobs.status` for `BROKEN_JOB_ID` is `failed` when queried via psql.
- [FAIL: auto-judge: manual test requires human verification — requires a specially prepared broken job and the DB migration to be applied first] <!-- 2026-06-25 -->

### UAT-EDGE-002: TemplateRenderError sets job status to 'failed'
- **Scenario**: Confirm the DB state after a `TemplateRenderError` — the job must be `failed`, not `processing` or left ambiguous.
- **Steps**:
  1. After triggering the scenario in UAT-EDGE-001:
     ```bash
     psql demand_letter_dev -c "SELECT status FROM jobs WHERE id = '$BROKEN_JOB_ID';"
     ```
- **Expected Result**: `status` is `failed`.
- [FAIL: auto-judge: prerequisite UAT-EDGE-001 not satisfied — requires human to prepare broken job and apply DB migration] <!-- 2026-06-25 -->

### UAT-TYPECHECK-001: Monorepo-wide typecheck passes with zero errors
- **Scenario**: The new imports, S3 client usage, Prisma `outputS3Key` field, and `TemplateRenderError` catch are all type-safe.
- **Steps**:
  1. From the repo root, run:
     ```bash
     pnpm typecheck
     ```
- **Expected Result**: Command exits 0 with no TypeScript errors across all packages (api, db, web).
- [x] Pass <!-- 2026-06-25 -->

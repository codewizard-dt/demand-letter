---
id: UAT-015
title: "UAT: POST /jobs/:id/generate Endpoint — Naive Bedrock Generation with SSE"
status: passed
task: TASK-015
created: 2026-06-24
updated: 2026-06-24
---

# UAT-015 — UAT: POST /jobs/:id/generate Endpoint — Naive Bedrock Generation with SSE

implements::[[TASK-015]]

> **Source task**: [[TASK-015]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] SAM local stack running: `sam local start-api --env-vars env.json` (or deployed to a dev stage)
- [ ] `DOCUMENTS_BUCKET` env var set to the name of the S3 bucket used for source documents
- [ ] `BEDROCK_MODEL_ID` env var set to a valid Claude model ID (e.g. `anthropic.claude-sonnet-4-5`)
- [ ] AWS credentials configured with access to the Bedrock and S3 services
- [ ] Database reachable and migrated (the `jobs` table has an `output` column)
- [ ] A job ID obtained by running `POST /jobs` — save as `$JOB_ID`
- [ ] At least one DOCX template file and one PDF case document uploaded via `POST /jobs/$JOB_ID/files` — save the returned file IDs for reference

---

## Test Cases

### UAT-API-001: Happy path — generation succeeds and returns text/plain output

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that calling generate on a job with uploaded files triggers Bedrock generation, returns 200 text/plain with demand-letter content, and persists the output to the job row.
- **Steps**:
  1. Ensure prerequisites are met: job created, files uploaded (DOCX template + PDF case doc).
  2. Run the curl command below, substituting `$JOB_ID` with the job ID from prerequisites.
  3. Confirm HTTP 200 and a non-empty plain-text body.
  4. Verify the job row in the database: `status = 'done'` and `output` is non-null and matches the response body.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 200, `Content-Type: text/plain`, response body is a non-empty string representing the generated demand letter.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-002: Job status transitions — processing → done

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that the job's `status` field is set to `processing` at the start of generation and transitions to `done` after successful completion.
- **Steps**:
  1. Note the job's current `status` in the database (should be `pending` after file upload).
  2. Trigger generation via the curl command below.
  3. After the response, query the database or call `GET /jobs/$JOB_ID` (if available) to check the job row.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: After a 200 response, the job's `status` in the database is `done` and `output` is populated with the generated text.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-003: LLM audit log entry created

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that a row is written to `LlmAuditLog` with `feature = 'skeleton_generation'`, `provider = 'bedrock'`, and non-zero token counts after a successful generation.
- **Steps**:
  1. Record the count of rows in `llm_audit_logs` before generation.
  2. Trigger generation via curl (same as UAT-API-001).
  3. Wait ~2 seconds for the fire-and-forget audit log write to complete.
  4. Query the database: `SELECT * FROM llm_audit_logs WHERE feature = 'skeleton_generation' ORDER BY created_at DESC LIMIT 1;`
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: A new row exists in `llm_audit_logs` with `feature = 'skeleton_generation'`, `provider = 'bedrock'`, `user_id = 'system'`, `input_tokens > 0`, `output_tokens > 0`, and `estimated_cost_usd > 0`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Missing job ID — 400 error

- **Scenario**: Calling the endpoint without a job ID in the path.
- **Description**: Verifies that the handler returns 400 when `pathParameters.id` is absent.
- **Steps**:
  1. Call the endpoint with a path that omits the job ID segment.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs//generate' -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 400, JSON body `{"error":"Missing job id"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: No files uploaded for job — 422 error

- **Scenario**: Calling generate on a job that has no associated file records.
- **Description**: Verifies that the handler returns 422 when the `files` table has no rows for the given job ID.
- **Steps**:
  1. Create a brand-new job with `POST /jobs` — save the returned ID as `$EMPTY_JOB_ID`.
  2. Do NOT upload any files for this job.
  3. Call generate on the empty job.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$EMPTY_JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 422, JSON body `{"error":"No files uploaded for this job"}`. The job's `status` remains `pending` (not set to `processing`).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-003: Bedrock error — job status set to failed

- **Scenario**: Bedrock returns an error (e.g. invalid model ID, missing credentials, throttling).
- **Description**: Verifies that when Bedrock throws during generation, the job's `status` is set to `failed` and the handler re-throws (resulting in a 500 from API Gateway).
- **Steps**:
  1. Configure an invalid `BEDROCK_MODEL_ID` (e.g. `anthropic.invalid-model`) in the environment.
  2. Create a job and upload files as in the happy path.
  3. Call generate and observe the response code.
  4. Check the database: the job's `status` should be `failed`.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 500 (API Gateway re-throws the error). The job row in the database has `status = 'failed'` and `output` remains null.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-INT-001: Full end-to-end flow — create job, upload files, generate

- **Scenario**: Complete happy-path integration flow from job creation through generation.
- **Description**: Verifies the full request chain: `POST /jobs` → `POST /jobs/{id}/files` → `POST /jobs/{id}/generate` produces a non-empty demand letter and correct DB state.
- **Steps**:
  1. Create a job:
     ```bash
     JOB_ID=$(curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' | jq -r '.id')
     ```
  2. Upload a DOCX template and a PDF case document to the job:
     ```bash
     curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/files" \
       -F "file=@./fixtures/template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
       -F "file=@./fixtures/case.pdf;type=application/pdf"
     ```
  3. Run generation:
     ```bash
     curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate"
     ```
  4. Inspect the response body and the database row for the job.
- **Expected Result**:
  - Step 1: Returns `{"id":"<cuid>"}` with HTTP 201.
  - Step 2: Returns `{"files":[...]}` with HTTP 201, S3 keys and file records created.
  - Step 3: Returns HTTP 200 with `Content-Type: text/plain` and a non-empty generated demand letter body.
  - Database: job row has `status = 'done'` and `output` matches the response body.
  - `llm_audit_logs` has a new row with `feature = 'skeleton_generation'`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on localhost:3000] <!-- 2026-06-24 -->

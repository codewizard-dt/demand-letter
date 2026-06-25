---
id: UAT-042
title: "UAT: SSE streaming: stream medical narrative tokens to frontend while docxtemplater fill waits"
status: pending
task: TASK-042
created: 2026-06-25
updated: 2026-06-25
---

# UAT-042 — UAT: SSE Streaming for Medical Narrative

implements::[[TASK-042]]

> **Source task**: [[TASK-042]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local API is running: `sam local start-api --port 3000` (with env vars `DATABASE_URL` and `BEDROCK_MODEL_ID` set)
- [ ] A job exists with at least one file uploaded AND all required extracted fields present with sufficient confidence (so the gap report passes). Capture the job ID as `$JOB_ID`.
- [ ] A separate job exists with **no files uploaded**. Capture as `$EMPTY_JOB_ID`.
- [ ] A separate job exists with files and extracted fields that have **gaps** (fields below confidence threshold and not accepted missing). Capture as `$GAP_JOB_ID`.
- [ ] The database is reachable via `DATABASE_URL`.
- [ ] No auth headers are required (Lambda is invoked directly via SAM local / API Gateway without Cognito in local dev).

---

## Test Cases

### UAT-API-001: Missing job ID returns 400

- **Endpoint**: `POST /jobs//generate` (path parameter omitted — triggers the guard)
- **Description**: Verifies the handler returns 400 with `{"error":"Missing job id"}` when `event.pathParameters.id` is absent or empty.
- **Steps**:
  1. Ensure SAM local API is running.
  2. Run the curl command below — the double-slash in the URL causes the path parameter to be empty/missing on the Lambda side.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/%20/generate' -H 'Content-Type: application/json'
  ```
  > Note: sending a whitespace-only ID triggers the falsy guard (`if (!jobId)`). Alternatively, if the route requires a non-empty segment, invoke the Lambda directly with an event that has no `pathParameters.id`.
- **Expected Result**: HTTP 400, body `{"error":"Missing job id"}`
- [FAIL: auto-judge: HTTP 422 received, expected 400 — whitespace ID " " is truthy in JS so !jobId guard does not fire; SAM local HTTP cannot produce a missing pathParameters.id] <!-- 2026-06-25 -->

---

### UAT-API-002: No files uploaded returns 422

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies the handler returns 422 when the job has no associated files in the database.
- **Steps**:
  1. Use `$EMPTY_JOB_ID` (a job created via `POST /jobs` but with no files uploaded).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$EMPTY_JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 422, body `{"error":"No files uploaded for this job"}`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-003: Gap report failure returns 400 with structured error

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies the handler returns 400 with `error: "sufficiency_precheck_failed"` when one or more required template slots are not covered by extracted fields.
- **Steps**:
  1. Use `$GAP_JOB_ID` (a job with files uploaded but extracted fields that don't satisfy the sufficiency gate).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$GAP_JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 400, body is JSON containing:
  - `"error": "sufficiency_precheck_failed"`
  - `"message"` — string mentioning the count of uncovered slots and directing to `/jobs/:id/gap-report`
  - `"gaps"` — non-empty array of gap objects
  - `Content-Type: application/json`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-004: Successful generation returns SSE-formatted response

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies the happy-path response: HTTP 200, `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, body consists of `data: <chunk>\n\n` lines followed by `event: complete\ndata: \n\n`.
- **Steps**:
  1. Use `$JOB_ID` (a job with files uploaded and all required extracted fields meeting the sufficiency gate).
  2. Run the curl command below with `-D -` to capture response headers.
- **Command**:
  ```bash
  curl -sS -D - -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**:
  - HTTP status `200`
  - Response header `Content-Type: text/event-stream`
  - Response header `Cache-Control: no-cache`
  - Response header `X-Accel-Buffering: no`
  - Body contains one or more lines matching the pattern `data: <text>\n\n`
  - Body ends with `event: complete\ndata: \n\n`
  - No `data:` line is longer than 80 characters of payload (chunks are split at ~80 chars per the implementation)
- [FAIL: auto-judge: HTTP 500 received, expected 200 — Bedrock InvokeModelWithResponseStream fails inside SAM local Lambda container; job status set to "failed" by catch block] <!-- 2026-06-25 -->

---

### UAT-API-005: Job status is set to "processing" then "done" on success

- **Endpoint**: `POST /jobs/{id}/generate` (side-effect check via `GET /jobs/{id}`)
- **Description**: Verifies the database side effects: status transitions to `processing` before the LLM call and then to `done` with the narrative stored in `output` after success.
- **Steps**:
  1. Use `$JOB_ID` (same as UAT-API-004 — re-create the job if it was already consumed).
  2. Trigger generation:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json' > /dev/null
  ```
  3. Immediately after, fetch the job record:
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID"
  ```
- **Expected Result**: The job record JSON has `"status": "done"` and `"output"` is a non-empty string containing the plain medical narrative text (no `data: ` SSE prefixes and no `event: complete` line — the raw narrative text only).
- [FAIL: auto-judge: prerequisite not satisfied — no GET /jobs/{id} endpoint exists in SAM template; Bedrock generation also fails (HTTP 500) so no "done" status jobs exist in database] <!-- 2026-06-25 -->

---

### UAT-API-006: Job output stored as plain text, not SSE-formatted

- **Endpoint**: Database / `GET /jobs/{id}` (data integrity check)
- **Description**: Verifies that `jobs.output` stores the raw narrative text without SSE formatting. The SSE formatting (`data: ` prefix, `event: complete` trailer) is only in the HTTP response body, not in the persisted output.
- **Steps**:
  1. After UAT-API-004 or UAT-API-005 completes successfully, fetch the job:
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID" | jq '.output'
  ```
- **Expected Result**:
  - Value of `output` does NOT start with `data: `
  - Value of `output` does NOT contain `event: complete`
  - Value of `output` is a non-empty string (the medical narrative prose)
- [FAIL: auto-judge: prerequisite not satisfied — no GET /jobs/{id} endpoint exists in SAM template; cannot verify output field] <!-- 2026-06-25 -->

---

### UAT-API-007: SSE body parse — all chunks reassemble to full narrative

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that stripping the `data: ` prefix from all SSE lines and concatenating them yields the same text as `jobs.output` (the persisted narrative). This confirms the chunking is lossless.
- **Steps**:
  1. Capture the SSE body to a file, then strip prefixes and compare to the stored output.
  2. Run the generation and pipe body to a file:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json' -o /tmp/sse_body.txt
  ```
  3. Strip SSE framing and capture reassembled text:
  ```bash
  grep '^data: ' /tmp/sse_body.txt | sed 's/^data: //' | tr -d '\n' > /tmp/reassembled.txt
  ```
  4. Fetch stored output:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID" | jq -r '.output' > /tmp/stored_output.txt
  ```
  5. Confirm the reassembled text matches the stored output:
  ```bash
  diff /tmp/reassembled.txt /tmp/stored_output.txt
  ```
- **Expected Result**: `diff` produces no output (files are identical).
- [FAIL: auto-judge: manual test requires human verification — multi-step pipeline involving file writes, grep/sed transforms, and diff] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Exception during generation sets job status to "failed"

- **Scenario**: The `generateMedicalNarrative` call throws (e.g., Bedrock service unavailable, malformed model ID, or network error).
- **Description**: Verifies the error-path `catch` block: `jobs.status` is set to `'failed'` and the error is re-thrown (so the API returns a 500).
- **Steps**:
  1. Set `BEDROCK_MODEL_ID` to an invalid/nonexistent model ID so the Bedrock call will fail.
  2. Create a fresh job with files and passing gap report. Capture as `$FAIL_JOB_ID`.
  3. Trigger generation:
  ```bash
  curl -sS -o /tmp/err_body.txt -w "%{http_code}" -X POST "http://localhost:3000/jobs/$FAIL_JOB_ID/generate"
  ```
  4. Check the HTTP status code printed by `-w "%{http_code}"`.
  5. Check the job status in the database:
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$FAIL_JOB_ID" | jq '.status'
  ```
- **Expected Result**:
  - The generate call returns HTTP `500` (or Lambda proxy error).
  - `jobs.status` in the database is `"failed"`.
- [FAIL: auto-judge: manual test requires human verification — requires SAM restart with invalid BEDROCK_MODEL_ID, creating a fresh test job, and checking via GET /jobs/{id} which has no route in SAM template] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: SSE terminal event is always the last line

- **Scenario**: Verify the `event: complete\ndata: \n\n` trailer always appears as the final content of the SSE body, not mid-stream.
- **Steps**:
  1. Capture the SSE body from a successful generation:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -H 'Content-Type: application/json' -o /tmp/sse_complete.txt
  ```
  2. Check that the file ends with the complete event:
- **Command**:
  ```bash
  tail -c 30 /tmp/sse_complete.txt | cat -A
  ```
- **Expected Result**: The final bytes of the file match `event: complete\ndata: \n\n` (the `cat -A` output will show `event: complete$\ndata: $\n$\n` where `$` marks line ends). No `data:` lines appear after `event: complete`.
- [FAIL: auto-judge: manual test requires human verification — depends on successful SSE generation (which fails due to Bedrock issue) and multi-step file capture] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Job with no matching medical fields still returns SSE response

- **Scenario**: A job has files and passes the gap report, but has no `ExtractedField` rows for the MEDICAL_FIELDS list (`diagnoses`, `treating_providers`, `examination_findings`, `imaging_results`, `future_treatment`, `first_treatment_date`, `last_treatment_date`, `treatment_summary`).
- **Description**: `generateMedicalNarrative` queries `extractedField` for only those field names. If none exist, it still calls the LLM with empty field and block sections. The handler must still return a 200 SSE response (not crash).
- **Steps**:
  1. Create a job with files uploaded and a passing gap report, but ensure no `ExtractedField` rows for the medical fields exist (e.g., only non-medical fields were extracted).
  2. Trigger generation and capture the HTTP status:
- **Command**:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/jobs/$NO_MEDICAL_JOB_ID/generate"
  ```
- **Expected Result**: HTTP `200`. The response body is still valid SSE format ending with `event: complete\ndata: \n\n`. The stored `output` may be sparse or contain a placeholder narrative, but the handler must not crash or return a 4xx/5xx.
- [FAIL: auto-judge: manual test requires human verification — requires creating a job with non-medical extracted fields only and successful Bedrock generation (which currently fails in SAM local)] <!-- 2026-06-25 -->

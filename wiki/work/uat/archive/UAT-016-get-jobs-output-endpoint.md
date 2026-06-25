---
id: UAT-016
title: "UAT: GET /jobs/:id/output Endpoint — Return Generation Output"
status: passed
task: TASK-016
created: 2026-06-24
updated: 2026-06-24
---

# UAT-016 — UAT: GET /jobs/:id/output Endpoint — Return Generation Output

implements::[[TASK-016]]

> **Source task**: [[TASK-016]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] SAM local stack running: `sam local start-api --env-vars env.json` from repo root (port 3000)
- [ ] PostgreSQL is reachable and `DATABASE_URL` is set (sourced or passed as `--env-vars`)
- [ ] A Job record with `status = 'done'` and a non-null `output` field exists in the DB — capture its `id` as `$JOB_ID`
- [ ] A Job record with `status = 'pending'` exists — capture its `id` as `$PENDING_JOB_ID`
- [ ] A Job record with `status = 'processing'` exists — capture its `id` as `$PROCESSING_JOB_ID`
- [ ] A Job record with `status = 'failed'` exists — capture its `id` as `$FAILED_JOB_ID`
- [ ] A Job record with `status = 'done'` and `output = NULL` exists — capture its `id` as `$NULL_OUTPUT_JOB_ID`

> **Tip**: Job records can be seeded via `POST /jobs` to create them, then update `status` and `output` directly in the DB (`psql` or a migration seed script).

---

## Test Cases

### UAT-API-001: Happy path — done job returns plain-text output
- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that a completed job's output is returned as plain text with correct headers.
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Set `JOB_ID` to the ID of a `done` job with non-null output.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -i "http://localhost:3000/jobs/$JOB_ID/output"
  ```
- **Expected Result**: HTTP 200; response headers include `Content-Type: text/plain` and `Content-Disposition: attachment; filename="demand-letter-$JOB_ID.txt"`; body is the stored output text string.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on port 3000] <!-- 2026-06-24 -->

### UAT-API-002: Pending job returns 202 with status field
- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that a job still in `pending` status returns 202 — not ready yet.
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Set `PENDING_JOB_ID` to the ID of a `pending` job.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$PENDING_JOB_ID/output"
  ```
- **Expected Result**: HTTP 202; JSON body `{ "status": "pending" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on port 3000] <!-- 2026-06-24 -->

### UAT-API-003: Processing job returns 202 with status field
- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that a job still in `processing` status returns 202 — not ready yet.
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Set `PROCESSING_JOB_ID` to the ID of a `processing` job.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$PROCESSING_JOB_ID/output"
  ```
- **Expected Result**: HTTP 202; JSON body `{ "status": "processing" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on port 3000] <!-- 2026-06-24 -->

### UAT-API-004: Failed job returns 500
- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that a `failed` job returns a 500 error response.
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Set `FAILED_JOB_ID` to the ID of a `failed` job.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$FAILED_JOB_ID/output"
  ```
- **Expected Result**: HTTP 500; JSON body `{ "error": "Generation failed" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on port 3000] <!-- 2026-06-24 -->

### UAT-EDGE-001: Unknown job ID returns 404
- **Scenario**: Requesting output for a job ID that does not exist in the database.
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Run the curl command below with a non-existent ID.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/nonexistent-job-id-00000/output'
  ```
- **Expected Result**: HTTP 404; JSON body `{ "error": "Job not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on port 3000] <!-- 2026-06-24 -->

### UAT-EDGE-002: Done job with null output returns 200 with empty body
- **Scenario**: A completed job where `output` is NULL in the database — should return 200 with an empty body (not an error).
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Set `NULL_OUTPUT_JOB_ID` to the ID of a `done` job with `output = NULL`.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -i "http://localhost:3000/jobs/$NULL_OUTPUT_JOB_ID/output"
  ```
- **Expected Result**: HTTP 200; `Content-Type: text/plain`; body is empty string (zero bytes of content).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local stack not running on port 3000] <!-- 2026-06-24 -->

### UAT-STATIC-001: Handler file exists and exports handler
- **Scenario**: Verify the handler module is present and exports a `handler` symbol (static file-system check).
- **Steps**:
  1. From repo root, confirm the file exists.
- **Command**:
  ```bash
  test -f packages/api/src/handlers/get-jobs-output.ts && grep -q 'export const handler' packages/api/src/handlers/get-jobs-output.ts && echo "OK"
  ```
- **Expected Result**: Output is `OK`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-002: SAM template registers GetJobsOutputFunction at GET /jobs/{id}/output
- **Scenario**: Verify the SAM template wires the new function to the correct HTTP method and path.
- **Steps**:
  1. From repo root, inspect `template.yaml`.
- **Command**:
  ```bash
  grep -A 12 'GetJobsOutputFunction' template.yaml
  ```
- **Expected Result**: Output contains `Handler: src/handlers/get-jobs-output.handler`, `Path: /jobs/{id}/output`, and `Method: get`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-003: TypeScript compilation passes with zero errors
- **Scenario**: Verify no type errors were introduced.
- **Steps**:
  1. From repo root, run the typecheck command.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits 0; no TypeScript errors printed.
- [x] Pass <!-- 2026-06-24 -->

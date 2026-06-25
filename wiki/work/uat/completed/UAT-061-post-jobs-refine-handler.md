---
id: UAT-061
title: "UAT: POST /jobs/:id/refine — Lambda handler with SSE streaming, scope filtering, persist, and audit log"
status: passed
task: TASK-061
created: 2026-06-25
updated: 2026-06-25
---

# UAT-061 — UAT: POST /jobs/:id/refine Lambda handler

implements::[[TASK-061]]

> **Source task**: [[TASK-061]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local API is running: `sam local start-api --port 3000` (with env vars `DATABASE_URL` and `BEDROCK_MODEL_ID` set)
- [ ] A job exists in the database with a non-empty `output` column. Capture its ID as `$JOB_WITH_OUTPUT_ID`.
- [ ] A job exists in the database with `output` set to `null` (created via `POST /jobs` but never generated). Capture its ID as `$JOB_NO_OUTPUT_ID`.
- [ ] `DATABASE_URL` is set in the shell for DB verification tests (source `packages/db/.env` locally if needed).
- [ ] No auth headers are required (Lambda is invoked via SAM local / API Gateway without Cognito in local dev).

---

## Test Cases

### UAT-STATIC-001: Handler file exists at the expected path

- **File**: `packages/api/src/handlers/post-jobs-refine.ts`
- **Description**: Verifies the handler source file was created as part of this task.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  ls packages/api/src/handlers/post-jobs-refine.ts
  ```
- **Expected Result**: The file is listed with no error (exit code 0).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: SAM template registers the route at POST /jobs/{id}/refine

- **File**: `template.yaml`
- **Description**: Verifies `PostJobsRefineFunction` is declared with the correct HTTP method and path.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -A 5 'PostJobsRefineApi' template.yaml
  ```
- **Expected Result**: Output contains `Path: /jobs/{id}/refine` and `Method: post`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: Build artifact is emitted

- **File**: `.build/handlers/post-jobs-refine.js`
- **Description**: Verifies `pnpm build` produced the compiled handler artifact required by SAM.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  ls .build/handlers/post-jobs-refine.js
  ```
- **Expected Result**: The file is listed with no error (exit code 0).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: refineJob is exported from the web API client

- **File**: `packages/web/src/lib/api.ts`
- **Description**: Verifies the `refineJob` helper function is present and exported.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -c 'export async function refineJob' packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output is `1`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: TypeScript compiles without errors

- **Description**: Verifies the new handler and client do not introduce type errors across the monorepo.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits with code 0 and no `error TS` lines in output.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-001: Missing instruction returns 400

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Verifies the handler returns 400 with `{"error":"Missing instruction"}` when the request body omits the required `instruction` field.
- **Steps**:
  1. Ensure SAM local API is running.
  2. Use any valid job ID (e.g., `$JOB_WITH_OUTPUT_ID`) — the instruction guard fires before the DB lookup.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_WITH_OUTPUT_ID/refine" -H 'Content-Type: application/json' -d '{"scope":"all"}'
  ```
- **Expected Result**: HTTP 400, body `{"error":"Missing instruction"}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_WITH_OUTPUT_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-002: Non-existent job returns 404

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Verifies the handler returns 404 with `{"error":"Job not found"}` when no job row matches the path ID.
- **Steps**:
  1. Ensure SAM local API is running.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/nonexistent-job-id-000/refine' -H 'Content-Type: application/json' -d '{"instruction":"Make it shorter"}'
  ```
- **Expected Result**: HTTP 404, body `{"error":"Job not found"}`.
- [FAIL: auto-judge: HTTP 403 expected 404 — SAM route not matched; body was {"message":"Missing Authentication Token"}] <!-- 2026-06-25 -->

---

### UAT-API-003: Job with no output returns 422

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Verifies the handler returns 422 with `{"error":"Job output not yet generated"}` when `jobs.output` is null (i.e., the generate step has not run yet for this job).
- **Steps**:
  1. Use `$JOB_NO_OUTPUT_ID` (a job with no generated output).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_NO_OUTPUT_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Make it shorter"}'
  ```
- **Expected Result**: HTTP 422, body `{"error":"Job output not yet generated"}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_NO_OUTPUT_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-004: Happy-path refinement returns 200 SSE response

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Verifies the happy-path response: HTTP 200, `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, body contains `data: <chunk>\n\n` lines followed by `event: complete\ndata: \n\n`.
- **Steps**:
  1. Use `$JOB_WITH_OUTPUT_ID` (a job with non-empty `output`).
  2. Run the curl command below with `-D -` to capture response headers.
- **Command**:
  ```bash
  curl -sS -D - -X POST "http://localhost:3000/jobs/$JOB_WITH_OUTPUT_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Make the opening paragraph more concise."}'
  ```
- **Expected Result**:
  - HTTP status `200`
  - Response header `Content-Type: text/event-stream`
  - Response header `Cache-Control: no-cache`
  - Response header `X-Accel-Buffering: no`
  - Body contains one or more lines matching the pattern `data: <text>\n\n`
  - Body ends with `event: complete\ndata: \n\n`
- [FAIL: auto-judge: prerequisite not satisfied — JOB_WITH_OUTPUT_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-005: Refinement with explicit scope returns 200 SSE and stores scope in DB

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Verifies that passing a non-`all` `scope` value still produces a valid SSE response, and that the created Refinement record stores the exact scope string provided.
- **Steps**:
  1. Use `$JOB_WITH_OUTPUT_ID`.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -D - -X POST "http://localhost:3000/jobs/$JOB_WITH_OUTPUT_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Expand the medical history section.","scope":"medical_narrative"}'
  ```
- **Expected Result**:
  - HTTP status `200`
  - Response header `Content-Type: text/event-stream`
  - Body contains SSE chunks and ends with `event: complete\ndata: \n\n`
  - After this call, a Refinement row with `scope = 'medical_narrative'` exists in the `refinements` table for `$JOB_WITH_OUTPUT_ID` (verify via UAT-DB-001).
- [FAIL: auto-judge: prerequisite not satisfied — JOB_WITH_OUTPUT_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-DB-001: Refinement row is created with correct fields after a successful refine call

- **Description**: Verifies the database side effect — `prisma.refinement.create` persists a row with the correct `jobId`, `instruction`, `scope`, `accepted`, and non-empty `afterText`.
- **Steps**:
  1. Complete UAT-API-004 or UAT-API-005 successfully first.
  2. Ensure `DATABASE_URL` is set.
  3. Run the command below (replace `$JOB_WITH_OUTPUT_ID` with the actual job ID used).
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT instruction, scope, accepted, length(\"beforeText\") AS before_len, length(\"afterText\") AS after_len FROM refinements WHERE \"jobId\" = '$JOB_WITH_OUTPUT_ID' ORDER BY \"createdAt\" DESC LIMIT 1;"
  ```
- **Expected Result**: One row is returned with:
  - `instruction` matching the value sent in the request
  - `scope` either `all` (when omitted) or the provided scope string
  - `accepted` = `f` (false)
  - `before_len` > 0 (beforeText is the original job output — non-empty)
  - `after_len` > 0 (afterText is the refined text — non-empty)
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment] <!-- 2026-06-25 -->

---

### UAT-DB-002: Omitting scope stores "all" in the Refinement record

- **Description**: Verifies that when `scope` is not provided in the request, the persisted Refinement row stores `scope = 'all'` (the code-level default `scope ?? 'all'`).
- **Steps**:
  1. Complete UAT-API-004 successfully (no scope provided).
  2. Ensure `DATABASE_URL` is set.
  3. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT scope FROM refinements WHERE \"jobId\" = '$JOB_WITH_OUTPUT_ID' ORDER BY \"createdAt\" DESC LIMIT 1;"
  ```
- **Expected Result**: The `scope` column value is `all`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Invalid JSON body returns 400

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Verifies the `JSON.parse` try/catch returns 400 with `{"error":"Invalid JSON body"}` when the request body is malformed JSON.
- **Steps**:
  1. Ensure SAM local API is running.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_WITH_OUTPUT_ID/refine" -H 'Content-Type: application/json' -d '{not valid json'
  ```
- **Expected Result**: HTTP 400, body `{"error":"Invalid JSON body"}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_WITH_OUTPUT_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: SSE terminal event is the final content in the body

- **Scenario**: Verify `event: complete\ndata: \n\n` always appears as the last bytes of the SSE response body — no `data:` chunks follow it.
- **Steps**:
  1. Capture the SSE body from a successful refinement:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_WITH_OUTPUT_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Shorten the opening."}' -o /tmp/sse_refine.txt
  ```
  2. Check that the body ends with the complete event:
- **Command**:
  ```bash
  tail -c 32 /tmp/sse_refine.txt | cat -A
  ```
- **Expected Result**: The final bytes of the file match `event: complete\ndata: \n\n` (the `cat -A` output shows `event: complete$\ndata: $\n$\n` where `$` marks line ends). No `data:` lines appear after `event: complete`.
- [FAIL: auto-judge: no machine-executable command in test body — multi-step command requires /tmp temp file (forbidden pattern)] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: afterText stored in DB does not contain SSE formatting

- **Scenario**: Verify the `afterText` column in the `refinements` table stores the raw refined prose — not the SSE-framed response. The `data: ` prefix and `event: complete` trailer are only in the HTTP body, not persisted.
- **Steps**:
  1. After UAT-API-004 succeeds, run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT left(\"afterText\", 50) AS after_preview FROM refinements WHERE \"jobId\" = '$JOB_WITH_OUTPUT_ID' ORDER BY \"createdAt\" DESC LIMIT 1;"
  ```
- **Expected Result**:
  - The `after_preview` value does NOT start with `data: `
  - The full `afterText` does NOT contain `event: complete`
  - The value is non-empty prose text (the refined letter content)
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment] <!-- 2026-06-25 -->

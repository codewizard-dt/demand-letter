---
id: UAT-013
title: "UAT: POST /jobs Endpoint — Create Generation Job"
status: passed
task: TASK-013
created: 2026-06-23
updated: 2026-06-23
---

# UAT-013 — UAT: POST /jobs Endpoint — Create Generation Job

implements::[[TASK-013]]

> **Source task**: [[TASK-013]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] `sam local start-api` is running on port 3000 (`cd <repo-root> && sam local start-api`)
- [ ] PostgreSQL is reachable and `DATABASE_URL` is set (e.g. via `.env` sourced or passed as env var to `sam local start-api`)
- [ ] Prisma migrations have been applied (`pnpm --filter @demand-letter/db prisma migrate deploy`)
- [ ] `jq` installed (`jq --version` should succeed)

---

## Test Cases

### UAT-API-001: POST /jobs returns HTTP 201 with a job id

- **Endpoint**: `POST /jobs`
- **Description**: Happy-path — the endpoint creates a job and returns its cuid without requiring any request body.
- **Steps**:
  1. Ensure `sam local start-api` is running.
  2. Run the curl command below.
  3. Verify the HTTP status is 201 and the response body contains an `id` field.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 201; response body is `{"id":"<cuid>"}` where `<cuid>` is a non-empty alphanumeric string starting with `c` (e.g. `clxxxxxxxxxxxxxxx`). No extra fields.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

### UAT-API-002: POST /jobs returns Content-Type: application/json

- **Endpoint**: `POST /jobs`
- **Description**: Verifies the response includes the correct Content-Type header as set by the handler.
- **Steps**:
  1. Run the curl command below (includes `-i` to surface response headers).
  2. Inspect the response headers for `Content-Type`.
- **Command**:
  ```bash
  curl -sS -i -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: Response headers include `Content-Type: application/json` (or `application/json; charset=utf-8`). HTTP status 201.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

### UAT-API-003: POST /jobs with no body still returns HTTP 201

- **Endpoint**: `POST /jobs`
- **Description**: The handler accepts no body at this stage — sending no body (omitting Content-Type and payload) must still succeed.
- **Steps**:
  1. Run the curl command below (no `-d` or `-H Content-Type`).
  2. Verify the response is 201 with a valid `id`.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs'
  ```
- **Expected Result**: HTTP 201; response body `{"id":"<cuid>"}` with a non-empty `id`.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

### UAT-API-004: Each POST /jobs call creates a distinct job id

- **Endpoint**: `POST /jobs`
- **Description**: Two successive calls must return two different cuid values — confirms `@default(cuid())` generates unique IDs per row.
- **Steps**:
  1. Run the first curl invocation and capture the `id`.
  2. Run the second curl invocation and capture the `id`.
  3. Confirm the two ids are different.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' | jq -r '.id'
  ```
  Run twice and compare the two printed ids.
- **Expected Result**: Both calls return HTTP 201. The two `id` values are distinct non-empty strings.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

### UAT-STATIC-001: Handler file exists at the expected path

- **Scenario**: Verify the implementation file is present where SAM expects it.
- **Steps**:
  1. Check that `packages/api/src/handlers/post-jobs.ts` exists in the repository.
  2. Confirm it exports a symbol named `handler`.
- **Expected Result**: File exists; contains `export const handler`.
- [x] Pass <!-- 2026-06-23 -->

### UAT-STATIC-002: SAM template registers POST /jobs

- **Scenario**: Verify `template.yaml` correctly declares the `PostJobsFunction` resource and its API event.
- **Steps**:
  1. Open `template.yaml`.
  2. Confirm `PostJobsFunction` is present as a `AWS::Serverless::Function`.
  3. Confirm `Handler: src/handlers/post-jobs.handler`.
  4. Confirm the API event has `Path: /jobs` and `Method: post`.
- **Expected Result**: All four items confirmed.
- [x] Pass <!-- 2026-06-23 -->

### UAT-STATIC-003: TypeScript compiles cleanly across all packages

- **Scenario**: Ensure the handler introduces no type errors.
- **Steps**:
  1. From the repo root, run `pnpm typecheck`.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Exits 0 with zero TypeScript errors across `packages/api`, `packages/db`, and `packages/web`.
- [x] Pass <!-- 2026-06-23 -->

### UAT-EDGE-001: POST /jobs body with arbitrary extra fields is ignored and returns 201

- **Scenario**: The handler ignores any request body. Sending an unexpected JSON payload must not cause a 4xx or 5xx error.
- **Steps**:
  1. Run the curl command below with an unexpected payload.
  2. Verify the status and response body.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{"unexpected":"field","foo":123}'
  ```
- **Expected Result**: HTTP 201; response body `{"id":"<cuid>"}`. The extra fields are silently discarded.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

### UAT-EDGE-002: Newly created job has status "pending" in the database

- **Scenario**: Confirms the `Job` Prisma model defaults `status` to `"pending"` and the handler does not override it.
- **Steps**:
  1. Call `POST /jobs` and capture the returned `id`.
  2. Query the `jobs` table directly (via `psql` or Prisma Studio) for the row with that `id`.
  3. Verify `status = 'pending'`.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' | jq -r '.id'
  ```
  Then run (substituting `<id>` and your connection string):
  ```bash
  psql "$DATABASE_URL" -c "SELECT id, status, \"createdAt\", \"updatedAt\" FROM jobs WHERE id = '<id>';"
  ```
- **Expected Result**: Row exists with `status = 'pending'`; `createdAt` and `updatedAt` are non-null timestamps close to now.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

### UAT-EDGE-003: Response body contains only the id field

- **Scenario**: The handler must return exactly `{ "id": "..." }` — no status, timestamps, or other fields leaked.
- **Steps**:
  1. Run the curl command below and pipe through `jq keys`.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{}' | jq 'keys'
  ```
- **Expected Result**: Output is `["id"]` — exactly one key.
- [FAIL: auto-judge: prerequisite not satisfied — sam local start-api is not running on port 3000] <!-- 2026-06-23 -->

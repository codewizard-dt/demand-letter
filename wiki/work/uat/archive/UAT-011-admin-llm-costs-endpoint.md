---
id: UAT-011
title: "UAT: GET /admin/llm-costs Endpoint"
status: passed
task: TASK-011
created: 2026-06-23
updated: 2026-06-23
---

# UAT-011 — UAT: GET /admin/llm-costs Endpoint

implements::[[TASK-011]]

> **Source task**: [[TASK-011]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] SAM local API running: `sam local start-api` (default port 3000) from repo root
- [ ] `DATABASE_URL` is set in the environment and the database is reachable
- [ ] `packages/db` Prisma migrations have been applied (`pnpm --filter @demand-letter/db db:migrate`)
- [ ] `jq` is available in the shell for JSON assertions

---

## Test Cases

### UAT-API-001: Default lookback returns 200 with correct top-level shape

- **Endpoint**: `GET /admin/llm-costs`
- **Description**: Verifies the endpoint responds with HTTP 200 and a body containing exactly the keys `aggregates` (array) and `recentRows` (array) when the `?days` parameter is omitted, triggering the default 30-day window.
- **Steps**:
  1. Start SAM local API if not already running.
  2. Run the command below.
  3. Confirm status 200 and that both top-level keys are arrays.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs' | jq '{aggregates_is_array: (.aggregates | type == "array"), recentRows_is_array: (.recentRows | type == "array")}'
  ```
- **Expected Result**: HTTP 200 (inspect with `-v` if needed). Response body: `{ "aggregates_is_array": true, "recentRows_is_array": true }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-002: Empty database returns empty arrays

- **Endpoint**: `GET /admin/llm-costs?days=30`
- **Description**: Against a freshly migrated (empty) database the endpoint must return `{ aggregates: [], recentRows: [] }` — no errors, no 500.
- **Steps**:
  1. Ensure no `LlmAuditLog` rows exist in the database (truncate or use a clean test DB).
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=30' | jq '.'
  ```
- **Expected Result**: HTTP 200. Body: `{ "aggregates": [], "recentRows": [] }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-003: Aggregate shape is correct for seeded data

- **Endpoint**: `GET /admin/llm-costs?days=30`
- **Description**: When `LlmAuditLog` rows exist for at least two distinct features, each aggregate object must contain the keys `feature`, `_count` (with `id`), and `_sum` (with `inputTokens`, `outputTokens`, `estimatedCostUsd`). Aggregates must be ordered by `_sum.estimatedCostUsd` descending.
- **Steps**:
  1. Insert at least two `LlmAuditLog` rows with different `feature` values (e.g. `zone_classification` and `case_extraction`) with `createdAt` within the last 30 days using `prisma studio` or a seed script.
  2. Run the command below.
  3. Inspect the first element of `aggregates` to confirm all required keys are present.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=30' | jq '.aggregates[0] | {feature, count_id: ._count.id, sum_inputTokens: ._sum.inputTokens, sum_outputTokens: ._sum.outputTokens, sum_estimatedCostUsd: ._sum.estimatedCostUsd}'
  ```
- **Expected Result**: HTTP 200. The extracted object has all five keys non-null; `feature` is a valid `LlmFeature` enum string; `count_id` is a positive integer; `sum_estimatedCostUsd` is a numeric string (Prisma `Decimal` serialises as string) or number; the row with the highest aggregated cost appears first.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-004: Recent rows shape and field completeness

- **Endpoint**: `GET /admin/llm-costs?days=30`
- **Description**: Each element of `recentRows` must contain exactly the fields selected in the handler: `id`, `userId`, `feature`, `model`, `provider`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, `durationMs`, `createdAt`. Rows must be ordered by `createdAt` descending.
- **Steps**:
  1. Ensure at least two `LlmAuditLog` rows exist with `createdAt` within the last 30 days.
  2. Run the command below.
  3. Confirm all required keys appear in the first row; confirm `createdAt` of row 0 >= `createdAt` of row 1.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=30' | jq '.recentRows[0] | keys'
  ```
- **Expected Result**: HTTP 200. The key list includes exactly: `["createdAt","durationMs","estimatedCostUsd","feature","id","inputTokens","model","outputTokens","provider","userId"]` (alphabetical order from `jq keys`). No extra or missing fields.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-005: Custom `?days` parameter controls the lookback window

- **Endpoint**: `GET /admin/llm-costs?days=7`
- **Description**: When `?days=7` is passed only rows with `createdAt >= now - 7 days` must appear. A row older than 7 days must not appear in either `aggregates` or `recentRows`.
- **Steps**:
  1. Insert one `LlmAuditLog` row with `createdAt = now - 6 days` (within window) and one with `createdAt = now - 8 days` (outside window).
  2. Run the command below.
  3. Verify the within-window row appears and the older row does not.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=7' | jq '{aggregate_count: (.aggregates | length), row_count: (.recentRows | length)}'
  ```
- **Expected Result**: HTTP 200. `aggregate_count >= 1` and `row_count == 1` (only the within-window row). The 8-day-old row must not appear in `recentRows`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-006: `recentRows` is capped at 100 rows

- **Endpoint**: `GET /admin/llm-costs?days=365`
- **Description**: Even when more than 100 matching rows exist in the database, `recentRows` must contain at most 100 entries (the `take: 100` limit in the handler).
- **Steps**:
  1. Seed 101 or more `LlmAuditLog` rows all with `createdAt` within the last year.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=365' | jq '.recentRows | length'
  ```
- **Expected Result**: HTTP 200. Output is `100` (never more than 100, regardless of total row count).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-001: Invalid `?days` value (non-numeric string)

- **Endpoint**: `GET /admin/llm-costs?days=abc`
- **Description**: `parseInt('abc', 10)` evaluates to `NaN`. `Date.now() - NaN * ...` produces `NaN`, making `new Date(NaN)` an invalid date. The handler must not crash with an unhandled exception (no 502/500 from Lambda runtime error). The Prisma `gte: new Date(NaN)` either accepts it and returns no rows or the handler should return an error response — test that no 5xx is returned.
- **Steps**:
  1. Run the command below against the running SAM local API.
  2. Check the HTTP status code.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' 'http://localhost:3000/admin/llm-costs?days=abc'
  ```
- **Expected Result**: The status code must not be 502 or 500 (Lambda runtime crash). A 200 with empty arrays or a 400 with an error message are both acceptable; a 5xx indicates an unhandled NaN date bug in the handler that must be fixed.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-002: `?days=0` returns only today's rows

- **Endpoint**: `GET /admin/llm-costs?days=0`
- **Description**: `days=0` sets `cutoff = new Date(Date.now() - 0) = now`. Rows with `createdAt < now` (effectively all existing rows) fall outside the window. The endpoint must return `{ aggregates: [], recentRows: [] }` (or near-empty, depending on millisecond timing of rows inserted just now). Must not error.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=0' | jq '{aggregate_count: (.aggregates | length), row_count: (.recentRows | length)}'
  ```
- **Expected Result**: HTTP 200. `aggregate_count` is 0 and `row_count` is 0 (no rows have `createdAt` in the future relative to the cutoff).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-003: Correct `Content-Type` response header

- **Endpoint**: `GET /admin/llm-costs`
- **Description**: The handler explicitly sets `Content-Type: application/json`. Verify this header is present on every response.
- **Steps**:
  1. Run the command below and inspect the headers.
- **Command**:
  ```bash
  curl -sS -I 'http://localhost:3000/admin/llm-costs'
  ```
- **Expected Result**: Response headers include `content-type: application/json` (case-insensitive). No `text/html` or missing Content-Type.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-004: SAM function registered at correct path and method

- **Endpoint**: `GET /admin/llm-costs`
- **Description**: Verify the route is registered as `GET` — a `POST` to the same path must return 405 (Method Not Allowed) from API Gateway, not reach the Lambda.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' -X POST 'http://localhost:3000/admin/llm-costs'
  ```
- **Expected Result**: HTTP 403 or 405 (API Gateway rejects the wrong method). Must not be 200.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

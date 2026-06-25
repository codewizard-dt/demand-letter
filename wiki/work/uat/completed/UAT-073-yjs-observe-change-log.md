---
id: UAT-073
title: "UAT: Y.js observe hook on shared document: write CollaborativeChange records per transaction"
status: pending
task: TASK-073
created: 2026-06-25
updated: 2026-06-25
---

# UAT-073 — UAT: Y.js Observe Hook → Write Change Log Records

implements::[[TASK-073]]

> **Source task**: [[TASK-073]]
> **Generated**: 2026-06-25

Tests verify: `$connect` userId/userName validation, build artifacts for `websocket-sync` and `get-jobs-changes`, the `GET /jobs/{id}/changes` REST endpoint response shape and sort order, SAM template registration, frontend `EditorPage` WebSocket URL construction (userId/userName query params), and the `fetchJobChanges` client helper.

---

## Prerequisites

- [ ] Repository root; build run at least once (`pnpm build`)
- [ ] For API tests: SAM local API running on port 3000 (`sam local start-api --port 3000` with `DATABASE_URL` set), or a deployed stack with `$UAT_API_BASE` pointing at `https://<api-id>.execute-api.<region>.amazonaws.com/prod`
- [ ] For WebSocket tests: `wscat` installed (`npm install -g wscat`); `$UAT_WS_URL` set to the deployed WebSocket endpoint (`wss://...`)
- [ ] A job with a known ID exists in the database; set `$UAT_JOB_ID` to that value
- [ ] `DATABASE_URL` available in shell for any DB verification steps (source `packages/db/.env` locally if needed)
- [ ] No auth headers required for local SAM tests

---

## Test Cases

### UAT-STATIC-001: `get-jobs-changes.js` build artifact is emitted

- **Description**: Verifies the esbuild pipeline produces `.build/handlers/get-jobs-changes.js` and it exports a handler symbol.
- **Steps**:
  1. From the repository root, run the build command below.
  2. Confirm exit 0 and that the final output line appears.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api build && test -f .build/handlers/get-jobs-changes.js && echo "artifact: present"
  ```
- **Expected Result**: Build exits 0; final line is `artifact: present`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: `websocket-sync.js` build artifact is emitted

- **Description**: Verifies the updated `websocket-sync` handler (which now includes the Y.js observe logic and Prisma write) is compiled.
- **Steps**:
  1. From the repository root, run the command below (can be combined with UAT-STATIC-001 in a single `pnpm build`).
- **Command**:
  ```bash
  test -f .build/handlers/websocket-sync.js && echo "artifact: present"
  ```
- **Expected Result**: Output is `artifact: present` (exit 0).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: `template.yaml` registers `GET /jobs/{id}/changes`

- **Description**: Verifies `GetJobsChangesFunction` is declared with the correct path and method so API Gateway routes requests to the new handler.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep -A 5 'GetJobsChangesApi' template.yaml
  ```
- **Expected Result**: Output contains `Path: /jobs/{id}/changes` and `Method: get`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: `$connect` handler rejects missing `userId` or `userName`

- **Description**: Confirms the source code guards require all three params (`jobId`, `userId`, `userName`) on `$connect` and returns status 400 when any is absent. Verified by source inspection.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep -A 3 'userId.*userName' packages/api/src/handlers/websocket-sync.ts | head -10
  ```
- **Expected Result**: Output includes a guard condition checking for `!jobId || !userId || !userName` (or equivalent) and a `statusCode: 400` return.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: `EditorPage` constructs WebSocket URL with `userId` and `userName` query params

- **Description**: Verifies the frontend passes authenticated user identity to the WebSocket provider so the Lambda can associate connection records with real user identities.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'userId.*userName\|wsUrl' packages/web/src/pages/EditorPage.tsx
  ```
- **Expected Result**: Output contains a template literal that appends both `userId=` and `userName=` query params to `VITE_WS_API_URL`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-006: `fetchJobChanges` helper is exported from `packages/web/src/lib/api.ts`

- **Description**: Verifies the client helper that calls `GET /jobs/:id/changes` was added to the API layer.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'fetchJobChanges' packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output shows an `export async function fetchJobChanges` declaration and a `fetch(` call targeting `/jobs/${id}/changes`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-007: `ChangeRow` interface is exported from `packages/web/src/lib/api.ts`

- **Description**: Verifies the TypeScript interface that types change records was added alongside `fetchJobChanges`.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep -A 8 'export interface ChangeRow' packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output contains `id`, `userId`, `userName`, `operationType`, `contentDelta`, and `createdAt` fields inside the `ChangeRow` interface block.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-001: `GET /jobs/{id}/changes` returns 200 with `{ changes: [] }` for a job with no changes

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Verifies the happy-path response shape when a job has no recorded collaborative changes. The response must be 200 with a `changes` array (empty or containing objects matching the `ChangeRow` shape).
- **Steps**:
  1. Ensure `$UAT_API_BASE` and `$UAT_JOB_ID` are set.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "${UAT_API_BASE}/jobs/${UAT_JOB_ID}/changes"
  ```
- **Expected Result**: HTTP 200; body is a JSON object with a `changes` key whose value is an array (may be empty). Example: `{"changes":[]}`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE and UAT_JOB_ID unset] <!-- 2026-06-25 -->

---

### UAT-API-002: `GET /jobs/{id}/changes` returns records sorted by `createdAt` ascending

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Verifies that when multiple `CollaborativeChange` rows exist for a job, they are returned in ascending chronological order (oldest first), matching `orderBy: { createdAt: 'asc' }` in the handler.
- **Steps**:
  1. Ensure at least two `CollaborativeChange` rows exist for `$UAT_JOB_ID` (inserted via direct DB write or by triggering Y.js WebSocket messages).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "${UAT_API_BASE}/jobs/${UAT_JOB_ID}/changes" | jq '[.changes[] | .createdAt] | . == (sort)'
  ```
- **Expected Result**: Output is `true` (the `createdAt` values are already in sorted order).
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE and UAT_JOB_ID unset] <!-- 2026-06-25 -->

---

### UAT-API-003: `GET /jobs/{id}/changes` response objects have the correct shape

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Verifies each change record in the response includes all six fields: `id`, `userId`, `userName`, `operationType`, `contentDelta`, `createdAt`.
- **Steps**:
  1. Ensure at least one `CollaborativeChange` row exists for `$UAT_JOB_ID`.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "${UAT_API_BASE}/jobs/${UAT_JOB_ID}/changes" | jq '.changes[0] | has("id") and has("userId") and has("userName") and has("operationType") and has("contentDelta") and has("createdAt")'
  ```
- **Expected Result**: Output is `true`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE and UAT_JOB_ID unset] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: `GET /jobs/{id}/changes` with a non-existent job returns an empty array (not an error)

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Verifies that querying changes for a job that has no records (or does not exist) returns 200 with `{ changes: [] }` rather than a 404 or 500. The handler uses `findMany` which returns `[]` for no matches.
- **Steps**:
  1. Run the curl command below using a job ID that does not exist.
- **Command**:
  ```bash
  curl -sS "${UAT_API_BASE}/jobs/nonexistent-job-000/changes"
  ```
- **Expected Result**: HTTP 200; body is `{"changes":[]}`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE unset, SAM local DB connection unconfirmed] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: `$connect` without `userId` is rejected with 400

- **Description**: Verifies the updated `$connect` guard rejects connections that omit `userId` (even when `jobId` is provided). Tested against the deployed WebSocket endpoint.
- **Steps**:
  1. Ensure `$UAT_WS_URL` is set.
  2. Run the command below. The connection should be immediately closed by the server.
- **Command**:
  ```bash
  wscat --connect "${UAT_WS_URL}?jobId=uat-edge-002-job" --wait 3
  ```
- **Expected Result**: `wscat` exits immediately (connection rejected / closed with a non-2xx status). No persistent connection is established.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_WS_URL unset; requires a deployed stack] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: `$connect` without `userName` is rejected with 400

- **Description**: Verifies that providing `jobId` and `userId` but omitting `userName` also causes the `$connect` handler to return 400.
- **Steps**:
  1. Ensure `$UAT_WS_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  wscat --connect "${UAT_WS_URL}?jobId=uat-edge-003-job&userId=u1" --wait 3
  ```
- **Expected Result**: Connection is rejected / immediately closed. No DynamoDB record written for `uat-edge-003-job`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_WS_URL unset; requires a deployed stack] <!-- 2026-06-25 -->

---

### UAT-INTEGRATION-001: Full observe-and-record loop — Y.js message → `CollaborativeChange` row written

- **Description**: End-to-end verification that sending a binary Y.js update over the WebSocket causes the Lambda to decode it, classify the operation, and write a `CollaborativeChange` row to PostgreSQL. Requires a deployed stack with DB access.
- **Steps**:
  1. Ensure `$UAT_WS_URL`, `$UAT_JOB_ID`, and `$DATABASE_URL` are set.
  2. Record the current change count for the job:
     ```bash
     psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"CollaborativeChange\" WHERE \"jobId\" = '${UAT_JOB_ID}';"
     ```
  3. Connect to the WebSocket with valid userId/userName and send a base64-encoded Y.js insert update payload:
     ```bash
     wscat --connect "${UAT_WS_URL}?jobId=${UAT_JOB_ID}&userId=uat-user&userName=UAT+User" --wait 5
     ```
     (While connected, send a valid base64 Y.js update binary — this can be generated with a minimal Y.js script.)
  4. After disconnect, re-run the COUNT query from step 2.
- **Expected Result**: The count increases by 1. The new row has `jobId = $UAT_JOB_ID`, `userId = "uat-user"`, `userName = "UAT User"`, and `operationType` is one of `"insert"`, `"delete"`, or `"format"`.
- [FAIL: auto-judge: prerequisite not satisfied — requires deployed stack, live DB, and valid Y.js binary payload] <!-- 2026-06-25 -->

---

### UAT-UI-001: `EditorPage` WebSocket URL includes authenticated `userId` and `userName`

- **Description**: Verifies that when an authenticated user opens the editor page, the WebSocket connection URL contains the correct `userId` and `userName` query parameters sourced from the auth context.
- **Page**: `/jobs/<valid-job-id>/editor`
- **Steps**:
  1. Start the local dev server (`pnpm dev`) with `VITE_WS_API_URL` set.
  2. Log in as a user with a known email and display name.
  3. Navigate to `http://localhost:5173/jobs/<valid-job-id>/editor`.
  4. Open DevTools → Network → WS tab.
  5. Observe the WebSocket connection URL.
- **Expected Result**: The WebSocket URL contains `userId=<encoded-email>` and `userName=<encoded-name>` matching the authenticated user's email and display name.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

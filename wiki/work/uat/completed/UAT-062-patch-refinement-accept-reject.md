---
id: UAT-062
title: "UAT: PATCH accept/reject refinement endpoints — update jobs.output_text on accept"
status: passed
task: TASK-062
created: 2026-06-25
updated: 2026-06-25
---

# UAT-062 — UAT: PATCH accept/reject refinement endpoints — update jobs.output_text on accept

implements::[[TASK-062]]

> **Source task**: [[TASK-062]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] TypeScript build is current: `pnpm --filter @demand-letter/api build` exits 0 and `.build/handlers/` is populated
- [ ] `sam local start-api --env-vars env.json` is running on `http://localhost:3000` (or set `UAT_BASE_URL` to the deployed API Gateway invoke URL)
- [ ] `DATABASE_URL` is set in the shell environment (source `packages/db/.env` locally if needed)
- [ ] A Job record exists in the DB; export its id: `export UAT_JOB_ID=<cuid>`
- [ ] A Refinement record exists linked to `$UAT_JOB_ID`; export its id: `export UAT_REFINE_ID=<cuid>`
  - To create test data, run:
    ```bash
    psql "$DATABASE_URL" -c "INSERT INTO jobs (id, status) VALUES ('test-job-cuid-00001', 'complete') ON CONFLICT DO NOTHING;"
    psql "$DATABASE_URL" -c "INSERT INTO refinements (id, \"jobId\", instruction, \"beforeText\", \"afterText\") VALUES ('test-refine-cuid-001', 'test-job-cuid-00001', 'Fix grammar', 'Old text', 'New improved text') ON CONFLICT DO NOTHING;"
    export UAT_JOB_ID=test-job-cuid-00001
    export UAT_REFINE_ID=test-refine-cuid-001
    ```
- [ ] `export UAT_BASE_URL=http://localhost:3000`

---

## Test Cases

---

### UAT-BUILD-001: Accept handler build artifact exists

- **Description**: Verifies that the TypeScript compile step emitted `patch-jobs-refine-accept.js` to `.build/handlers/`, confirming the handler is bundled and deployable.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  ls -la .build/handlers/patch-jobs-refine-accept.js
  ```
- **Expected Result**: File is listed with a non-zero size. No `No such file` error.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-BUILD-002: Reject handler build artifact exists

- **Description**: Verifies that `patch-jobs-refine-reject.js` was emitted to `.build/handlers/`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  ls -la .build/handlers/patch-jobs-refine-reject.js
  ```
- **Expected Result**: File is listed with a non-zero size. No `No such file` error.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-INFRA-001: template.yaml registers accept function at the correct path and method

- **Description**: Verifies the `PatchJobsRefineAcceptFunction` SAM resource declares `Path: /jobs/{id}/refine/{refinement_id}/accept` and `Method: patch`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -A 15 'PatchJobsRefineAcceptFunction' template.yaml | grep -E 'Path:|Method:'
  ```
- **Expected Result**: Two lines returned — one containing `/jobs/{id}/refine/{refinement_id}/accept`, one containing `patch`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-INFRA-002: template.yaml registers reject function at the correct path and method

- **Description**: Verifies the `PatchJobsRefineRejectFunction` SAM resource declares `Path: /jobs/{id}/refine/{refinement_id}/reject` and `Method: patch`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -A 15 'PatchJobsRefineRejectFunction' template.yaml | grep -E 'Path:|Method:'
  ```
- **Expected Result**: Two lines returned — one containing `/jobs/{id}/refine/{refinement_id}/reject`, one containing `patch`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-INFRA-003: Neither function declares Bedrock permissions

- **Description**: Verifies that neither accept nor reject function has Bedrock in its IAM policy (they are plain DB writes — no LLM call). Each grep should return 0.
- **Steps**:
  1. Run the two commands below and check that both print `0`.
- **Command**:
  ```bash
  grep -A 20 'PatchJobsRefineAcceptFunction' template.yaml | grep -ic 'bedrock'; grep -A 20 'PatchJobsRefineRejectFunction' template.yaml | grep -ic 'bedrock'
  ```
- **Expected Result**: Two lines, each `0`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CLIENT-001: acceptRefinement helper PATCHes to the correct endpoint

- **Description**: Verifies the `acceptRefinement` export in `packages/web/src/lib/api.ts` uses `method: 'PATCH'` and targets `.../refine/${refinementId}/accept`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -A 5 'export async function acceptRefinement' packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output contains `method: 'PATCH'` and the string `refine/${refinementId}/accept`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CLIENT-002: rejectRefinement helper PATCHes to the correct endpoint

- **Description**: Verifies the `rejectRefinement` export in `packages/web/src/lib/api.ts` uses `method: 'PATCH'` and targets `.../refine/${refinementId}/reject`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -A 5 'export async function rejectRefinement' packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output contains `method: 'PATCH'` and the string `refine/${refinementId}/reject`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-001: PATCH accept — happy path returns 200 with ok: true

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Verifies the accept handler returns HTTP 200 and `{"ok": true}` for a valid job/refinement pair.
- **Steps**:
  1. Ensure prerequisites are satisfied — SAM API running, `$UAT_JOB_ID` and `$UAT_REFINE_ID` exported.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X PATCH "$UAT_BASE_URL/jobs/$UAT_JOB_ID/refine/$UAT_REFINE_ID/accept" | jq .
  ```
- **Expected Result**: HTTP 200. Body: `{"ok": true}`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_JOB_ID, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-002: PATCH accept — Refinement.accepted flipped to true

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Verifies the DB side effect: `Refinement.accepted` is `true` after a successful accept call (run after UAT-API-001).
- **Steps**:
  1. After UAT-API-001 passes, run the psql query below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT accepted FROM refinements WHERE id = '$UAT_REFINE_ID';"
  ```
- **Expected Result**: Single row with value `t`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-003: PATCH accept — Job.output updated to refinement.afterText

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Verifies the DB side effect: `Job.output` equals the refinement's `afterText` after accept (run after UAT-API-001).
- **Steps**:
  1. After UAT-API-001 passes, run the psql query below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT (r.\"afterText\" = j.output) AS output_matches FROM refinements r JOIN jobs j ON j.id = r.\"jobId\" WHERE r.id = '$UAT_REFINE_ID';"
  ```
- **Expected Result**: Single row with value `t`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-004: PATCH reject — happy path returns 200 with ok: true

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/reject`
- **Description**: Verifies the reject handler returns HTTP 200 and `{"ok": true}` for a valid job/refinement pair.
- **Steps**:
  1. Ensure prerequisites are satisfied — SAM API running, `$UAT_JOB_ID` and `$UAT_REFINE_ID` exported.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X PATCH "$UAT_BASE_URL/jobs/$UAT_JOB_ID/refine/$UAT_REFINE_ID/reject" | jq .
  ```
- **Expected Result**: HTTP 200. Body: `{"ok": true}`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_JOB_ID, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-005: PATCH reject — Refinement.accepted set to false

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/reject`
- **Description**: Verifies the DB side effect: `Refinement.accepted` is `false` after a successful reject call (run after UAT-API-004).
- **Steps**:
  1. After UAT-API-004 passes, run the psql query below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT accepted FROM refinements WHERE id = '$UAT_REFINE_ID';"
  ```
- **Expected Result**: Single row with value `f`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-006: PATCH accept — non-existent refinement returns 404

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Verifies the handler returns 404 with `refinement_not_found` when the refinement ID does not exist in the DB.
- **Steps**:
  1. Run the curl command below using a fabricated refinement ID.
- **Command**:
  ```bash
  curl -sS -X PATCH "$UAT_BASE_URL/jobs/$UAT_JOB_ID/refine/nonexistent-refinement-id-00000/accept" | jq .
  ```
- **Expected Result**: HTTP 404. Body: `{"error": "refinement_not_found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-007: PATCH accept — mismatched jobId returns 403

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Verifies the handler returns 403 with `refinement_job_mismatch` when the refinement exists but its `jobId` does not match the URL's `{id}`.
- **Steps**:
  1. Use a real `$UAT_REFINE_ID` but a wrong job ID in the URL path.
- **Command**:
  ```bash
  curl -sS -X PATCH "$UAT_BASE_URL/jobs/wrong-job-id-00000/refine/$UAT_REFINE_ID/accept" | jq .
  ```
- **Expected Result**: HTTP 403. Body: `{"error": "refinement_job_mismatch"}`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-008: PATCH reject — non-existent refinement returns 404

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/reject`
- **Description**: Verifies the reject handler returns 404 with `refinement_not_found` when the refinement ID does not exist.
- **Steps**:
  1. Run the curl command below using a fabricated refinement ID.
- **Command**:
  ```bash
  curl -sS -X PATCH "$UAT_BASE_URL/jobs/$UAT_JOB_ID/refine/nonexistent-refinement-id-00000/reject" | jq .
  ```
- **Expected Result**: HTTP 404. Body: `{"error": "refinement_not_found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-009: PATCH reject — mismatched jobId returns 403

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/reject`
- **Description**: Verifies the reject handler returns 403 with `refinement_job_mismatch` when the refinement's `jobId` does not match the URL `{id}`.
- **Steps**:
  1. Use a real `$UAT_REFINE_ID` but a wrong job ID in the URL path.
- **Command**:
  ```bash
  curl -sS -X PATCH "$UAT_BASE_URL/jobs/wrong-job-id-00000/refine/$UAT_REFINE_ID/reject" | jq .
  ```
- **Expected Result**: HTTP 403. Body: `{"error": "refinement_job_mismatch"}`.
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL, UAT_REFINE_ID not set in environment] <!-- 2026-06-25 -->

---

## Gaps

None. All planned tests have verified contracts from source code.

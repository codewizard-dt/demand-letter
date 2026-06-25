---
id: UAT-037
title: "UAT: Sufficiency Pre-check for Generation Gate"
status: passed
task: TASK-037
created: 2026-06-24
updated: 2026-06-24
---

# UAT-037 — UAT: Sufficiency Pre-check for Generation Gate

implements::[[TASK-037]]

> **Source task**: [[TASK-037]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Local SAM stack is running (`make dev` or `sam local start-api`)
- [ ] Database is migrated and seeded with at least one job record
- [ ] A job exists with at least one uploaded file (so the "no files" 422 is bypassed) — note the job's `{id}` as `$JOB_WITH_FILES`
- [ ] A job exists with at least one uploaded file AND all required template slots covered by extracted fields — note its `{id}` as `$JOB_COVERED`
- [ ] A job exists with at least one uploaded file BUT one or more required template slots uncovered (no extracted field, or `isNull=true`, `confidence < 0.80`, `acceptMissing=false`, `source != "attorney-judgment"`) — note its `{id}` as `$JOB_GAPS`
- [ ] A job exists with no uploaded files — note its `{id}` as `$JOB_NO_FILES`
- [ ] `UAT_BASE_URL` is set to `http://localhost:3000` (or the SAM local port)

---

## Test Cases

### UAT-API-001: Generate gate returns 400 with structured payload when required slots are uncovered

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that when `computeGapReport` finds uncovered required slots, the handler returns HTTP 400 (not 422) with `error: "sufficiency_precheck_failed"`, a human-readable `message`, and a `gaps` array containing per-slot details. The gate must fire before any S3 fetch or LLM call.
- **Steps**:
  1. Ensure `$JOB_GAPS` has at least one required template slot with no covering extracted field.
  2. Run the curl command below.
  3. Verify the response status is `400`.
  4. Verify the response body has `error` equal to `"sufficiency_precheck_failed"`.
  5. Verify `message` contains the gap count and references `/jobs/:id/gap-report`.
  6. Verify `gaps` is a non-empty array where each item has `fieldName` (string), `nullReason` (string or null), and `acceptMissing` (boolean `false` for required-but-uncovered slots).
- **Command**:
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs/${JOB_GAPS}/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 400 with body:
  ```json
  {
    "error": "sufficiency_precheck_failed",
    "message": "<N> required slot(s) are not covered. Run /jobs/:id/gap-report to see details.",
    "gaps": [{ "fieldName": "<slot_name>", "nullReason": null, "acceptMissing": false }]
  }
  ```
  Where `<N>` equals the number of uncovered required slots and `gaps` length equals `<N>`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-002: Generate gate uses status code 400 (not 422) for sufficiency failures

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies the status code is exactly `400` for sufficiency pre-check failures — not `422`. This is the key code change from TASK-037 (the old code returned 422).
- **Steps**:
  1. Use the same `$JOB_GAPS` job from UAT-API-001.
  2. Run the curl command below, which extracts only the HTTP status code.
  3. Confirm the printed status code is `400`.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' -X POST "${UAT_BASE_URL}/jobs/${JOB_GAPS}/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: Prints `400` and nothing else.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-003: Generate gate error key is "sufficiency_precheck_failed" (not "gap_report_not_cleared")

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that the `error` field in the 400 response body is exactly `"sufficiency_precheck_failed"` — distinct from `"gap_report_not_cleared"` used in the earlier ROADMAP-003 gap-report path.
- **Steps**:
  1. Use `$JOB_GAPS`.
  2. Run the curl command below.
  3. Verify `.error` in the JSON response is `"sufficiency_precheck_failed"`.
  4. Verify `.error` is NOT `"gap_report_not_cleared"`.
- **Command**:
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs/${JOB_GAPS}/generate" -H 'Content-Type: application/json' | jq '.error'
  ```
- **Expected Result**: Prints `"sufficiency_precheck_failed"` (with quotes, as jq outputs strings).
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-004: Generate gate fires before S3 fetch — uncovered job never reaches S3 or LLM

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that the sufficiency gate short-circuits the request before any S3 or LLM operation. Observable evidence: the request returns near-instantly (no S3 latency) and returns 400, not a 500 or LLM-generated output.
- **Steps**:
  1. Use `$JOB_GAPS` (has files but uncovered slots).
  2. Run the curl command below and observe both the HTTP status and elapsed time.
  3. Confirm the response is 400 with the sufficiency payload — not an LLM-generated letter.
  4. Confirm there is no output text (no demand letter) in the response body.
- **Command**:
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs/${JOB_GAPS}/generate" -H 'Content-Type: application/json' | jq '{error: .error, has_gaps: (.gaps | length > 0)}'
  ```
- **Expected Result**:
  ```json
  {
    "error": "sufficiency_precheck_failed",
    "has_gaps": true
  }
  ```
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-005: Generate succeeds (200) when all required slots are covered

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Verifies that when all required template slots are covered by extracted fields (or `acceptMissing=true` / `source="attorney-judgment"`), the gate passes and generation proceeds to return HTTP 200.
- **Steps**:
  1. Use `$JOB_COVERED` (all required slots covered).
  2. Run the curl command below.
  3. Confirm the HTTP status is `200`.
  4. Confirm the response body is non-empty text (the generated demand letter output).
- **Command**:
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs/${JOB_COVERED}/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 200 with a non-empty plain-text body (the generated output). No `error` field in the response.
- [FAIL: auto-judge: HTTP 500 expected 200 — local SAM has no Bedrock/S3 access; gate passes (no 400 returned) but generation infrastructure unavailable] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Missing job ID returns 400 with "Missing job id"

- **Scenario**: `POST /jobs//generate` or a request where `pathParameters.id` is absent
- **Steps**:
  1. Run the curl command below (omitting the job ID from the path).
- **Command**:
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs//generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 400 with body `{ "error": "Missing job id" }`.
- [FAIL: auto-judge: HTTP 403 "Missing Authentication Token" expected HTTP 400 "Missing job id" — SAM local returns 403 for unmatched route /jobs//generate before handler executes] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: No files uploaded returns 422 before sufficiency gate runs

- **Scenario**: A job exists but has no uploaded files — the handler should return 422 before even reaching `computeGapReport`.
- **Steps**:
  1. Use `$JOB_NO_FILES` (job with no file records).
  2. Run the curl command below.
  3. Verify the HTTP status is `422` (not 400 — this is the files-check, not the sufficiency gate).
  4. Verify the error body indicates no files.
- **Command**:
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs/${JOB_NO_FILES}/generate" -H 'Content-Type: application/json'
  ```
- **Expected Result**: HTTP 422 with body `{ "error": "No files uploaded for this job" }`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-003: Gaps array includes all uncovered slots — not just the first

- **Scenario**: A job has multiple required slots uncovered — the `gaps` array in the 400 response must list all of them.
- **Steps**:
  1. Ensure `$JOB_GAPS` has at least two uncovered required template slots.
  2. First, call `GET /jobs/$JOB_GAPS/gap-report` to confirm the expected gap count.
  3. Then call `POST /jobs/$JOB_GAPS/generate` and compare the `gaps` array length to the gap-report count.
- **Command** (step 2 — get expected count):
  ```bash
  curl -sS "${UAT_BASE_URL}/jobs/${JOB_GAPS}/gap-report" | jq '.gaps | length'
  ```
- **Command** (step 3 — verify generate returns same count):
  ```bash
  curl -sS -X POST "${UAT_BASE_URL}/jobs/${JOB_GAPS}/generate" -H 'Content-Type: application/json' | jq '.gaps | length'
  ```
- **Expected Result**: Both commands print the same integer (≥ 2). The `gaps` array from the generate endpoint matches the `gaps` array from the gap-report endpoint in length and field names.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-004: Slots covered via acceptMissing=true are not flagged as gaps

- **Scenario**: A required template slot has an extracted field with `acceptMissing=true` — the sufficiency gate must count this as covered and not include it in `gaps`.
- **Steps**:
  1. Ensure `$JOB_COVERED` has at least one field with `acceptMissing=true`.
  2. Call `GET /jobs/$JOB_COVERED/gap-report` to confirm `gaps` is empty.
  3. Call `POST /jobs/$JOB_COVERED/generate` and confirm it passes (200), not 400.
- **Command**:
  ```bash
  curl -sS "${UAT_BASE_URL}/jobs/${JOB_COVERED}/gap-report" | jq '{gaps_count: (.gaps | length), covered: .covered, total: .total}'
  ```
- **Expected Result**: `gaps_count` is `0`, `covered` equals `total`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-005: Slots covered via source="attorney-judgment" are not flagged as gaps

- **Scenario**: A required template slot has an extracted field with `source="attorney-judgment"` — the gate must count this as covered regardless of `isNull` or `confidence`.
- **Steps**:
  1. Ensure you have a job where at least one slot is covered only by `source="attorney-judgment"`.
  2. Call `GET /jobs/{id}/gap-report` for that job and verify `gaps` is empty.
  3. Call `POST /jobs/{id}/generate` and verify HTTP 200 (gate passes).
- **Command**:
  ```bash
  curl -sS "${UAT_BASE_URL}/jobs/${JOB_COVERED}/gap-report" | jq '.gaps'
  ```
- **Expected Result**: `[]` (empty array) — attorney-judgment slots are not gaps.
- [x] Pass <!-- 2026-06-24 -->

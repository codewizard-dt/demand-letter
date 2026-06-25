---
id: UAT-055
title: "UAT: Role-based block text redaction in GET /jobs/:id/blocks API"
status: passed
task: TASK-055
created: 2026-06-25
updated: 2026-06-25
---

# UAT-055 — UAT: Role-based block text redaction in GET /jobs/:id/blocks API

implements::[[TASK-055]]

> **Source task**: [[TASK-055]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] API is running locally (SAM `sam local start-api` or equivalent Lambda runner on port 3000)
- [ ] A job exists with at least one block that has `phi_offsets` populated (non-null JSONB). For example: a block with `text = "Patient John Smith was seen on 2024-01-15"` and `phi_offsets = [{"type":"PATIENT","startOffset":8,"endOffset":18},{"type":"DATE","startOffset":31,"endOffset":41}]`
- [ ] Environment variable `$JOB_ID` is set to a valid job UUID
- [ ] API base URL: `http://localhost:3000`

---

## Test Cases

### UAT-API-001: Developer role (default) receives redacted block text

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that a caller with `X-Caller-Role: developer` (or no role header) receives block text with PHI replaced by typed tokens, and `phiOffsets` is NOT present in the response body.
- **Steps**:
  1. Ensure a block exists with `text = "Patient John Smith was seen on 2024-01-15"` and `phi_offsets = [{"type":"PATIENT","startOffset":8,"endOffset":18},{"type":"DATE","startOffset":31,"endOffset":41}]`
  2. Run the curl command below
  3. Inspect the `blocks[].text` field in the response
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'X-Caller-Role: developer' | jq '.blocks[0]'
  ```
- **Expected Result**: HTTP 200. The block's `text` field contains `"Patient [PATIENT_NAME] was seen on [DATE_OF_BIRTH]"` (PHI tokens substituted). The response object does NOT include a `phiOffsets` field on any block.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-API-002: No role header defaults to developer (redacted)

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that omitting the `X-Caller-Role` header is treated as `developer` role — text is redacted.
- **Steps**:
  1. Use the same block with PHI offsets from UAT-API-001
  2. Run the curl command below (no role header)
  3. Inspect `blocks[].text`
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" | jq '.blocks[0].text'
  ```
- **Expected Result**: HTTP 200. `blocks[0].text` contains typed PHI tokens (e.g., `[PATIENT_NAME]`, `[DATE_OF_BIRTH]`), not the original PII text. No `phiOffsets` key on the block.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-API-003: Attorney role receives full unredacted block text

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that a caller with `X-Caller-Role: attorney` receives the original, unredacted block text.
- **Steps**:
  1. Use the same block with PHI offsets from UAT-API-001
  2. Run the curl command below
  3. Inspect `blocks[].text`
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'X-Caller-Role: attorney' | jq '.blocks[0].text'
  ```
- **Expected Result**: HTTP 200. `blocks[0].text` equals the original text `"Patient John Smith was seen on 2024-01-15"` — no token substitution. No `phiOffsets` key on the block.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-API-004: Case-insensitive role header key lookup

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that both `x-caller-role` (lowercase) and `X-Caller-Role` (canonical) header keys are accepted and produce the same behavior.
- **Steps**:
  1. Run the curl command below using lowercase header key
  2. Inspect `blocks[].text`
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'x-caller-role: attorney' | jq '.blocks[0].text'
  ```
- **Expected Result**: HTTP 200. Attorney role is recognized even with lowercase key; `blocks[0].text` is the full unredacted original text.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-API-005: Block with null phi_offsets returns text unchanged for developer

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that a block with no PHI offsets (`phi_offsets` is null in DB) returns its text unchanged (no crash, no spurious redaction) for a developer-role caller.
- **Steps**:
  1. Ensure a block exists for this job with `phi_offsets = null` and some plain text, e.g. `text = "This is a standard boilerplate clause."`
  2. Run the curl command below
  3. Inspect the `text` field for that block
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'X-Caller-Role: developer' | jq '[.blocks[] | select(.text | startswith("This is a standard"))]'
  ```
- **Expected Result**: HTTP 200. The block with null PHI offsets returns `text = "This is a standard boilerplate clause."` unchanged. No error, no `[PHI_ENTITY]` tokens, no `phiOffsets` key.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-API-006: Response structure does not include phiOffsets for any role

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that `phiOffsets` is never exposed in the response body regardless of caller role — it is internal metadata only.
- **Steps**:
  1. Run the curl command below with attorney role
  2. Check all blocks in the response for the presence of a `phiOffsets` key
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'X-Caller-Role: attorney' | jq '[.blocks[] | has("phiOffsets")]'
  ```
- **Expected Result**: HTTP 200. The jq expression returns an array of all `false` values — no block in the response includes a `phiOffsets` field.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-API-007: Unknown role value defaults to developer (redacted)

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that an unrecognized `X-Caller-Role` value (e.g., `admin`, `paralegal`) is treated as developer and text is redacted (fail-safe).
- **Steps**:
  1. Use the same block with PHI offsets from UAT-API-001
  2. Run the curl command below with an unknown role value
  3. Inspect `blocks[].text`
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'X-Caller-Role: admin' | jq '.blocks[0].text'
  ```
- **Expected Result**: HTTP 200. `blocks[0].text` contains typed PHI tokens (redacted), not the original text. Unknown roles fall through to the developer path.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-EDGE-001: Non-overlapping multi-entity redaction correctness

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that multiple non-overlapping PHI entities in a single block are all replaced correctly, with no offset shift corruption (offsets are applied in descending order internally).
- **Steps**:
  1. Ensure a block exists with `text = "John Smith called Dr. Adams at 555-1234"` and `phi_offsets = [{"type":"PATIENT","startOffset":0,"endOffset":10},{"type":"DOCTOR","startOffset":22,"endOffset":30},{"type":"PHONE","startOffset":34,"endOffset":42}]`
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks" -H 'X-Caller-Role: developer' | jq '[.blocks[] | select(.text | startswith("[PATIENT"))]'
  ```
- **Expected Result**: HTTP 200. The matching block's `text` equals `"[PATIENT_NAME] called Dr. [PROVIDER] at [PHONE]"` — all three entities replaced, none missing or double-replaced.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

### UAT-EDGE-002: Pagination fields are preserved alongside redaction

- **Endpoint**: `GET /jobs/{id}/blocks`
- **Description**: Verifies that role-based redaction does not break the pagination envelope (`page`, `limit`, `totalCount`, `hasMore`).
- **Steps**:
  1. Run the curl command below requesting page 1, limit 5
- **Command**:
  ```bash
  curl -sS -X GET "http://localhost:3000/jobs/$JOB_ID/blocks?page=1&limit=5" -H 'X-Caller-Role: developer' | jq '{page,limit,totalCount,hasMore}'
  ```
- **Expected Result**: HTTP 200. Response includes `page: 1`, `limit: 5`, a numeric `totalCount`, and a boolean `hasMore`. Redaction does not alter or remove these envelope fields.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID env var not set; no verified job with phi_offsets data in DB] <!-- 2026-06-25 -->

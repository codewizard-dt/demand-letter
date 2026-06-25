---
id: UAT-076
title: "UAT: Editor state → DOCX export using docx npm package; convert ProseMirror JSON to .docx"
status: pending
task: TASK-076
created: 2026-06-25
updated: 2026-06-25
---

# UAT-076 — UAT: Editor State → DOCX Export

implements::[[TASK-076]]

> **Source task**: [[TASK-076]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] API server running locally: `sam local start-api` (default port 3000)
- [ ] A job exists in the database. Export its ID: `export UAT_JOB_ID=<job-id>`
- [ ] `jq` installed for pretty-printing curl responses

---

## Test Cases

### UAT-API-001: POST /jobs/{id}/export/docx returns 200 with DOCX binary for a valid doc

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies the happy path: a minimal ProseMirror doc is posted for an existing job and the server returns HTTP 200 with the DOCX content-type header and a non-empty binary body.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set to an existing job ID.
  2. Run the curl command below.
  3. Confirm status 200 and that the content-type starts with `application/vnd.openxmlformats`.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello World"}]}]}}' -o /dev/null -w '%{http_code}:%{content_type}'
  ```
- **Expected Result**: Output `200:application/vnd.openxmlformats-officedocument.wordprocessingml.document` (status code 200, correct DOCX mime type).
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-002: POST /jobs/{id}/export/docx saves DOCX file with valid ZIP magic bytes

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies the response body is a valid DOCX (ZIP-based) file by checking that the first bytes of the saved file are `PK` (the ZIP magic bytes that all DOCX files start with).
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to save the response to `/tmp/uat-076.docx`.
  3. Run `xxd /tmp/uat-076.docx | head -1` and confirm the output starts with `504b 0304` (PK\x03\x04).
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello World"}]}]}}' -o /tmp/uat-076.docx -w '%{http_code}'
  ```
- **Expected Result**: Status 200, and `/tmp/uat-076.docx` exists with size > 0. Running `xxd /tmp/uat-076.docx | head -1` should show `504b 0304` as the first bytes (ZIP/DOCX magic).
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-003: POST /jobs/{id}/export/docx returns 400 when doc is absent from body

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that omitting the `doc` field from the request body returns HTTP 400 with `error: "missing_doc_in_request"`.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below (body has no `doc` key).
  3. Confirm status 400 and the `error` field value.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{}' | jq .
  ```
- **Expected Result**: HTTP 400 with body `{ "error": "missing_doc_in_request" }`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-004: POST /jobs/{id}/export/docx returns 400 for malformed JSON body

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that a request with a non-JSON body returns HTTP 400 with `error: "invalid_request_body"`.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below with a syntactically invalid JSON payload.
  3. Confirm status 400 and the `error` field value.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d 'not-json' | jq .
  ```
- **Expected Result**: HTTP 400 with body `{ "error": "invalid_request_body" }`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-005: POST /jobs/{id}/export/docx returns 404 for non-existent job

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that posting a valid doc body for a job that does not exist in the database returns HTTP 404 with `error: "job_not_found"`.
- **Steps**:
  1. Run the curl command below with a fabricated job ID.
  2. Confirm status 404 and the `error` field value.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/nonexistent-job-id-00000000/export/docx' -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[]}}' | jq .
  ```
- **Expected Result**: HTTP 404 with body `{ "error": "job_not_found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Converter handles bold and italic marks without error

- **Scenario**: A ProseMirror doc containing text nodes with `bold` and `italic` marks is submitted. The converter must apply those marks to the `TextRun` and return a valid DOCX.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below — the payload includes a bold-marked text node and an italic-marked text node.
  3. Confirm status 200 (no server error).
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Bold text","marks":[{"type":"bold"}]},{"type":"text","text":" and "},{"type":"text","text":"italic text","marks":[{"type":"italic"}]}]}]}}' -o /dev/null -w '%{http_code}'
  ```
- **Expected Result**: HTTP 200. The converter does not throw for bold or italic marks.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Converter strips trackInsert and trackDelete marks (clean export)

- **Scenario**: A ProseMirror doc containing text nodes with `trackInsert` and `trackDelete` marks is submitted. The converter must strip these marks and return a valid DOCX with the accepted clean state — no server error.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below — the payload includes both `trackInsert`- and `trackDelete`-marked text nodes.
  3. Confirm status 200 (track marks do not crash the converter).
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"inserted text","marks":[{"type":"trackInsert","attrs":{"author":"ai"}}]},{"type":"text","text":"deleted text","marks":[{"type":"trackDelete","attrs":{"author":"ai"}}]}]}]}}' -o /dev/null -w '%{http_code}'
  ```
- **Expected Result**: HTTP 200. The `trackInsert` and `trackDelete` marks are silently stripped; the DOCX is returned without error.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Converter handles boilerplateZone mark (shaded text run)

- **Scenario**: A ProseMirror doc containing a text node with a `boilerplateZone` mark is submitted. The converter must apply grey shading (`D9D9D9`) to the TextRun and return a valid DOCX.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below — the payload includes a boilerplateZone-marked text node.
  3. Confirm status 200.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Standard clause text","marks":[{"type":"boilerplateZone"}]}]}]}}' -o /dev/null -w '%{http_code}'
  ```
- **Expected Result**: HTTP 200. The boilerplateZone mark does not crash the converter; the DOCX is returned successfully.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-004: Converter handles table nodes without error

- **Scenario**: A ProseMirror doc with a `table` node (containing `tableRow` → `tableCell` structure) is submitted. The converter must produce a valid `Table` DOCX element and return HTTP 200.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below — the payload contains a two-column, one-row table.
  3. Confirm status 200.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell A"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell B"}]}]}]}]}]}}' -o /dev/null -w '%{http_code}'
  ```
- **Expected Result**: HTTP 200. The table node is converted without error and a valid DOCX binary is returned.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

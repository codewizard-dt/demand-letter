---
id: UAT-083
title: "UAT: Verify exported DOCX opens in Microsoft Word with correct formatting and no corruption"
status: failed
task: TASK-083
created: 2026-06-25
updated: 2026-06-25
---

# UAT-083 — UAT: Exported DOCX Opens in Word Without Corruption

implements::[[TASK-083]]

> **Source task**: [[TASK-083]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local API is running (`sam local start-api`) on port 3000
- [ ] A completed job with generated output exists; export its ID: `export UAT_JOB_ID=<uuid>`
- [ ] `unzip` is available (macOS built-in)
- [ ] `xmllint` is available (`brew install libxml2` if absent)
- [ ] Microsoft Word 2019+ or Microsoft 365 is installed (for UAT-MANUAL-001)

---

## Test Cases

### UAT-API-001: Download DOCX from completed job returns 200 with binary file
- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the endpoint returns HTTP 200, streams a binary DOCX, and saves it to `/tmp/demand-letter.docx` for downstream static tests.
- **Steps**:
  1. Set `UAT_JOB_ID` to a job that has a generated `output` value (use the Pat Donahue job or any generation-completed job).
  2. Run the curl command below.
  3. Confirm exit code is 0.
  4. Confirm `/tmp/demand-letter.docx` exists and has non-zero size: `ls -lh /tmp/demand-letter.docx`
- **Command**:
  ```bash
  curl -sS -f -o /tmp/demand-letter.docx "http://localhost:3000/jobs/$UAT_JOB_ID/export/docx"
  ```
- **Expected Result**: Exit 0; `/tmp/demand-letter.docx` created with non-zero byte count.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-25 -->

### UAT-STATIC-001: DOCX is a valid ZIP archive
- **Endpoint**: (file validation — no HTTP call; requires UAT-API-001)
- **Description**: Verifies the downloaded DOCX is a structurally intact ZIP archive (OOXML containers are ZIP files; any truncation or corruption surfaces here).
- **Steps**:
  1. Confirm `/tmp/demand-letter.docx` exists (from UAT-API-001).
  2. Run the command below.
  3. Confirm exit code is 0.
  4. Confirm output ends with "No errors detected".
- **Command**:
  ```bash
  unzip -t /tmp/demand-letter.docx
  ```
- **Expected Result**: Exit 0; output contains "No errors detected in /tmp/demand-letter.docx".
- [FAIL: auto-judge: prerequisite not satisfied — /tmp/demand-letter.docx does not exist (UAT-API-001 must run first)] <!-- 2026-06-25 -->

### UAT-STATIC-002: All four mandatory OOXML parts are present in the archive
- **Endpoint**: (file validation — no HTTP call; requires UAT-API-001)
- **Description**: Verifies the four parts required by the OOXML spec are present: `word/document.xml`, `word/styles.xml`, `[Content_Types].xml`, `_rels/.rels`.
- **Steps**:
  1. Confirm `/tmp/demand-letter.docx` exists (from UAT-API-001).
  2. Run the command below.
  3. Confirm the output contains exactly four lines (one per required part).
- **Command**:
  ```bash
  unzip -l /tmp/demand-letter.docx | grep -E "word/document\.xml|word/styles\.xml|\[Content_Types\]\.xml|_rels/\.rels"
  ```
- **Expected Result**: Output has four lines matching (respectively): `word/document.xml`, `word/styles.xml`, `[Content_Types].xml`, `_rels/.rels`.
- [FAIL: auto-judge: prerequisite not satisfied — /tmp/demand-letter.docx does not exist (UAT-API-001 must run first)] <!-- 2026-06-25 -->

### UAT-STATIC-003: word/document.xml is well-formed XML
- **Endpoint**: (file validation — no HTTP call; requires UAT-API-001)
- **Description**: Verifies the core document part is valid well-formed XML. A corrupt or truncated OOXML stream would fail xmllint.
- **Steps**:
  1. Confirm `/tmp/demand-letter.docx` exists (from UAT-API-001).
  2. Run the command below.
  3. Confirm exit code is 0 (xmllint exits non-zero and prints an error on malformed input).
- **Command**:
  ```bash
  unzip -p /tmp/demand-letter.docx word/document.xml | xmllint --noout -
  ```
- **Expected Result**: Exit 0; no error output from xmllint.
- [FAIL: auto-judge: prerequisite not satisfied — /tmp/demand-letter.docx does not exist (UAT-API-001 must run first)] <!-- 2026-06-25 -->

### UAT-EDGE-001: Non-existent job ID returns 404
- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the handler returns a structured 404 when the job does not exist in the database.
- **Steps**:
  1. Run the curl command below with a literal non-existent ID.
  2. Confirm the JSON body contains `"error":"job_not_found"`.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/does-not-exist-000/export/docx'
  ```
- **Expected Result**: HTTP 404; body `{"error":"job_not_found","message":"The requested job does not exist."}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-25 -->

### UAT-EDGE-002: Create a job with no output (setup for UAT-EDGE-003)
- **Endpoint**: `POST /jobs`
- **Description**: Creates a fresh job (no generated output) and captures the ID for UAT-EDGE-003. The response includes the new job ID; export it as `UAT_NO_OUTPUT_JOB_ID`.
- **Steps**:
  1. Run the curl command below.
  2. Copy the `id` value from the response.
  3. Export it: `export UAT_NO_OUTPUT_JOB_ID=<id>`.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs'
  ```
- **Expected Result**: HTTP 201; body `{"id":"<uuid>"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-25 -->

### UAT-EDGE-003: Job without generated output returns 422
- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the handler returns 422 with `output_not_ready` when the job record has no `output` value (i.e. generation has not completed).
- **Steps**:
  1. Confirm `UAT_NO_OUTPUT_JOB_ID` is set (from UAT-EDGE-002).
  2. Run the curl command below.
  3. Confirm the JSON body contains `"error":"output_not_ready"`.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_NO_OUTPUT_JOB_ID/export/docx"
  ```
- **Expected Result**: HTTP 422; body `{"error":"output_not_ready","message":"No generated output found for this job."}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000; UAT_NO_OUTPUT_JOB_ID not set] <!-- 2026-06-25 -->

### UAT-MANUAL-001: DOCX opens in Microsoft Word without repair dialog or layout corruption
- **Page**: local file `/tmp/demand-letter.docx`
- **Description**: Manual visual acceptance test — confirms the Word export feature produces a document that opens cleanly and renders without any corruption, garbling, or structural breakage.
- **Steps**:
  1. Confirm `/tmp/demand-letter.docx` exists (from UAT-API-001).
  2. Open `/tmp/demand-letter.docx` in Microsoft Word 2019+ or Microsoft 365.
  3. Confirm no "repair" or "corrupted file" dialog appears on open.
  4. Confirm the document renders with readable text throughout (no garbled characters or question-mark boxes).
  5. Confirm paragraph spacing and indentation are consistent (no collapsed or overlapping paragraphs).
  6. Confirm any specials/table section renders with intact rows and aligned columns.
  7. Confirm bold and italic text is rendered with correct weight and style.
  8. Confirm any boilerplate section (e.g. §7) appears visually distinct from variable zones (shaded or otherwise separated).
- **Expected Result**: No repair prompt; document opens cleanly with correct text rendering, intact table structure, and correct inline formatting throughout.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

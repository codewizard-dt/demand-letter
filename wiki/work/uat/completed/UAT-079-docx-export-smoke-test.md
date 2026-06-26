---
id: UAT-079
title: "UAT: Smoke test: export Pat Donahue letter to Word, verify structure matches original template"
status: pending
task: TASK-079
created: 2026-06-25
updated: 2026-06-25
---

# UAT-079 — UAT: DOCX Export Smoke Test: Pat Donahue Letter

implements::[[TASK-079]]

> **Source task**: [[TASK-079]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local API running on `http://localhost:3000` (`sam local start-api`)
- [ ] `$PAT_DONAHUE_JOB_ID` env var set to a job ID that has a completed `output` field (run generate first)
- [ ] `jq` available in PATH
- [ ] `unzip` available in PATH
- [ ] Web dev server running (`pnpm --filter @demand-letter/web dev`) for UI tests

---

## Test Cases

### UAT-API-001: GET export/docx returns 200 with DOCX binary for completed job

- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the GET export endpoint returns a 200 response with the correct Content-Type when the job has a generated output.
- **Steps**:
  1. Ensure `$PAT_DONAHUE_JOB_ID` is set to a job that has been generated (job.output is not null).
  2. Run the curl command below; the response binary will be saved to `/tmp/demand-letter-export.docx`.
- **Command**:
  ```bash
  curl -sS -o /tmp/demand-letter-export.docx -w '%{http_code}' "http://localhost:3000/jobs/${PAT_DONAHUE_JOB_ID}/export/docx"
  ```
- **Expected Result**: HTTP status `200`; `/tmp/demand-letter-export.docx` is written and is non-empty.
- [FAIL: auto-judge: prerequisite not satisfied — $PAT_DONAHUE_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-002: Downloaded DOCX is a valid OOXML (ZIP) archive

- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies that the exported binary is a valid OOXML ZIP archive containing `word/document.xml`.
- **Steps**:
  1. Complete UAT-API-001 first to produce `/tmp/demand-letter-export.docx`.
  2. Run the command below to list archive contents.
- **Command**:
  ```bash
  unzip -l /tmp/demand-letter-export.docx | grep 'word/document.xml'
  ```
- **Expected Result**: Output contains `word/document.xml` — confirming the file is a valid OOXML archive.
- [FAIL: auto-judge: prerequisite not satisfied — depends on UAT-API-001 which requires $PAT_DONAHUE_JOB_ID not set] <!-- 2026-06-25 -->

---

### UAT-API-003: document.xml contains patient name "Donahue"

- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the exported DOCX contains the patient name, confirming case data was injected.
- **Steps**:
  1. Complete UAT-API-001 first.
  2. Run the command below to extract and search the document XML.
- **Command**:
  ```bash
  unzip -p /tmp/demand-letter-export.docx word/document.xml | grep -i 'Donahue'
  ```
- **Expected Result**: At least one line of output containing "Donahue" (case-insensitive match).
- [FAIL: auto-judge: prerequisite not satisfied — depends on UAT-API-001 which requires $PAT_DONAHUE_JOB_ID not set] <!-- 2026-06-25 -->

---

### UAT-API-004: document.xml contains at least one specials table

- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the DOCX specials table was rendered — the OOXML element `<w:tbl>` must appear at least once.
- **Steps**:
  1. Complete UAT-API-001 first.
  2. Run the command below to count table elements.
- **Command**:
  ```bash
  unzip -p /tmp/demand-letter-export.docx word/document.xml | grep -c '<w:tbl>'
  ```
- **Expected Result**: Output is a number ≥ 1 (at least one table present).
- [FAIL: auto-judge: prerequisite not satisfied — depends on UAT-API-001 which requires $PAT_DONAHUE_JOB_ID not set] <!-- 2026-06-25 -->

---

### UAT-API-005: POST export/docx accepts a minimal ProseMirror doc and returns DOCX

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies the POST variant accepts a client-supplied ProseMirror document and returns a valid DOCX binary. This path is used by the editor "Export to Word" button.
- **Steps**:
  1. Run the curl command below, which sends a minimal ProseMirror `doc` payload.
  2. Inspect the HTTP status code printed after the binary output.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${PAT_DONAHUE_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Pat Donahue — test export"}]}]}}' -o /tmp/post-export.docx -w '%{http_code}'
  ```
- **Expected Result**: HTTP status `200`; `/tmp/post-export.docx` written and non-empty.
- [FAIL: auto-judge: prerequisite not satisfied — $PAT_DONAHUE_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-006: GET export/docx returns 422 when job has no generated output

- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the endpoint returns a proper 422 error when the job exists but has no output yet (generate was never run).
- **Steps**:
  1. First create a bare job with no output — use `$EMPTY_JOB_ID` (a job ID that was created but not generated).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/${EMPTY_JOB_ID}/export/docx" | jq '.error'
  ```
- **Expected Result**: HTTP 422; JSON body contains `"error": "output_not_ready"`.
- [FAIL: auto-judge: prerequisite not satisfied — $EMPTY_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-007: GET export/docx returns 404 for a nonexistent job

- **Endpoint**: `GET /jobs/{id}/export/docx`
- **Description**: Verifies the 404 error path for an unknown job ID.
- **Steps**:
  1. Run the curl command below with a synthetic UUID.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/00000000-0000-0000-0000-000000000000/export/docx' | jq '.error'
  ```
- **Expected Result**: HTTP 404; JSON body contains `"error": "job_not_found"`.
- [FAIL: auto-judge: SAM local returned HTTP 403 {"message":"Missing Authentication Token"} — GET /jobs/{id}/export/docx not routed in SAM local; expected 404 with error: job_not_found] <!-- 2026-06-25 -->

---

### UAT-API-008: POST export/docx returns 400 when doc field is missing

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies the endpoint rejects a POST body that omits the required `doc` field.
- **Steps**:
  1. Run the curl command below with an empty body object.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${PAT_DONAHUE_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{}' | jq '.error'
  ```
- **Expected Result**: HTTP 400; JSON body contains `"error": "missing_document"`.
- [FAIL: auto-judge: prerequisite not satisfied — $PAT_DONAHUE_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-UI-001: Editor page renders "Export to Word" button for a completed job

- **Page**: `/jobs/:id/editor`
- **Description**: Verifies the collaborative editor page loads for a completed job and shows the Export to Word button in the toolbar.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$PAT_DONAHUE_JOB_ID/editor`.
  2. Wait for the document to finish loading (spinner disappears).
  3. Observe the top-right area of the editor for the Export to Word button.
- **Expected Result**: Page loads without a crash; an "Export to Word" button is visible with class `bg-indigo-600`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Clicking "Export to Word" triggers a DOCX download

- **Page**: `/jobs/:id/editor`
- **Description**: Verifies that clicking the Export to Word button initiates a file download of `demand-letter.docx`.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$PAT_DONAHUE_JOB_ID/editor`.
  2. Wait for the document to load.
  3. Click the "Export to Word" button.
  4. Observe the browser's download indicator.
- **Expected Result**: Browser initiates a download for a file named `demand-letter.docx`; no error toast or console error appears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Exported DOCX opens without repair dialog in Microsoft Word

- **Page**: Manual verification
- **Description**: Verifies that the downloaded DOCX is not corrupt and opens cleanly in Microsoft Word (or LibreOffice Writer).
- **Steps**:
  1. Complete UAT-UI-002 to obtain `demand-letter.docx`.
  2. Open the file in Microsoft Word or LibreOffice Writer.
  3. Observe the open dialog — confirm no "repair mode" or corruption warning appears.
  4. Verify visually: document title/heading matches the original template format.
  5. Verify: specials table has column headers and provider rows.
  6. Verify: boilerplate §7 section appears with grey shading (`D9D9D9` or `F3F4F6`).
  7. Verify: bold and italic text is preserved in narrative sections.
- **Expected Result**: Document opens cleanly; all visual checks pass; no corruption warnings.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

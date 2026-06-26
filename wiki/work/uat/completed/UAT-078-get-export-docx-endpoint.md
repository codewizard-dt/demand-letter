---
id: UAT-078
title: "UAT: GET /jobs/:id/export/docx — stream generated .docx and trigger browser download"
status: pending
task: TASK-078
created: 2026-06-25
updated: 2026-06-25
---

# UAT-078 — UAT: GET /jobs/:id/export/docx Endpoint and Browser Download

implements::[[TASK-078]]

> **Source task**: [[TASK-078]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local API running: `sam local start-api --env-vars env.json` on port 3000
- [ ] A job with `output` populated exists in the local DB; capture its UUID:
  ```bash
  export UAT_JOB_ID=$(psql "$DATABASE_URL" -Atc "SELECT id FROM jobs WHERE output IS NOT NULL LIMIT 1;")
  echo "Using job: $UAT_JOB_ID"
  ```
- [ ] A job with `output IS NULL` exists; capture its UUID:
  ```bash
  export UAT_JOB_NO_OUTPUT=$(psql "$DATABASE_URL" -Atc "SELECT id FROM jobs WHERE output IS NULL LIMIT 1;")
  echo "Using job (no output): $UAT_JOB_NO_OUTPUT"
  ```

---

## Test Cases

### UAT-API-001: Happy path — 200 DOCX binary returned for job with output

- **Endpoint**: `GET /jobs/:id/export/docx`
- **Description**: Verifies that a job with a populated `output` field returns a valid `.docx` binary with the correct Content-Type and Content-Disposition headers.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set (see Prerequisites).
  2. Run the curl command below. It prints response headers to stdout and saves the binary body to `/tmp/demand-letter-export.docx`.
- **Command**:
  ```bash
  curl -sS -D - -o /tmp/demand-letter-export.docx "http://127.0.0.1:3000/jobs/$UAT_JOB_ID/export/docx"
  ```
- **Expected Result**:
  - HTTP status line: `HTTP/1.1 200 OK`
  - `Content-Type` header contains `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `Content-Disposition` header: `attachment; filename="demand-letter.docx"`
  - `/tmp/demand-letter-export.docx` is a non-zero-byte file beginning with `PK` (ZIP/OOXML magic bytes)
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID: no jobs with populated output exist in local DB] <!-- 2026-06-25 -->

---

### UAT-API-002: 404 for nonexistent job

- **Endpoint**: `GET /jobs/:id/export/docx`
- **Description**: Verifies the handler returns 404 with `error: "job_not_found"` when no DB row matches the given ID.
- **Steps**:
  1. Run the curl command below using a UUID that does not exist in the database.
- **Command**:
  ```bash
  curl -sS 'http://127.0.0.1:3000/jobs/00000000-0000-0000-0000-000000000000/export/docx' | jq
  ```
- **Expected Result**:
  ```json
  {
    "error": "job_not_found",
    "message": "The requested job does not exist."
  }
  ```
  Response body contains `"error": "job_not_found"` and HTTP status is 404.
- [FAIL: auto-judge: expected {"error":"job_not_found"} but got {"message":"Missing Authentication Token"} — SAM local API Gateway requires auth; request never reached Lambda handler] <!-- 2026-06-25 -->

---

### UAT-API-003: 422 for job with no generated output

- **Endpoint**: `GET /jobs/:id/export/docx`
- **Description**: Verifies the handler returns 422 with `error: "output_not_ready"` when the job row exists but `output` is null.
- **Steps**:
  1. Ensure `$UAT_JOB_NO_OUTPUT` is set (see Prerequisites).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://127.0.0.1:3000/jobs/$UAT_JOB_NO_OUTPUT/export/docx" | jq
  ```
- **Expected Result**:
  ```json
  {
    "error": "output_not_ready",
    "message": "No generated output found for this job."
  }
  ```
  Response body contains `"error": "output_not_ready"` and HTTP status is 422.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_NO_OUTPUT env var not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Plain-text (non-JSON) output is wrapped and exported without error

- **Endpoint**: `GET /jobs/:id/export/docx`
- **Description**: Verifies the fallback path: when `job.output` is valid plain text (not parseable as JSON), the handler wraps it as a single paragraph ProseMirror node and still returns a valid DOCX.
- **Steps**:
  1. Insert a job row whose `output` column contains a plain string (not JSON):
     ```bash
     export UAT_JOB_PLAIN=$(psql "$DATABASE_URL" -Atc "
       INSERT INTO jobs (output, created_at, updated_at)
       VALUES ('This is a plain-text demand letter.', NOW(), NOW())
       RETURNING id;")
     echo "Plain-text job: $UAT_JOB_PLAIN"
     ```
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -D - -o /tmp/demand-letter-plaintext.docx "http://127.0.0.1:3000/jobs/$UAT_JOB_PLAIN/export/docx"
  ```
- **Expected Result**:
  - HTTP status line: `HTTP/1.1 200 OK`
  - `Content-Type` header contains `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `/tmp/demand-letter-plaintext.docx` is a non-zero-byte file (OOXML/ZIP format)
- [FAIL: auto-judge: prerequisite not satisfied — UAT_JOB_PLAIN env var not set; requires DB insertion step that cannot be executed within a single curl invocation] <!-- 2026-06-25 -->

---

### UAT-UI-001: "Export to Word" button renders on EditorPage

- **Page**: `/jobs/:id/editor`
- **Description**: Verifies the "Export to Word" button is present in the editor toolbar area and is initially enabled (not in loading state).
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/editor` (or the local Vite dev URL).
  2. Wait for the document to finish loading (spinner disappears, editor content appears).
  3. Inspect the top-right area of the page.
- **Expected Result**:
  - A button labelled **"Export to Word"** is visible.
  - The button is not disabled (it is not visually dimmed / `opacity-50`).
  - No "Exporting…" text is shown.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: "Export to Word" button is disabled while export is in-flight

- **Page**: `/jobs/:id/editor`
- **Description**: Verifies that clicking "Export to Word" sets `isExporting` state, disabling the button and showing "Exporting…" until the fetch resolves.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/editor`.
  2. Open the browser Network panel (DevTools → Network).
  3. Click the **"Export to Word"** button.
  4. Immediately observe the button before the network request completes.
- **Expected Result**:
  - Button text changes to **"Exporting…"** immediately after click.
  - Button is visually disabled (`opacity-50` style) while the request is pending.
  - After the request completes, the button returns to **"Export to Word"** and is re-enabled.
  - A file-save dialog appears (or the file is automatically downloaded as `demand-letter.docx`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

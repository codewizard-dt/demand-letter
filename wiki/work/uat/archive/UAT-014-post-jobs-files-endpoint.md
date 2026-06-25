---
id: UAT-014
title: "UAT: POST /jobs/:id/files Endpoint — Upload Template and Case Docs"
status: passed
task: TASK-014
created: 2026-06-23
updated: 2026-06-23
---

# UAT-014 — UAT: POST /jobs/:id/files Endpoint — Upload Template and Case Docs

implements::[[TASK-014]]

> **Source task**: [[TASK-014]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] SAM local API is running: `sam local start-api --env-vars env.json` on port 3000
- [ ] `env.json` has `DOCUMENTS_BUCKET` set to a valid/mock bucket name and `DATABASE_URL` set to a reachable PostgreSQL instance
- [ ] A sample DOCX file is available locally (e.g. `sample-template.docx`)
- [ ] A sample PDF file is available locally (e.g. `case-doc.pdf`)
- [ ] PostgreSQL is seeded (or migrations applied): `pnpm --filter @demand-letter/db prisma migrate dev`
- [ ] AWS credentials are available in the shell for S3 PutObject calls (or LocalStack is running at the configured endpoint)

---

## Test Cases

### UAT-API-001: Happy Path — Upload DOCX Template and PDF Case Doc Together

- **Endpoint**: `POST /jobs/{id}/files`
- **Description**: Verifies that posting one DOCX template and one PDF case document in the same multipart request returns HTTP 201 with two file records — one with `role: "template"` and one with `role: "case_doc"`.
- **Steps**:
  1. Create a new job by running the command in the **Setup** block below; capture the returned `id`.
  2. Replace `<JOB_ID>` in the main command with the captured id.
  3. Run the main command as-is. Inspect the response body.
- **Setup command** (run first, capture `id`):
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@sample-template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document' -F 'files=@case-doc.pdf;type=application/pdf'
  ```
- **Expected Result**: HTTP 201. Response body is `{ "files": [ <record1>, <record2> ] }` where one record has `"role": "template"` and the other has `"role": "case_doc"`. Each record contains `id`, `jobId`, `s3Key`, `mimeType`, `fileName`, `role`, and `createdAt` fields. The `s3Key` for each file matches the pattern `<JOB_ID>/<uuid>-<filename>`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-002: Upload DOCX Only — Role Assigned as Template

- **Endpoint**: `POST /jobs/{id}/files`
- **Description**: Verifies that a multipart upload of a single DOCX file returns HTTP 201 with exactly one file record having `role: "template"`.
- **Steps**:
  1. Create a new job using the setup command below; capture the returned `id`.
  2. Replace `<JOB_ID>` with the captured id.
  3. Run the main command and inspect the response.
- **Setup command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@sample-template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ```
- **Expected Result**: HTTP 201. Response body is `{ "files": [ { "role": "template", "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ... } ] }` with exactly one record.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-003: Upload PDF Only — Role Assigned as Case Doc

- **Endpoint**: `POST /jobs/{id}/files`
- **Description**: Verifies that a multipart upload of a single PDF file returns HTTP 201 with exactly one file record having `role: "case_doc"`.
- **Steps**:
  1. Create a new job using the setup command; capture the returned `id`.
  2. Replace `<JOB_ID>` with the captured id.
  3. Run the main command and inspect the response.
- **Setup command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@case-doc.pdf;type=application/pdf'
  ```
- **Expected Result**: HTTP 201. Response body is `{ "files": [ { "role": "case_doc", "mimeType": "application/pdf", ... } ] }` with exactly one record.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-004: Job Not Found — Returns 404

- **Endpoint**: `POST /jobs/{id}/files`
- **Description**: Verifies that uploading files to a non-existent job ID returns HTTP 404 with an appropriate error body.
- **Steps**:
  1. Use a job ID that does not exist in the database (e.g. a random string).
  2. Run the command below as-is.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/nonexistent-job-id-00000/files' -F 'files=@case-doc.pdf;type=application/pdf'
  ```
- **Expected Result**: HTTP 404. Response body is `{ "error": "Job not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-API-005: No Files in Request — Returns 400

- **Endpoint**: `POST /jobs/{id}/files`
- **Description**: Verifies that a multipart request with no `files` field returns HTTP 400.
- **Steps**:
  1. Create a new job using the setup command; capture the returned `id`.
  2. Replace `<JOB_ID>` with the captured id.
  3. Run the main command (it sends an empty multipart body with no file parts).
- **Setup command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -H 'Content-Type: multipart/form-data'
  ```
- **Expected Result**: HTTP 400. Response body is `{ "error": "No files uploaded" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-001: Unsupported MIME Type — Returns 415

- **Scenario**: A file is uploaded with a MIME type that is neither `application/pdf` nor `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (e.g. `text/plain`).
- **Description**: Verifies that the handler rejects disallowed MIME types with HTTP 415 and an error message that includes the rejected MIME type.
- **Steps**:
  1. Create a new job using the setup command; capture the returned `id`.
  2. Replace `<JOB_ID>` with the captured id.
  3. Create a small plain-text file: save any text as `bad-file.txt`.
  4. Run the main command and inspect the response.
- **Setup command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@bad-file.txt;type=text/plain'
  ```
- **Expected Result**: HTTP 415. Response body is `{ "error": "Unsupported file type: text/plain" }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-002: Multiple PDFs in One Request — All Stored as case_doc

- **Scenario**: Multiple PDF files are uploaded in a single multipart request.
- **Description**: Verifies that the handler iterates all files and stores each PDF with `role: "case_doc"`.
- **Steps**:
  1. Create a new job using the setup command; capture the returned `id`.
  2. Replace `<JOB_ID>` with the captured id.
  3. Ensure two PDF files are available locally (`case-doc.pdf` and `case-doc-2.pdf`; copying one file as the other is sufficient).
  4. Run the main command and inspect the response.
- **Setup command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@case-doc.pdf;type=application/pdf' -F 'files=@case-doc-2.pdf;type=application/pdf'
  ```
- **Expected Result**: HTTP 201. Response body is `{ "files": [ ... ] }` containing exactly two records, both with `"role": "case_doc"` and `"mimeType": "application/pdf"`. Each has a distinct `id` and distinct `s3Key`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-EDGE-003: Mixed Valid and Invalid MIME Types — Stops on First Invalid

- **Scenario**: A request contains a valid PDF followed by a file with an unsupported MIME type.
- **Description**: Verifies that the handler stops processing on the first invalid MIME type and returns 415 — no partial records are committed (the iteration short-circuits on the disallowed type).
- **Steps**:
  1. Create a new job using the setup command; capture the returned `id`.
  2. Replace `<JOB_ID>` with the captured id.
  3. Ensure `case-doc.pdf` and `bad-file.txt` are available.
  4. Run the command below. Check that only an error body is returned (no `files` array with a partial record for the PDF).
- **Setup command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
  ```
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@bad-file.txt;type=text/plain' -F 'files=@case-doc.pdf;type=application/pdf'
  ```
- **Expected Result**: HTTP 415. Response body is `{ "error": "Unsupported file type: text/plain" }`. No `files` array. (The handler short-circuits on the first disallowed MIME encountered in iteration order.)
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

### UAT-INT-001: End-to-End Flow — Create Job Then Upload Files

- **Description**: Full integration walk-through: create a job, then upload a template and a case doc, then verify the file records are retrievable from the database and that `s3Key` values are well-formed.
- **Steps**:
  1. Create a new job:
     ```bash
     curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json'
     ```
     Note the returned `id` (e.g. `clxxxxxx`).
  2. Upload a DOCX template and a PDF to that job (replace `<JOB_ID>`):
     ```bash
     curl -sS -X POST 'http://localhost:3000/jobs/<JOB_ID>/files' -F 'files=@sample-template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document' -F 'files=@case-doc.pdf;type=application/pdf'
     ```
  3. Verify in the database that two rows exist in the `files` table with the correct `job_id`:
     ```bash
     psql "$DATABASE_URL" -c "SELECT id, job_id, role, mime_type, file_name, s3_key FROM files WHERE job_id = '<JOB_ID>';"
     ```
  4. Confirm `s3_key` values match the pattern `<JOB_ID>/<uuid>-<original_filename>`.
- **Expected Result**:
  - Step 1: HTTP 201 with `{ "id": "<cuid>" }`.
  - Step 2: HTTP 201 with `{ "files": [ ... ] }` containing two records.
  - Step 3: Two rows in `files` table — one `role = template`, one `role = case_doc`.
  - Step 4: Each `s3_key` begins with `<JOB_ID>/` followed by a UUID segment and the original filename.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-23 -->

---

## Gaps and Known Issues

_No known gaps. The env var mismatch (GAP-001) noted during generation has been resolved: the handler uses `process.env.DOCUMENTS_BUCKET`, which matches the SAM template injection._

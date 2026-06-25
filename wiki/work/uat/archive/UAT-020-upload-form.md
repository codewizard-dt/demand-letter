---
id: UAT-020
title: "UAT: Upload Form — Template DOCX + Case PDFs"
status: passed
task: TASK-020
created: 2026-06-24
updated: 2026-06-24
---

# UAT-020 — UAT: Upload Form — Template DOCX + Case PDFs

implements::[[TASK-020]]

> **Source task**: [[TASK-020]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Web dev server running: `pnpm --filter @demand-letter/web dev` (default: http://localhost:5173)
- [ ] SAM local API running on port 3000: `sam local start-api` (needed for API tests only; UI structure tests work without it)
- [ ] A sample `.docx` file available locally (any content)
- [ ] One or more sample `.pdf` files available locally (any content)

---

## Test Cases

### UAT-STATIC-001: UploadPage component file exists with correct exports
- **Description**: Verify that `packages/web/src/pages/UploadPage.tsx` exists and exports a default React component.
- **Steps**:
  1. Check file exists at `packages/web/src/pages/UploadPage.tsx`
  2. Verify it contains `export default function UploadPage`
- **Expected Result**: File exists; default export is `UploadPage`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-002: api.ts contains createJob and uploadFile exports
- **Description**: Verify that `packages/web/src/lib/api.ts` exports the two upload helper functions and the `API_BASE` constant.
- **Steps**:
  1. Open `packages/web/src/lib/api.ts`
  2. Verify `export async function createJob(): Promise<{ id: string }>` is present
  3. Verify `export async function uploadFile(jobId: string, file: File): Promise<void>` is present
  4. Verify `const API_BASE = import.meta.env.VITE_API_URL` is present
- **Expected Result**: All three declarations present; `API_BASE` falls back to `''` (empty string) or a default when `VITE_API_URL` is unset.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-003: App.tsx routes / to UploadPage
- **Description**: Verify that the root route `/` is wired to `UploadPage` and that there is no `Navigate` redirect from `/` to `/admin/usage`.
- **Steps**:
  1. Open `packages/web/src/App.tsx`
  2. Verify `import UploadPage from './pages/UploadPage'` is present
  3. Verify `<Route path="/" element={<UploadPage />} />` is present
  4. Verify there is no `<Navigate to="/admin/usage"` on the `/` route
- **Expected Result**: `UploadPage` is imported and wired to `/`; the old `Navigate` redirect is gone.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-004: TypeScript check passes with zero errors
- **Description**: Verify the web package typechecks cleanly after all changes.
- **Steps**:
  1. Run: `pnpm --filter @demand-letter/web typecheck`
- **Expected Result**: Command exits 0 with no TypeScript errors.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-UI-001: Upload page renders at /
- **Page**: `http://localhost:5173/`
- **Description**: Verify the upload page loads with the correct heading, two file inputs, and the submit button.
- **Steps**:
  1. Navigate to `http://localhost:5173/`
  2. Observe the page content
- **Expected Result**: Page displays "Upload Documents" heading, a "Template (.docx)" file input, a "Case Documents (.pdf)" file input, and an "Upload & Continue" button. No error banner is shown.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-002: Template file input restricts to .docx
- **Page**: `http://localhost:5173/`
- **Description**: Verify the template file input only accepts `.docx` files.
- **Steps**:
  1. Navigate to `http://localhost:5173/`
  2. Click the "Template (.docx)" file input
  3. Observe the file picker filter
- **Expected Result**: The file picker shows a filter for `.docx` files (or "Word Documents"). Non-docx files should be grayed out or not shown.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-003: Case documents file input restricts to .pdf and allows multiple
- **Page**: `http://localhost:5173/`
- **Description**: Verify the case documents file input only accepts `.pdf` files and supports multiple selection.
- **Steps**:
  1. Navigate to `http://localhost:5173/`
  2. Click the "Case Documents (.pdf)" file input
  3. Observe the file picker filter
  4. Try selecting multiple PDF files
- **Expected Result**: The file picker filters to `.pdf` files. Multiple files can be selected simultaneously.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-004: Submit button shows loading state during upload
- **Page**: `http://localhost:5173/`
- **Description**: Verify the button text changes to "Uploading..." and is disabled while the upload is in progress.
- **Steps**:
  1. Navigate to `http://localhost:5173/`
  2. Select a `.docx` file for the template input
  3. Select one or more `.pdf` files for the case documents input
  4. Click "Upload & Continue"
  5. Immediately observe the button state (before the API responds)
- **Expected Result**: The button label changes to "Uploading..." and the button is disabled (not clickable) while the upload is in progress. The cursor style changes to `not-allowed`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-005: Error banner appears on API failure
- **Page**: `http://localhost:5173/`
- **Description**: Verify a red error banner is shown when the API call fails (e.g., SAM local is not running).
- **Steps**:
  1. Ensure the SAM local API is NOT running on port 3000
  2. Navigate to `http://localhost:5173/`
  3. Select a `.docx` file for template and a `.pdf` file for case docs
  4. Click "Upload & Continue"
  5. Wait for the upload to fail
- **Expected Result**: A red error banner appears below the "Upload Documents" heading displaying an error message (e.g., "Failed to fetch" or similar network error). The button returns to "Upload & Continue" after the failure.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-006: Successful upload navigates to /jobs/:id/generate
- **Page**: `http://localhost:5173/`
- **Description**: Verify that on successful upload, the browser navigates to `/jobs/<id>/generate` where `<id>` is the job ID returned by `POST /jobs`.
- **Steps**:
  1. Ensure SAM local API is running on port 3000
  2. Navigate to `http://localhost:5173/`
  3. Select a `.docx` file for template
  4. Select one or more `.pdf` files for case docs
  5. Click "Upload & Continue"
  6. Wait for the upload to complete
- **Expected Result**: Browser URL changes to `/jobs/<uuid>/generate` (where `<uuid>` is a CUID/UUID). The GeneratePage renders at that route.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-API-001: POST /jobs returns 201 with id
- **Endpoint**: `POST /jobs`
- **Description**: Verify that calling `POST /jobs` with an empty body returns HTTP 201 and a JSON object with an `id` field.
- **Steps**:
  1. Ensure SAM local API is running on port 3000
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{}' | jq .
  ```
- **Expected Result**: HTTP 201 (check with `-w "%{http_code}"`); response body is `{ "id": "<string>" }` where the id is a non-empty string (CUID format).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

### UAT-API-002: POST /jobs/:id/files returns 201 with files array
- **Endpoint**: `POST /jobs/:id/files`
- **Description**: Verify that uploading a valid DOCX file to a known job ID returns 201 and a `files` array.
- **Steps**:
  1. First call `POST /jobs` to create a job and note the returned `id` (e.g., `JOB_ID=<from step above>`)
  2. Run the curl command below (replace `$JOB_ID` with the actual id)
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/files" -F 'file=@/path/to/template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document' | jq .
  ```
- **Expected Result**: HTTP 201; response body is `{ "files": [{ "id": "...", "jobId": "...", "s3Key": "...", "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "role": "template", "fileName": "template.docx" }] }`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

### UAT-API-003: POST /jobs/:id/files — PDF file gets role case_doc
- **Endpoint**: `POST /jobs/:id/files`
- **Description**: Verify that a PDF uploaded to `POST /jobs/:id/files` is stored with `role: "case_doc"`.
- **Steps**:
  1. Create a job via `POST /jobs` and note the `id`
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/files" -F 'file=@/path/to/casedoc.pdf;type=application/pdf' | jq .files[0].role
  ```
- **Expected Result**: Output is `"case_doc"`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API not running on port 3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Submit is a no-op when template file is missing
- **Page**: `http://localhost:5173/`
- **Description**: Verify that clicking "Upload & Continue" without a template file selected does not trigger any API call or navigation.
- **Steps**:
  1. Navigate to `http://localhost:5173/`
  2. Select one or more `.pdf` files for case docs only (leave template unselected)
  3. Click "Upload & Continue" (or attempt to submit)
- **Expected Result**: No API call is made. No error banner appears. The form stays on the same page. (The `required` attribute on the input enforces this at the browser level; the submit handler also guards with `if (!templateFile || caseFiles.length === 0) return`.)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-EDGE-002: Submit is a no-op when case documents are missing
- **Page**: `http://localhost:5173/`
- **Description**: Verify that clicking "Upload & Continue" without any case PDF selected does not trigger any API call.
- **Steps**:
  1. Navigate to `http://localhost:5173/`
  2. Select a `.docx` file for template (leave case docs unselected)
  3. Click "Upload & Continue" (or attempt to submit)
- **Expected Result**: No API call is made. No error banner appears. The form stays on the same page.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-EDGE-003: Error message from failed uploadFile call is displayed
- **Page**: `http://localhost:5173/`
- **Description**: Verify that if the template file upload (`POST /jobs/:id/files`) fails after a successful `POST /jobs`, the error message includes the HTTP status from the response.
- **Steps**:
  1. Ensure `POST /jobs` succeeds (SAM running) but `POST /jobs/:id/files` will return an error (e.g., upload an unsupported file type or kill the server after job creation)
  2. Navigate to `http://localhost:5173/`
  3. Select a `.docx` template and `.pdf` case docs
  4. Click "Upload & Continue"
- **Expected Result**: A red error banner appears with a message containing `POST /jobs/<id>/files failed: <status>` matching the exact error template from `uploadFile`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-EDGE-004: Multiple PDFs are all uploaded sequentially
- **Page**: `http://localhost:5173/`
- **Description**: Verify that when multiple PDFs are selected, all of them are uploaded (one at a time) before navigation occurs.
- **Steps**:
  1. Ensure SAM local API is running on port 3000
  2. Navigate to `http://localhost:5173/`
  3. Select a `.docx` template
  4. Select three `.pdf` case documents
  5. Click "Upload & Continue"
  6. After successful navigation, verify via database or API that three File records exist for the job
- **Expected Result**: All three PDFs are uploaded. The job at `/jobs/<id>/generate` has 4 associated file records (1 template + 3 case docs).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

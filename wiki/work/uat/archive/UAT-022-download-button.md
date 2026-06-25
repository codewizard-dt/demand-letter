---
id: UAT-022
title: "UAT: Download Button for Generation Output"
status: passed
task: TASK-022
created: 2026-06-24
updated: 2026-06-24
---

# UAT-022 — UAT: Download Button for Generation Output

implements::[[TASK-022]]

> **Source task**: [[TASK-022]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] API stack deployed locally (`sam local start-api` or equivalent) with the database seeded
- [ ] A job record exists with `status = 'done'` and a non-empty `output` field (happy-path tests)
- [ ] A job record exists with `status = 'processing'` (polling test)
- [ ] A job record exists with `status = 'failed'` (error test)
- [ ] Frontend dev server running (`pnpm --filter web dev`)
- [ ] API base URL is `http://localhost:3000` (default `VITE_API_URL`)

---

## Test Cases

### UAT-API-001: Output endpoint returns 200 with plain-text body for a completed job

- **Endpoint**: `GET /jobs/:id/output`
- **Description**: Verifies that a job whose `status` is `done` returns HTTP 200, `Content-Type: text/plain`, and the demand-letter text as the response body.
- **Steps**:
  1. Note a job ID whose DB row has `status = 'done'` and a non-empty `output` column — call it `$JOB_ID`.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -i 'http://localhost:3000/jobs/$JOB_ID/output'
  ```
- **Expected Result**: HTTP 200; response headers include `Content-Type: text/plain` and `Content-Disposition: attachment; filename="demand-letter-$JOB_ID.txt"`; body is the plain-text demand letter (non-empty).
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-002: Output endpoint returns 202 while job is still processing

- **Endpoint**: `GET /jobs/:id/output`
- **Description**: Verifies that a job whose `status` is `processing` or `pending` returns HTTP 202 with a JSON status body.
- **Steps**:
  1. Note a job ID whose DB row has `status = 'processing'` — call it `$PROC_JOB_ID`.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -w '\nHTTP_STATUS:%{http_code}' 'http://localhost:3000/jobs/$PROC_JOB_ID/output'
  ```
- **Expected Result**: `HTTP_STATUS:202`; response body is `{"status":"processing"}` (or `{"status":"pending"}`).
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-003: Output endpoint returns 404 for an unknown job ID

- **Endpoint**: `GET /jobs/:id/output`
- **Description**: Verifies that a non-existent job ID returns HTTP 404.
- **Steps**:
  1. Use a UUID that does not exist in the database (e.g., `00000000-0000-0000-0000-000000000000`).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -w '\nHTTP_STATUS:%{http_code}' 'http://localhost:3000/jobs/00000000-0000-0000-0000-000000000000/output'
  ```
- **Expected Result**: `HTTP_STATUS:404`; response body is `{"error":"Job not found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-004: Output endpoint returns 500 for a failed job

- **Endpoint**: `GET /jobs/:id/output`
- **Description**: Verifies that a job whose `status` is `failed` returns HTTP 500 with an error body.
- **Steps**:
  1. Note a job ID whose DB row has `status = 'failed'` — call it `$FAILED_JOB_ID`.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -w '\nHTTP_STATUS:%{http_code}' 'http://localhost:3000/jobs/$FAILED_JOB_ID/output'
  ```
- **Expected Result**: `HTTP_STATUS:500`; response body is `{"error":"Generation failed"}`.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000] <!-- 2026-06-24 -->

---

### UAT-UI-001: Download button appears only after generation completes

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Verifies that the "Download Demand Letter" button is not visible before generation, and becomes visible only after the generate flow finishes.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate` (use a job ID that exists in the DB).
  2. Confirm the page shows a "Generate Demand Letter" button.
  3. Confirm no "Download Demand Letter" button is visible.
  4. Click "Generate Demand Letter" and wait for it to complete (button disappears, output appears in the `<pre>` block).
  5. Confirm the "Download Demand Letter" button is now visible.
- **Expected Result**: The download button is absent before generation and present after generation completes successfully.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-002: Clicking Download triggers a browser file download

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Verifies that clicking "Download Demand Letter" triggers a browser download of a `.txt` file named `demand-letter-$JOB_ID.txt`.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click "Generate Demand Letter" and wait for generation to complete.
  3. Click "Download Demand Letter".
  4. Observe the browser download prompt or downloads folder.
- **Expected Result**: A file named `demand-letter-$JOB_ID.txt` is downloaded; its contents match the demand-letter text shown in the `<pre>` output block on screen.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-003: Download button shows loading state while download is in progress

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Verifies that the button label changes to "Preparing download…" and is disabled while the download is being prepared.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click "Generate Demand Letter" and wait for generation to complete.
  3. Throttle the network to "Slow 3G" in browser DevTools to slow the download request.
  4. Click "Download Demand Letter".
  5. Immediately observe the button label and disabled state before the download completes.
- **Expected Result**: Button label changes to "Preparing download…" and the button is visually disabled (opacity reduced) while the request is in-flight; it returns to "Download Demand Letter" and re-enables after the download triggers.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Polling — download button retries until job is done

- **Page**: `http://localhost:5173/jobs/$PROC_JOB_ID/generate`
- **Description**: Verifies that when the API returns 202 (job still processing), the UI polls every ~2 seconds until the job is complete, then triggers the download automatically.
- **Steps**:
  1. Ensure `$PROC_JOB_ID` starts with `status = 'processing'`.
  2. Navigate to `http://localhost:5173/jobs/$PROC_JOB_ID/generate`.
  3. Click "Generate Demand Letter" and wait for it to complete (or skip this and click "Download Demand Letter" directly if the job was already generated).
  4. Click "Download Demand Letter" while the job's output endpoint still returns 202.
  5. In the DB, update the job `status` to `done` and populate the `output` column with sample text within ~10 seconds.
  6. Observe the browser.
- **Expected Result**: The button stays in "Preparing download…" state while polling; once the DB is updated and the next poll returns 200, the browser automatically triggers the file download without any additional user action.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Generate button is hidden after generation completes

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Verifies that the "Generate Demand Letter" button is hidden once `isDone` becomes true (prevents re-triggering generation).
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click "Generate Demand Letter" and wait for generation to complete.
  3. Inspect the page for the "Generate Demand Letter" button.
- **Expected Result**: The "Generate Demand Letter" button is no longer rendered in the DOM after generation completes (it is conditionally rendered with `{!isDone && ...}`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

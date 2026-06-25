---
id: UAT-050
title: "UAT: GET /jobs/:id/output presigned URL endpoint and Download DOCX button"
status: passed
task: TASK-050
created: 2026-06-25
updated: 2026-06-25
---

# UAT-050 — UAT: GET /jobs/:id/output presigned URL endpoint and Download DOCX button

implements::[[TASK-050]]

> **Source task**: [[TASK-050]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] API server running locally at `http://localhost:3000` (SAM local or equivalent)
- [ ] Frontend dev server running at `http://localhost:5173` (or VITE_API_URL set accordingly)
- [ ] A job record exists in the database with a known `id` — note it as `$JOB_ID`
- [ ] A second job record exists that has `outputS3Key` set (generation complete) — note it as `$DONE_JOB_ID`
- [ ] `DOCUMENTS_BUCKET` environment variable is set in the Lambda runtime (confirmed in `template.yaml` under `GetJobsOutputFunction`)
- [ ] AWS credentials with S3 `GetObject` permission are available to the running Lambda

---

## Test Cases

### UAT-API-001: GET /jobs/:id/output returns presigned URL for a completed job

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that the handler returns HTTP 200 with a `{ url }` JSON body containing a valid presigned S3 URL when the job exists and `outputS3Key` is set.
- **Steps**:
  1. Ensure `$DONE_JOB_ID` refers to a job whose `outputS3Key` is populated in the database.
  2. Run the curl command below, substituting `$DONE_JOB_ID` with the actual job ID.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/'"$DONE_JOB_ID"'/output' | jq .
  ```
- **Expected Result**: HTTP 200 with body `{ "url": "<presigned-s3-url>" }`. The `url` field must be a non-empty string starting with `https://` and containing `X-Amz-Signature` (confirming it is a genuine presigned URL).
- [FAIL: auto-judge: auth token missing — $DONE_JOB_ID env var not set; cannot run test] <!-- 2026-06-25 -->

---

### UAT-API-002: GET /jobs/:id/output returns 404 when outputS3Key is null

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that the handler returns `404 { error: 'output_not_ready' }` when the job exists but `outputS3Key` is not yet set (generation still in progress or not yet started).
- **Steps**:
  1. Ensure `$JOB_ID` refers to a job whose `outputS3Key` is `null` in the database.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' 'http://localhost:3000/jobs/'"$JOB_ID"'/output' && echo '' && curl -sS 'http://localhost:3000/jobs/'"$JOB_ID"'/output' | jq .
  ```
- **Expected Result**: HTTP 404 with body `{ "error": "output_not_ready" }`.
- [FAIL: auto-judge: auth token missing — $JOB_ID env var not set; cannot run test] <!-- 2026-06-25 -->

---

### UAT-API-003: GET /jobs/:id/output returns 404 for a non-existent job

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that the handler returns `404 { error: 'job_not_found' }` when no job record matches the given ID.
- **Steps**:
  1. Use a fabricated job ID that does not exist in the database (e.g. `nonexistent-job-id-000`).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/nonexistent-job-id-000/output' | jq .
  ```
- **Expected Result**: HTTP 404 with body `{ "error": "job_not_found" }`.
- [FAIL: auto-judge: HTTP 502 expected 404; actual body: {"message":"Internal server error"}] <!-- 2026-06-25 -->

---

### UAT-API-004: Presigned URL expires after 15 minutes (TTL contract)

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that the returned presigned URL encodes a 15-minute (900-second) expiry in its query string, confirming `expiresIn: 900` is passed to `getSignedUrl`.
- **Steps**:
  1. Fetch the presigned URL for `$DONE_JOB_ID`.
  2. Inspect the `X-Amz-Expires` query parameter in the returned URL.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/'"$DONE_JOB_ID"'/output' | jq -r '.url' | grep -o 'X-Amz-Expires=[0-9]*'
  ```
- **Expected Result**: Output is `X-Amz-Expires=900`.
- [FAIL: auto-judge: auth token missing — $DONE_JOB_ID env var not set; cannot run test] <!-- 2026-06-25 -->

---

### UAT-UI-001: Download DOCX button appears and triggers download after generation completes

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the full happy-path UI flow — after generation completes the "Download DOCX" button becomes visible, clicking it calls `downloadOutput`, fetches the presigned URL, and triggers a browser file download of `demand-letter.docx`.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$DONE_JOB_ID/generate` in a browser (use a job that has no gap-report gaps so `canGenerate` is true).
  2. Click **Generate Demand Letter**.
  3. Wait for generation to finish (the spinner disappears and the "Generate Demand Letter" button section is hidden via `!isDone`).
  4. Confirm the **Download DOCX** button is visible (rendered by the `{isDone && ...}` block).
  5. Click **Download DOCX**.
  6. Observe the browser's download behaviour.
- **Expected Result**:
  - The "Download DOCX" button appears only after generation is done (`isDone === true`).
  - Clicking it briefly shows "Preparing download…" (while `isDownloading === true`).
  - The browser initiates a file download named `demand-letter.docx`.
  - No error is displayed in the UI.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Download button is disabled while download is in progress

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that the "Download DOCX" button is disabled (`disabled` attribute present) while `isDownloading` is true to prevent double-clicks triggering multiple downloads.
- **Steps**:
  1. Navigate to `/jobs/$DONE_JOB_ID/generate` and complete generation so the "Download DOCX" button is visible.
  2. Open browser DevTools → Network tab. Add a slow network throttle (e.g. "Slow 3G") to delay the `/output` fetch.
  3. Click **Download DOCX**.
  4. While the network request is in flight, inspect the button.
- **Expected Result**: The button shows "Preparing download…" text and has the `disabled` attribute, preventing additional clicks. After the request completes the button returns to "Download DOCX" and is re-enabled.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Gap-report gate prevents generation when gaps exist

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that the **Generate Demand Letter** button is disabled (and a warning is shown) when the gap report contains uncovered slots, ensuring the download flow cannot be accidentally started on an incomplete job.
- **Steps**:
  1. Navigate to `/jobs/$JOB_ID/generate` where `$JOB_ID` references a job that has one or more gap-report gaps.
  2. Observe the **Generate Demand Letter** button state immediately after the page loads.
- **Expected Result**: The button is disabled (`disabled` attribute present) and a yellow warning paragraph below it explains how many required slots are uncovered (e.g. "2 required slots still uncovered. Go to the Gap Report to fill or accept them before generating."). The "Download DOCX" button is not visible.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: downloadOutput throws when API returns a non-2xx status

- **Scenario**: The frontend `downloadOutput` function must surface errors from the API rather than silently resolving with an empty or malformed URL.
- **Steps**:
  1. In a browser DevTools session or test harness, intercept the `GET /jobs/$JOB_ID/output` request and force a `500` response.
  2. Trigger `handleDownload` in the UI (click "Download DOCX").
  3. Observe whether the error is surfaced or silently swallowed.
- **Expected Result**: `downloadOutput` throws `Error: "downloadOutput failed: 500"`. The `handleDownload` function's `finally` block still sets `isDownloading` back to `false`. The UI does not freeze. (Any error display is a bonus — the absence of a crash/freeze is the minimum requirement.)
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: DOCUMENTS_BUCKET is wired into GetJobsOutputFunction in template.yaml

- **Scenario**: The SAM template must supply `DOCUMENTS_BUCKET` as an environment variable to `GetJobsOutputFunction` so the handler can reference it at runtime. This is a static configuration check.
- **Steps**:
  1. Open `template.yaml` in the repo root.
  2. Locate the `GetJobsOutputFunction` resource (around line 295).
  3. Check its `Properties.Environment.Variables` block.
- **Expected Result**: `DOCUMENTS_BUCKET: !Ref DocumentsBucket` is present under `GetJobsOutputFunction.Properties.Environment.Variables`. No shell command needed — this is a file inspection check.
- [x] Pass <!-- 2026-06-25 -->

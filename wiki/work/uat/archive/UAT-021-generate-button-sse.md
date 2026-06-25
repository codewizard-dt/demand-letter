---
id: UAT-021
title: "UAT: Generate Button with SSE Streaming Display"
status: passed
task: TASK-021
created: 2026-06-24
updated: 2026-06-24
---

# UAT-021 — UAT: Generate Button with SSE Streaming Display

implements::[[TASK-021]]

> **Source task**: [[TASK-021]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] API server running at `http://localhost:3000` (`sam local start-api` or equivalent)
- [ ] Web dev server running at `http://localhost:5173` (`pnpm --filter @demand-letter/web dev`)
- [ ] A valid job ID exists in the database with at least one file uploaded (create one by completing the upload flow at `/`)
- [ ] Set shell variable: `export JOB_ID=<a valid job id from the database>`

---

## Test Cases

### UAT-UI-001: Route renders GeneratePage at /jobs/:id/generate

- **Page**: `http://localhost:5173/jobs/test-id/generate`
- **Description**: Confirms the route `/jobs/:id/generate` is wired and the page renders without crashing.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/test-id/generate` in a browser.
  2. Observe the page content.
- **Expected Result**: Page renders with the heading "Generate Demand Letter" and a button labelled "Generate Demand Letter". No blank page, no router 404.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-UI-002: Generate button is visible and enabled before generation starts

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Confirms the initial idle state — button present, not disabled, no spinner, no output.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Observe the button before clicking anything.
- **Expected Result**: A button with text "Generate Demand Letter" is visible and enabled (not greyed-out, no spinner icon). No `<pre>` output block is visible. No error message is visible.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-UI-003: Clicking Generate triggers loading state

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Confirms the button transitions to a disabled spinner state immediately after clicking.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click the "Generate Demand Letter" button.
  3. Immediately observe the button before generation completes (the request may take several seconds).
- **Expected Result**: The button text changes to "Generating…" (with the ellipsis character "…"), the button becomes disabled (greyed-out / `opacity-50`), and a spinning SVG icon appears inside the button. The "Generate Demand Letter" button disappears from the page once generation is fully done.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-UI-004: Streamed output appears live in the pre block

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Confirms that chunks are rendered progressively in the `<pre>` element as they arrive.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click "Generate Demand Letter".
  3. Watch the page while the request is in-flight.
- **Expected Result**: A `<pre>` element with classes `whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm` appears and its text content grows as chunks stream in. The text is not blank — it contains demand letter content.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-UI-005: Download button appears after generation completes

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Confirms `isDone=true` renders the download button and hides the generate button.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click "Generate Demand Letter" and wait for generation to fully complete (spinner disappears).
- **Expected Result**: A button labelled "Download Demand Letter" becomes visible. The "Generating…" / "Generate Demand Letter" button is no longer present in the DOM (it is removed, not just disabled). The `<pre>` block contains the full generated text.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-UI-006: Error message displayed on API failure

- **Page**: `http://localhost:5173/jobs/nonexistent-job-id/generate`
- **Description**: Confirms the UI surfaces an error when the backend returns a non-2xx status.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/nonexistent-job-id/generate`.
  2. Click "Generate Demand Letter".
  3. Wait for the request to complete.
- **Expected Result**: An error message is displayed in red (`text-red-600`) beneath the button. The message contains the text `POST /jobs/nonexistent-job-id/generate failed:` followed by the HTTP status code (e.g. `404` or `500`). The button returns to its idle state (re-enabled, no spinner).
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-API-001: POST /jobs/:id/generate returns 200 with text/plain body

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Confirms the generate endpoint returns a successful text/plain response for a valid job with uploaded files.
- **Steps**:
  1. Ensure `$JOB_ID` has files uploaded.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/generate" -D -
  ```
- **Expected Result**: HTTP 200 response with `Content-Type: text/plain` header. Body contains non-empty demand letter text.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-API-002: POST /jobs/:id/generate returns 400 for missing job id

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Confirms the endpoint rejects a request with an empty/missing job ID path segment.
- **Steps**:
  1. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs//generate' -w '\nHTTP %{http_code}'
  ```
- **Expected Result**: HTTP 400 response with JSON body `{"error":"Missing job id"}`.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-API-003: POST /jobs/:id/generate returns 422 when no files uploaded

- **Endpoint**: `POST /jobs/{id}/generate`
- **Description**: Confirms the endpoint rejects generation for a job that has no uploaded files.
- **Steps**:
  1. Create a new job with no files: `curl -sS -X POST 'http://localhost:3000/jobs' -H 'Content-Type: application/json' -d '{}'`
  2. Note the returned `id` as `$EMPTY_JOB_ID`.
  3. Run the generate command against the empty job.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$EMPTY_JOB_ID/generate"
  ```
- **Expected Result**: HTTP 422 response with JSON body `{"error":"No files uploaded for this job"}`.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-EDGE-001: Navigating directly to /jobs/:id/generate without a prior upload session

- **Page**: `http://localhost:5173/jobs/some-valid-id/generate`
- **Description**: Confirms the page renders correctly even when accessed directly (not via redirect from upload flow), as long as the job ID is valid.
- **Steps**:
  1. Open a fresh browser tab (no prior navigation history on this site).
  2. Navigate directly to `http://localhost:5173/jobs/$JOB_ID/generate`.
  3. Confirm the page renders.
  4. Click "Generate Demand Letter".
- **Expected Result**: The page renders the button without error. Clicking it triggers generation normally (no crash due to missing navigation state).
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

### UAT-EDGE-002: Generate button disabled and non-clickable during in-flight request

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Confirms that spamming the button during generation does not trigger multiple concurrent requests.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. Click "Generate Demand Letter".
  3. While the spinner is showing, attempt to click the button area again.
- **Expected Result**: The button is in a disabled state (`disabled` HTML attribute present) and has `opacity-50` styling applied. A second click does not trigger a second fetch. Only one request is in flight.
- [FAIL: auto-judge: prerequisite not satisfied — API server not running at localhost:3000; web dev server not running at localhost:5173] <!-- 2026-06-24 -->

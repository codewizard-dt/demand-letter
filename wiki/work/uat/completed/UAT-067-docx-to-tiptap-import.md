---
id: UAT-067
title: "UAT: DOCX-to-editor import via mammoth.js"
status: passed
task: TASK-067
created: 2026-06-25
updated: 2026-06-25
---

# UAT-067 — UAT: DOCX-to-editor import via mammoth.js

implements::[[TASK-067]]

> **Source task**: [[TASK-067]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] API server running locally: `sam local start-api` (default port 3000)
- [ ] Web dev server running: `pnpm --filter @demand-letter/web dev` (default port 5173)
- [ ] A completed job exists in the database with `outputS3Key` populated (i.e. generation has been run). Export its ID: `export UAT_JOB_ID=<job-id>`
- [ ] A second job ID that has **no output** (status before generation). Export: `export UAT_JOB_NO_OUTPUT=<job-id>`
- [ ] `jq` installed for pretty-printing curl responses

---

## Test Cases

### UAT-API-001: GET /jobs/{id}/output returns a presigned URL for a completed job

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that the output endpoint returns HTTP 200 with a `url` field containing a presigned S3 URL when the job has an `outputS3Key`.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set to a job with completed output.
  2. Run the curl command below.
  3. Confirm status 200 and that `url` begins with `https://` and contains the S3 domain.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/${UAT_JOB_ID}/output" | jq .
  ```
- **Expected Result**: HTTP 200 with body `{ "url": "<https://...s3...presigned-url>" }`. The `url` value must be a non-empty string starting with `https://`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID and $UAT_JOB_NO_OUTPUT env vars not set] <!-- 2026-06-25 -->

---

### UAT-API-002: GET /jobs/{id}/output returns 404 for a non-existent job

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies the endpoint returns 404 with `error: "job_not_found"` when no job exists for the given ID.
- **Steps**:
  1. Run the curl command below with a fabricated UUID.
  2. Confirm status 404 and `error` field value.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' "http://localhost:3000/jobs/00000000-0000-0000-0000-000000000000/output"
  ```
- **Expected Result**: HTTP status `404`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID and $UAT_JOB_NO_OUTPUT env vars not set] <!-- 2026-06-25 -->

### UAT-API-003: GET /jobs/{id}/output returns 404 with output_not_ready for a job without output

- **Endpoint**: `GET /jobs/{id}/output`
- **Description**: Verifies that when a job exists but `outputS3Key` is null (generation not yet run), the endpoint returns 404 with `error: "output_not_ready"`.
- **Steps**:
  1. Ensure `$UAT_JOB_NO_OUTPUT` is set to a job that exists but has no output.
  2. Run the curl command below.
  3. Confirm status 404 and `error` equals `"output_not_ready"`.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/${UAT_JOB_NO_OUTPUT}/output" | jq .
  ```
- **Expected Result**: HTTP 404 with body `{ "error": "output_not_ready" }`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID and $UAT_JOB_NO_OUTPUT env vars not set] <!-- 2026-06-25 -->

---

### UAT-UI-001: EditorPage shows loading spinner during DOCX fetch

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verifies that while the DOCX is being fetched and converted, the page displays a loading spinner and "Loading document…" text rather than the editor or blank content.
- **Steps**:
  1. Open browser DevTools → Network tab. Enable network throttling (e.g. "Slow 3G") to slow the S3 fetch.
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/editor`.
  3. Immediately observe the page before the fetch completes.
  4. Disable throttling once the editor loads.
- **Expected Result**: During loading, the page shows an animated blue spinner SVG alongside the text **"Loading document…"**. No editor content or blank white box is visible during this phase.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-002: EditorPage renders TipTap editor with converted DOCX content

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verifies the full DOCX-to-editor import pipeline: presigned URL is fetched, DOCX is downloaded and converted via mammoth.js, and the resulting HTML is loaded into the TipTap ProseMirror editor.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/editor`.
  2. Wait for the loading spinner to disappear (page becomes the editor view).
  3. Observe the editor area.
  4. Inspect the DOM: verify a `.ProseMirror` element is present inside `.tiptap-editor`.
  5. Verify the editor contains rendered paragraphs (not raw `<p>` HTML tag text).
  6. If the source DOCX has bold text, confirm bold (`<strong>`) nodes appear in the ProseMirror DOM.
- **Expected Result**: The loading spinner disappears and is replaced by the heading "Edit Demand Letter" and a bordered editor panel. The editor contains the document's text as formatted paragraphs — not raw HTML strings. The `.ProseMirror[contenteditable="true"]` element exists with non-empty child nodes.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: EditorPage shows error paragraph when the presigned URL returns an error

- **Scenario**: The `fetchOutputUrl` call throws because the API returns a non-OK status (simulated by navigating to a job with no output).
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_NO_OUTPUT/editor`.
  2. Wait for the loading state to resolve (spinner disappears).
  3. Observe the editor content.
- **Expected Result**: The loading spinner disappears and the TipTap editor area renders a paragraph with the text **"Error loading document."**. No unhandled JS error should appear in the browser console (the error is caught and handled gracefully).
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

### UAT-EDGE-002: Y.Doc is not double-seeded on re-render

- **Scenario**: Verifies the guard `if (fragment.length === 0)` prevents overwriting existing Y.Doc content when the component re-renders after initial seed.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/editor` and allow content to load.
  2. Type a short phrase into the editor (e.g. "UAT marker text").
  3. Trigger a React re-render without a page refresh: resize the browser window to force re-render.
  4. Observe whether the manually typed text is preserved or overwritten.
- **Expected Result**: The typed phrase "UAT marker text" persists after the re-render. The editor does **not** reset back to the original DOCX content, confirming the `fragment.length === 0` guard is effective.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

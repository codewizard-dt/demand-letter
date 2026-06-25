---
id: UAT-066
title: "UAT: Integrate TipTap editor in React app and render generated output as editor content"
status: passed
task: TASK-066
created: 2026-06-25
updated: 2026-06-25
---

# UAT-066 — UAT: Integrate TipTap Editor in React App and Render Generated Output as Editor Content

implements::[[TASK-066]]

> **Source task**: [[TASK-066]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Dev server running: `cd packages/web && pnpm dev` (serves at `http://localhost:5173`)
- [ ] At least one job exists that has completed generation (i.e., `outputS3Key` is set in the database)
- [ ] The completed job's `<jobId>` is known for use in test URLs
- [ ] User is logged in to the app (all editor routes are behind `ProtectedRoute`)
- [ ] Note: `fetchOutputText` calls `GET /jobs/:id/output` which returns `{ "url": "presigned-s3-url" }` as JSON. The editor will load this JSON string as its initial text content — this is a known current limitation; proper DOCX→HTML seeding is deferred to TASK-067.

---

## Test Cases

### UAT-UI-001: EditorPage Route Is Registered and Renders
- **Page**: `http://localhost:5173/jobs/<jobId>/editor`
- **Description**: Verifies the `/jobs/:id/editor` route is registered in the React Router config and the EditorPage component mounts without crashing.
- **Steps**:
  1. Log in to the app.
  2. Navigate directly to `http://localhost:5173/jobs/<jobId>/editor` in the browser.
  3. Observe the page title and heading.
- **Expected Result**: The page loads (no blank screen, no 404). The heading `Edit Demand Letter` (h1) is visible once loading completes.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-002: Loading Spinner Shown While Fetching Output
- **Page**: `http://localhost:5173/jobs/<jobId>/editor`
- **Description**: Verifies that a loading indicator is displayed while `fetchOutputText` is in flight.
- **Steps**:
  1. Open browser DevTools → Network tab. Apply a slow-network throttle (e.g. "Slow 3G") to extend the fetch duration.
  2. Navigate to `http://localhost:5173/jobs/<jobId>/editor`.
  3. Observe the page before the network request completes.
- **Expected Result**: A spinner (animated SVG) and the text `Loading document…` are visible while the fetch is pending.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-003: Editor Content Loaded After Fetch Completes
- **Page**: `http://localhost:5173/jobs/<jobId>/editor`
- **Description**: Verifies that after `fetchOutputText` resolves, the response text is loaded as TipTap editor content.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/editor`.
  2. Wait for the loading spinner to disappear.
  3. Inspect the DOM using DevTools: confirm a `.tiptap-editor` div is present containing a `.ProseMirror` element.
  4. Confirm the `.ProseMirror` element has non-empty text content (the JSON response `{"url":"..."}` or actual text).
- **Expected Result**: The `div.tiptap-editor` wrapper and its `.ProseMirror` child are both present in the DOM. The `.ProseMirror` element contains text (not empty). The loading spinner is gone.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-004: TipTap Editor Is Editable
- **Page**: `http://localhost:5173/jobs/<jobId>/editor`
- **Description**: Verifies that the TipTap editor accepts keyboard input after content is loaded.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/editor` and wait for loading to complete.
  2. Click anywhere inside the editor area (`.tiptap-editor` div).
  3. Press `Ctrl+A` (or `Cmd+A`) to select all, then type `Hello UAT`.
  4. Observe the editor content.
- **Expected Result**: The text `Hello UAT` appears in the editor, replacing the previous content. The editor is in a focused/active state (the indigo border focus ring is visible around the `.ProseMirror` element).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-005: "Open in Editor" Button Visible After Generation Completes
- **Page**: `http://localhost:5173/jobs/<jobId>/generate`
- **Description**: Verifies that the "Open in Editor" button appears on GeneratePage only after `isDone` is true (generation has finished streaming).
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/generate` for a job that has not yet been generated in this session (so `isDone` starts false).
  2. Confirm the "Open in Editor" button is NOT visible before clicking Generate.
  3. Click the `Generate Demand Letter` button and wait for streaming to complete (the spinner stops and the "Download DOCX" and "Open in Editor" buttons appear).
  4. Observe the button area below the generated output.
- **Expected Result**: Before generation: no "Open in Editor" button is visible. After generation completes: a purple button labelled `Open in Editor` appears alongside the `Download DOCX` button.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-006: "Open in Editor" Button Navigates to Editor Route
- **Page**: `http://localhost:5173/jobs/<jobId>/generate`
- **Description**: Verifies that clicking "Open in Editor" navigates the browser to `/jobs/:id/editor`.
- **Steps**:
  1. Complete generation on the GeneratePage (or navigate to one where `isDone` is true after a page reload that restores done state — or re-trigger generation).
  2. Click the purple `Open in Editor` button.
  3. Observe the browser URL bar and page content.
- **Expected Result**: The browser URL changes to `http://localhost:5173/jobs/<jobId>/editor` and the EditorPage loads (heading `Edit Demand Letter` visible).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-007: TipTap CSS Styles Applied to Editor Area
- **Page**: `http://localhost:5173/jobs/<jobId>/editor`
- **Description**: Verifies that the `index.css` styles for `.tiptap-editor .ProseMirror` are applied correctly — border, padding, and min-height visible.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/editor` and wait for loading to complete.
  2. Open DevTools → Elements tab. Select the `.ProseMirror` element inside `.tiptap-editor`.
  3. In the Computed Styles panel, check:
     - `border`: `1px solid rgb(209, 213, 219)` (i.e., `#d1d5db`)
     - `border-radius`: `0.375rem` (6px)
     - `padding`: `1rem` (16px)
     - `min-height`: `400px`
     - `outline`: `none` (no focus outline from browser default)
  4. Click into the editor to give it focus, then re-check `border-color` in Computed Styles.
- **Expected Result**: All five CSS properties from step 3 match. On focus, `border-color` changes to `rgb(99, 102, 241)` (`#6366f1`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-EDGE-001: Error State Shown for Non-Existent Job ID
- **Page**: `http://localhost:5173/jobs/nonexistent-job-id-00000/editor`
- **Description**: Verifies that when `fetchOutputText` receives a non-OK HTTP response (404 job not found), the error state is rendered instead of crashing.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/nonexistent-job-id-00000/editor`.
  2. Wait for the network request to `GET /jobs/nonexistent-job-id-00000/output` to complete (check DevTools Network tab — expect a 404 response).
  3. Observe the page content.
- **Expected Result**: The loading spinner disappears. Red error text is displayed, beginning with `Error:` (e.g. `Error: Failed to fetch output: Not Found`). No crash or blank page. The `.tiptap-editor` element is NOT present in the DOM.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-EDGE-002: "Open in Editor" Button Absent Before Generation
- **Page**: `http://localhost:5173/jobs/<jobId>/generate`
- **Description**: Verifies that the "Open in Editor" button is not rendered when `isDone` is false (generation has not started or is in progress).
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/generate` for a job that has not been generated yet (gap report shows no gaps so the Generate button is enabled).
  2. Without clicking Generate, inspect the page for any button labelled "Open in Editor".
  3. Begin generation (click Generate) and inspect during the streaming phase.
- **Expected Result**: "Open in Editor" is absent both before generation starts and during the streaming phase. It only appears after generation is fully complete (`isDone = true`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

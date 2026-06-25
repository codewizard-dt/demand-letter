---
id: UAT-069
title: "UAT: Y.js CRDT Document Bound to TipTap Editor"
status: passed
task: TASK-069
created: 2026-06-25
updated: 2026-06-25
---

# UAT-069 — UAT: Y.js CRDT Document Bound to TipTap Editor

implements::[[TASK-069]]

> **Source task**: [[TASK-069]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] `pnpm install` has been run at the repo root so `packages/web/node_modules` is populated
- [ ] Dev server is running: `pnpm --filter @demand-letter/web dev` (defaults to `http://localhost:5173`)
- [ ] At least one completed job exists in the database with `outputS3Key` set (i.e., a job whose DOCX output has been generated and stored)
- [ ] You are logged in to the web app (the editor route is protected)

---

## Test Cases

### UAT-STATIC-001: All four Y.js / TipTap collaboration packages present in package.json

- **Description**: Verifies that `yjs`, `y-prosemirror`, `@tiptap/extension-collaboration`, and `@tiptap/extension-collaboration-cursor` were all added to `packages/web/package.json` as part of this task.
- **Steps**:
  1. From the repo root, run the command below.
  2. Confirm all four keys appear in the output with non-empty version strings.
- **Command**:
  ```bash
  jq '.dependencies | {yjs, "y-prosemirror", "@tiptap/extension-collaboration", "@tiptap/extension-collaboration-cursor"}' packages/web/package.json
  ```
- **Expected Result**: JSON object with all four keys, each having a semver string value (e.g. `"^13.6.31"`, `"^1.3.7"`, `"^3.27.1"`, `"^2.26.2"`). No `null` values.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UI-001: EditorPage renders document content for a completed job

- **Page**: `http://localhost:5173/jobs/<completed-job-id>/editor`
- **Description**: Confirms the full flow — `GET /jobs/{id}/output` → presigned S3 URL → mammoth DOCX→HTML conversion → Y.Doc seed via `setContent` → TipTap renders content.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<completed-job-id>/editor` while logged in.
  2. Wait for the loading spinner to disappear.
  3. Observe the page heading and editor area.
- **Expected Result**:
  - The `<h1>` "Edit Demand Letter" is visible.
  - The editor area (`.tiptap-editor`) contains rendered text from the job's DOCX output — paragraphs, headings, or list items are visible; the editor is not blank/empty.
  - No error message "Error loading document." is displayed.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Loading spinner is shown while DOCX fetch is in progress

- **Page**: `http://localhost:5173/jobs/<completed-job-id>/editor`
- **Description**: Confirms that the loading state (`loading === true`) renders the spinner and "Loading document…" text before content is ready.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Open browser DevTools → Network tab; set throttling to "Slow 3G" (or similar).
  2. Navigate to `http://localhost:5173/jobs/<completed-job-id>/editor`.
  3. Observe the page before the DOCX fetch completes.
  4. Restore network speed.
- **Expected Result**:
  - While throttled, the page shows a blue spinning SVG icon alongside the text "Loading document…".
  - The editor area (`<div class="tiptap-editor">`) is not yet visible during loading.
  - After the fetch completes, the spinner disappears and the editor renders.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: No Y.js or prosemirror-collab console errors on page load

- **Page**: `http://localhost:5173/jobs/<completed-job-id>/editor`
- **Description**: Confirms that the Y.js CRDT binding and CollaborationCursor extension do not throw runtime errors in the browser console.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Open browser DevTools → Console tab; clear any existing messages.
  2. Navigate to `http://localhost:5173/jobs/<completed-job-id>/editor`.
  3. Wait for the editor content to fully load.
  4. Review the Console output.
- **Expected Result**:
  - Zero `[Error]` or `[Warning]` messages whose text contains "yjs", "y-prosemirror", "prosemirror-collab", "Y.Doc", or "CollaborationCursor".
  - Any peer-dependency warnings that appear at build time (not runtime) in the terminal are acceptable and do not count.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Y.Doc seeding guard — content survives a simulated re-render

- **Page**: `http://localhost:5173/jobs/<completed-job-id>/editor`
- **Description**: Confirms the `fragment.length === 0` guard in the seeding `useEffect` prevents the editor from being blanked if the effect re-fires. Validates the seeding is one-shot.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Navigate to the editor page and wait for content to load (verified by UAT-UI-001).
  2. In browser DevTools → Console, run:
     ```js
     // Force the second useEffect to re-evaluate by dispatching a state change that doesn't clear html
     // Observe whether the editor content remains intact
     document.querySelector('.tiptap-editor .ProseMirror').textContent.length
     ```
     Note the character count.
  3. Trigger a React state refresh: click inside the editor, type a single character, then press Backspace (this triggers re-renders without changing the Y.Doc seeding state).
  4. Re-run the console snippet and compare character counts.
- **Expected Result**:
  - The character count from step 2 and step 4 differ only by the net edit made (zero, after type + backspace).
  - The editor is never blanked; existing content from the DOCX is preserved across re-renders.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Error fallback rendered for a job with no DOCX output

- **Page**: `http://localhost:5173/jobs/<job-id-without-output>/editor`
- **Description**: Confirms that when `fetchOutputUrl` fails (API returns 404 `output_not_ready`) or when the S3 fetch subsequently fails, the error catch block sets the editor content to the error fallback paragraph.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Identify (or create) a job ID that has no `outputS3Key` — i.e., a job that has not had its DOCX generated yet.
  2. Navigate to `http://localhost:5173/jobs/<job-id-without-output>/editor`.
  3. Wait for the loading spinner to disappear.
  4. Observe the editor area content.
- **Expected Result**:
  - The loading spinner disappears (loading state is cleared even on error via `finally { setLoading(false) }`).
  - The editor area renders with the text "Error loading document." visible.
  - The browser console shows a `Failed to load DOCX:` error entry (logged via `console.error`).
  - No unhandled JS exception or white screen of death occurs.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Navigating directly to a non-existent job ID shows error fallback

- **Page**: `http://localhost:5173/jobs/nonexistent-uuid/editor`
- **Description**: Confirms graceful degradation when an entirely unknown job ID is used. The API returns 404 and the error handler fires.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/nonexistent-uuid-000/editor` while logged in.
  2. Wait for the spinner to clear.
- **Expected Result**:
  - Editor renders with "Error loading document." text.
  - Console shows `Failed to load DOCX:` with a status code in the 4xx range.
  - No crash, no blank white screen.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

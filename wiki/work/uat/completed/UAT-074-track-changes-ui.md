---
id: UAT-074
title: "UAT: Track-changes view in UI: toggle insertions/deletions with author and timestamp tooltip"
status: pending
task: TASK-074
created: 2026-06-25
updated: 2026-06-25
---

# UAT-074 — UAT: Track-Changes View in UI

implements::[[TASK-074]]

> **Source task**: [[TASK-074]]
> **Generated**: 2026-06-25

Tests verify: `TrackInsert` / `TrackDelete` mark definitions, `TrackChangesToolbar` component structure, CSS classes for track-change marks, `DELETE /jobs/{id}/changes/{changeId}` API endpoint and SAM registration, `deleteJobChange` client helper, `EditorPage` wiring, and the end-to-end toggle + accept/reject UI flow.

---

## Prerequisites

- [ ] Repository root; build run at least once (`pnpm build`)
- [ ] For API tests: SAM local API running on port 3000 (`sam local start-api --port 3000` with `DATABASE_URL` set), or a deployed stack with `$UAT_API_BASE` pointing at `https://<api-id>.execute-api.<region>.amazonaws.com/prod`
- [ ] A job with a known ID exists in the database; set `$UAT_JOB_ID` to that value
- [ ] For DELETE API tests: a known `CollaborativeChange` row exists for `$UAT_JOB_ID`; set `$UAT_CHANGE_ID` to its `id`
- [ ] No auth headers required for local SAM tests

---

## Test Cases

### UAT-STATIC-001: `trackChangeMarks.ts` exports `TrackInsert` and `TrackDelete`

- **Description**: Verifies both TipTap mark objects are exported from the marks file so they can be registered as editor extensions.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'export const TrackInsert\|export const TrackDelete' packages/web/src/lib/editor/trackChangeMarks.ts
  ```
- **Expected Result**: Output contains both `export const TrackInsert` and `export const TrackDelete`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: `TrackInsert` mark includes `changeId`, `userName`, `createdAt` attributes

- **Description**: Verifies the insert mark carries the three metadata attributes needed to render tooltip content and match a `CollaborativeChange` record.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'changeId\|userName\|createdAt' packages/web/src/lib/editor/trackChangeMarks.ts
  ```
- **Expected Result**: Output includes `changeId`, `userName`, and `createdAt` (each appearing at least once inside the marks file, used as attribute keys).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: `TrackChangesToolbar` component exports the function with correct props interface

- **Description**: Verifies the component file exists and defines `TrackChangesToolbarProps` with `editor`, `jobId`, `enabled`, and `onToggle`.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'editor\|jobId\|enabled\|onToggle' packages/web/src/components/TrackChangesToolbar.tsx | head -10
  ```
- **Expected Result**: Output contains all four prop names within the file (from the interface declaration).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: CSS classes `.track-insert` and `.track-delete` exist in `index.css`

- **Description**: Verifies the visual mark styles were added to the global stylesheet.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep '\.track-insert\|\.track-delete' packages/web/src/index.css
  ```
- **Expected Result**: Output contains at least `.track-insert` and `.track-delete` class selectors.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: `.track-insert` uses green underline and `.track-delete` uses red strikethrough

- **Description**: Verifies the CSS values implement the visual specification: green underline for insertions and red strikethrough for deletions.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep -A 5 '\.track-insert\b' packages/web/src/index.css | head -8
  ```
- **Expected Result**: Output includes `text-decoration: underline` and a green color value (e.g. `#16a34a`).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-006: `template.yaml` registers `DELETE /jobs/{id}/changes/{changeId}`

- **Description**: Verifies the SAM template wires up the delete endpoint so API Gateway routes `DELETE /jobs/{id}/changes/{changeId}` to `delete-jobs-changes.handler`.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep -A 5 'DeleteJobsChangesApi' template.yaml
  ```
- **Expected Result**: Output contains `Path: /jobs/{id}/changes/{changeId}` and `Method: delete`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-007: `deleteJobChange` helper exported from `packages/web/src/lib/api.ts`

- **Description**: Verifies the client-side helper that calls `DELETE /jobs/:id/changes/:changeId` was added to the API layer.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'deleteJobChange' packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output shows an `export async function deleteJobChange` declaration and a `fetch(` call targeting the delete endpoint.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-008: `EditorPage` registers `TrackInsert` and `TrackDelete` as extensions

- **Description**: Verifies the editor extensions array in `EditorPage.tsx` includes both marks so ProseMirror can parse and render them.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  grep 'TrackInsert\|TrackDelete' packages/web/src/pages/EditorPage.tsx
  ```
- **Expected Result**: Output shows both `TrackInsert` and `TrackDelete` referenced inside the file (import + extensions array).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-009: `delete-jobs-changes.js` build artifact is emitted

- **Description**: Verifies the esbuild pipeline produces `.build/handlers/delete-jobs-changes.js`.
- **Steps**:
  1. From the repository root, run the command below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api build && test -f .build/handlers/delete-jobs-changes.js && echo "artifact: present"
  ```
- **Expected Result**: Build exits 0; final line is `artifact: present`.
- [FAIL: auto-judge: artifact absent — `delete-jobs-changes.ts` is not included in the `packages/api/package.json` build script; `.build/handlers/delete-jobs-changes.js` does not exist after `pnpm build`] <!-- 2026-06-25 -->

---

### UAT-API-001: `DELETE /jobs/{id}/changes/{changeId}` returns 204 on success

- **Endpoint**: `DELETE /jobs/{id}/changes/{changeId}`
- **Description**: Verifies the happy-path delete — handler removes the record and returns HTTP 204 with an empty body.
- **Steps**:
  1. Ensure `$UAT_API_BASE`, `$UAT_JOB_ID`, and `$UAT_CHANGE_ID` are set.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}" -X DELETE "${UAT_API_BASE}/jobs/${UAT_JOB_ID}/changes/${UAT_CHANGE_ID}"
  ```
- **Expected Result**: Output is `204`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE, UAT_JOB_ID, and UAT_CHANGE_ID unset] <!-- 2026-06-25 -->

---

### UAT-API-002: `DELETE /jobs/{id}/changes/{changeId}` — missing changeId returns 400

- **Endpoint**: `DELETE /jobs/{id}/changes/{changeId}`
- **Description**: Verifies the handler returns 400 with an error message when the `changeId` path parameter is absent.
- **Steps**:
  1. Ensure `$UAT_API_BASE` and `$UAT_JOB_ID` are set.
  2. Attempt a DELETE at a path with no changeId segment.
- **Command**:
  ```bash
  curl -sS -w "\n%{http_code}" -X DELETE "${UAT_API_BASE}/jobs/${UAT_JOB_ID}/changes/"
  ```
- **Expected Result**: HTTP 400; response body contains `"Missing job id or change id"`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE and UAT_JOB_ID unset] <!-- 2026-06-25 -->

---

### UAT-API-003: `GET /jobs/{id}/changes` returns 200 with `changes` array

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Verifies the list endpoint (added in TASK-073, consumed by this task's toolbar) returns the expected shape used to populate the toolbar's change list.
- **Steps**:
  1. Ensure `$UAT_API_BASE` and `$UAT_JOB_ID` are set.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "${UAT_API_BASE}/jobs/${UAT_JOB_ID}/changes" | jq 'has("changes")'
  ```
- **Expected Result**: Output is `true`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_API_BASE and UAT_JOB_ID unset] <!-- 2026-06-25 -->

---

### UAT-UI-001: Track Changes toggle button renders on the editor page

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies `TrackChangesToolbar` is mounted above `EditorContent` and the "Track Changes" button is visible.
- **Steps**:
  1. Start the local dev server (`pnpm dev`).
  2. Navigate to `http://localhost:5173/jobs/<valid-job-id>/editor`.
  3. Observe the toolbar area above the editor.
- **Expected Result**: A button labelled "Track Changes" is visible with a gray/inactive style (gray background, dark text).
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-002: Enabling Track Changes fetches changes and shows count badge

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies clicking "Track Changes" triggers the API fetch, shows a "Loading…" badge briefly, then a count badge (e.g. "3 changes").
- **Steps**:
  1. Navigate to the editor page for a job with existing `CollaborativeChange` records.
  2. Click the "Track Changes" button.
  3. Observe the badge next to the button.
- **Expected Result**: Button turns blue (`bg-blue-600`); a count badge appears (e.g. "2 changes" or "1 change"). A list of change rows appears below the toolbar button.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-003: Insertion marks render with green underline style

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies that text spans marked as `trackInsert` receive the `.track-insert` CSS class, which applies a green underline and light green background.
- **Steps**:
  1. With Track Changes enabled (see UAT-UI-002), locate an "insert" change in the list.
  2. Observe the corresponding text range in the editor.
- **Expected Result**: The inserted text is displayed with a green underline (`text-decoration-color: #16a34a`) and a light green background tint.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-004: Deletion marks render with red strikethrough style

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies that text spans marked as `trackDelete` receive the `.track-delete` CSS class, applying red strikethrough text and light red background.
- **Steps**:
  1. With Track Changes enabled, locate a "delete" change in the list.
  2. Observe the corresponding text range in the editor.
- **Expected Result**: The deleted text is displayed with a red strikethrough and red text color (`#dc2626`) against a light red background.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-005: Hovering over a track-change span shows author and timestamp tooltip

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies that the tooltip (via `title` attribute or tippy.js) shows the author name and formatted timestamp when hovering over a marked span.
- **Steps**:
  1. With Track Changes enabled and marks visible in the editor.
  2. Hover the mouse over a green-underlined or red-strikethrough span.
  3. Observe the tooltip / title popup.
- **Expected Result**: Tooltip text shows the author's name and the change timestamp (e.g. "Jane Smith · Jun 25, 2:14 pm" or similar locale-formatted datetime).
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-006: Accept button removes the mark and calls DELETE on the change record

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies that clicking "Accept" on an insert change removes the `trackInsert` mark from the editor (text is retained, mark is gone) and removes the change row from the toolbar list.
- **Steps**:
  1. With Track Changes enabled and at least one "insert" change visible.
  2. Click the green "Accept" button next to an insert change.
  3. Observe the editor and the change list.
- **Expected Result**: The green underline mark disappears from the corresponding text (text is still present). The accepted change row is removed from the toolbar list. A `DELETE` request to `/jobs/:id/changes/:changeId` fires (check DevTools → Network).
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-007: Reject button removes inserted text and calls DELETE on the change record

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies that clicking "Reject" on an insert change deletes the inserted text from the editor and removes the change row from the toolbar list.
- **Steps**:
  1. With Track Changes enabled and at least one "insert" change visible.
  2. Note the inserted text in the editor.
  3. Click the "Reject" button next to the insert change.
  4. Observe the editor and the change list.
- **Expected Result**: The inserted text is removed from the editor. The rejected change row disappears from the toolbar list. A `DELETE` request fires to clean up the DB record.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-008: Disabling Track Changes removes all marks from the editor

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies that toggling "Track Changes" off clears all `trackInsert` and `trackDelete` marks and hides the change list.
- **Steps**:
  1. With Track Changes enabled and marks visible.
  2. Click the "Track Changes" button again to toggle it off.
  3. Observe the editor content and toolbar area.
- **Expected Result**: All green underlines and red strikethroughs are removed from the editor. The change list disappears. The button returns to its gray/inactive style.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

---

### UAT-UI-009: Empty state shows "No tracked changes for this job."

- **Page**: `/jobs/<valid-job-id>/editor`
- **Description**: Verifies the empty-state message is shown when Track Changes is enabled but the job has no `CollaborativeChange` records.
- **Steps**:
  1. Navigate to the editor for a job with no collaborative change records.
  2. Click "Track Changes" to enable the mode.
  3. Wait for the loading badge to resolve.
- **Expected Result**: The badge shows "0 changes" and the text "No tracked changes for this job." appears below the toolbar button in italicized gray text.
- [FAIL: auto-judge: UI test requires human verification] <!-- 2026-06-25 -->

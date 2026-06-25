---
id: UAT-081
title: "UAT: Verify track-changes view shows each edit with correct author and timestamp"
status: pending
task: TASK-081
created: 2026-06-25
updated: 2026-06-25
---

# UAT-081 — UAT: Verify track-changes view shows each edit with correct author and timestamp

implements::[[TASK-081]]

> **Source task**: [[TASK-081]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Local dev stack is running (`pnpm dev` or SAM local) with the API reachable at `http://localhost:3000`
- [ ] A job record exists in the database (note its `id` as `$JOB_ID`)
- [ ] At least one `CollaborativeChange` row exists for that job (fields: `id`, `userId`, `userName`, `operationType`, `contentDelta`, `createdAt`)
- [ ] The web app is running at `http://localhost:5173`
- [ ] You are logged in as an authenticated user with access to the job

---

## Test Cases

### UAT-API-001: GET /jobs/:id/changes returns 200 with userName and createdAt fields

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Confirms the changes endpoint returns the full shape including `userName` and `createdAt` per `CollaborativeChange` row, ordered ascending by `createdAt`.
- **Steps**:
  1. Export `JOB_ID` to your shell: `export JOB_ID=<your-job-id>`
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID/changes" | jq '.changes[0] | {id, userName, createdAt, operationType}'
  ```
- **Expected Result**: HTTP 200. The printed object contains non-empty `userName` (string) and `createdAt` (ISO datetime string), e.g.:
  ```json
  {
    "id": "<cuid>",
    "userName": "Alice Smith",
    "createdAt": "2026-06-25T10:00:00.000Z",
    "operationType": "insert"
  }
  ```
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID not set; no job record or CollaborativeChange data available] <!-- 2026-06-25 -->

---

### UAT-API-002: GET /jobs/:id/changes returns 400 when job id path param is absent

- **Endpoint**: `GET /jobs//changes`
- **Description**: Confirms the handler returns 400 when the `id` path parameter is missing.
- **Steps**:
  1. Invoke the endpoint with an empty job-id segment
- **Command**:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}" "http://localhost:3000/jobs//changes"
  ```
- **Expected Result**: HTTP 400 (or a gateway-level 403/404 if API Gateway rejects the empty segment before the Lambda runs — either non-200 response is acceptable; a 200 is a failure).
- [FAIL: auto-judge: prerequisite not satisfied — auth session unverifiable; server returned 403 on probe suggesting auth gate blocks execution] <!-- 2026-06-25 -->

---

### UAT-API-003: GET /jobs/:id/changes returns empty array for job with no changes

- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Confirms the handler returns `{ changes: [] }` (not an error) when the job exists but has no `CollaborativeChange` rows.
- **Steps**:
  1. Export a job id that has no `CollaborativeChange` rows: `export EMPTY_JOB_ID=<job-with-no-changes>`
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$EMPTY_JOB_ID/changes" | jq '.changes | length'
  ```
- **Expected Result**: HTTP 200. Printed value is `0`.
- [FAIL: auto-judge: prerequisite not satisfied — $EMPTY_JOB_ID not set; no job record available] <!-- 2026-06-25 -->

---

### UAT-UI-001: Track Changes button enables the toolbar and loads the change list

- **Page**: `/jobs/:id/editor`
- **Description**: Confirms clicking "Track Changes" transitions the toolbar to enabled state and triggers the fetch of `CollaborativeChange` rows.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/editor`
  2. Locate the `TrackChangesToolbar` panel (visible below or beside the editor)
  3. Click the **Track Changes** button (currently styled with gray background)
  4. Observe the button appearance and the badge that appears next to it
- **Expected Result**:
  - The button background changes to blue (`bg-blue-600 text-white`)
  - A badge appears showing `N change(s)` (e.g., `"1 change"` or `"3 changes"`) — not `"0 changes"` if there are records in the DB
  - A list of change rows appears below the toolbar header, one row per `CollaborativeChange`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Change list renders author name and human-readable timestamp — not raw ISO string

- **Page**: `/jobs/:id/editor`
- **Description**: Confirms each change row displays `{userName}` in bold and a human-readable (locale-formatted) timestamp, not a raw ISO-8601 string.
- **Steps**:
  1. With Track Changes enabled (see UAT-UI-001), inspect the change list
  2. Find the `{userName}` part in a list row — it should match the `userName` value stored in the DB
  3. Find the timestamp string rendered next to the `·` separator
- **Expected Result**:
  - The `userName` is displayed exactly as stored (e.g., `"Alice Smith"`)
  - The timestamp is locale-formatted — it looks like `"6/25/2026, 10:00:00 AM"` (or locale equivalent), NOT a raw ISO string like `"2026-06-25T10:00:00.000Z"`
  - The separator between the two is `·` (middle dot)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Editor marks carry data-user-name and data-created-at HTML attributes in human-readable format

- **Page**: `/jobs/:id/editor`
- **Description**: Confirms that when Track Changes is enabled, the ProseMirror/TipTap editor renders tracked spans with `data-user-name` and `data-created-at` HTML attributes — and that `data-created-at` is the locale string, not a raw ISO string.
- **Steps**:
  1. With Track Changes enabled and at least one change applied to the editor text, open browser DevTools (Inspect Element)
  2. Click on a highlighted insert (green underline) or delete (red strikethrough) span in the editor
  3. Inspect its HTML attributes in the Elements panel
- **Expected Result**:
  - The span has `class="track-insert"` (for insertions) or `class="track-delete"` (for deletions)
  - `data-user-name` attribute is present and non-empty (matches the author's name)
  - `data-created-at` attribute is present and contains a human-readable date string (e.g., `"6/25/2026, 10:00:00 AM"`), NOT a raw ISO string
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Toggling Track Changes off removes the change list and all editor marks

- **Page**: `/jobs/:id/editor`
- **Description**: Confirms that clicking "Track Changes" a second time (off) clears both the visible change list and all `trackInsert`/`trackDelete` marks from the editor.
- **Steps**:
  1. With Track Changes enabled (see UAT-UI-001), note the change list and the highlighted spans in the editor
  2. Click the **Track Changes** button again to toggle off
  3. Inspect the toolbar and the editor text
- **Expected Result**:
  - The button returns to gray styling (`bg-gray-100 text-gray-700`)
  - The change list disappears (no `<li>` rows visible)
  - The count badge disappears
  - The green underline and red strikethrough marks are removed from the editor text (no `.track-insert` or `.track-delete` spans in the DOM)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Change list shows "No tracked changes" empty state when job has no CollaborativeChange rows

- **Scenario**: Track Changes is toggled on for a job with no `CollaborativeChange` rows
- **Steps**:
  1. Navigate to `/jobs/$EMPTY_JOB_ID/editor` (a job with zero `CollaborativeChange` rows)
  2. Click **Track Changes** to enable
  3. Wait for the loading state to resolve
- **Expected Result**:
  - The badge shows `"0 changes"`
  - The empty-state message `"No tracked changes for this job."` appears (italic gray text below the toolbar header)
  - No change list rows are rendered
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Tooltip cursor-help indicator is present on tracked spans (CSS only)

- **Scenario**: `.track-insert[data-user-name]` and `.track-delete[data-user-name]` elements should have `cursor: help` styling applied
- **Steps**:
  1. With Track Changes enabled and marks applied, hover the mouse cursor over a tracked-change span in the editor
  2. Observe the cursor shape
- **Expected Result**: The cursor changes to the help cursor (question mark) when hovering over a tracked span, confirming the CSS rule `.track-insert[data-user-name] { cursor: help }` is applied.
- **Gap note**: No CSS tooltip (`::after` content) or HTML `title` attribute is implemented. The task objective mentions a tooltip showing `{userName} · {formattedTimestamp}` on hover, but the current implementation only applies `cursor: help` styling. A browser-native tooltip is not present. This test only validates the `cursor: help` CSS behavior; the full tooltip requirement is unimplemented.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

## Gaps

The following behavioral requirement from the task objective cannot be fully verified because the implementation is absent:

- **Tooltip content on hover**: The task states "the tooltip on hover displays `{userName} · {formattedTimestamp}`". The `renderHTML` in `trackChangeMarks.ts` emits `data-user-name` and `data-created-at` HTML attributes, and the CSS sets `cursor: help`, but no tooltip text is rendered (no `title` attribute, no CSS `content: attr(...)` pseudo-element). UAT-EDGE-002 partially covers this gap by verifying the CSS cursor behavior.

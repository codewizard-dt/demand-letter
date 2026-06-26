---
id: UAT-082
title: "UAT: Verify accept/reject individual changes correctly updates document state"
status: pending
task: TASK-082
created: 2026-06-25
updated: 2026-06-25
---

# UAT-082 — UAT: Verify accept/reject individual changes correctly updates document state

implements::[[TASK-082]]

> **Source task**: [[TASK-082]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Local stack running: `sam local start-api` (API on `http://localhost:3000`) and `pnpm --filter web dev` (UI on `http://localhost:5173`)
- [ ] A job exists with at least one `CollaborativeChange` row of `operationType = 'insert'` in the database — note its `id` (JOB_ID) and the change `id` (CHANGE_ID_INSERT)
- [ ] A job exists with at least one `CollaborativeChange` row of `operationType = 'delete'` — note its change `id` (CHANGE_ID_DELETE)
- [ ] A second valid job ID exists with no relation to CHANGE_ID_INSERT — note it as JOB_ID_OTHER
- [ ] A nonexistent change UUID ready for 404 test — use `00000000-0000-0000-0000-000000000000`
- [ ] Shell variables set: `export JOB_ID=<id> CHANGE_ID_INSERT=<id> CHANGE_ID_DELETE=<id> JOB_ID_OTHER=<other-job-id>`

---

## Test Cases

### UAT-API-001: DELETE change — happy path returns 200 `{ ok: true }`
- **Endpoint**: `DELETE /jobs/{id}/changes/{changeId}`
- **Description**: Verifies the handler deletes an existing `CollaborativeChange` row that belongs to the specified job and returns `{ ok: true }`.
- **Steps**:
  1. Ensure the `CHANGE_ID_INSERT` change exists (run `GET /jobs/$JOB_ID/changes` to confirm it appears).
  2. Run the DELETE command below.
- **Command**:
  ```bash
  curl -sS -X DELETE "http://localhost:3000/jobs/$JOB_ID/changes/$CHANGE_ID_INSERT"
  ```
- **Expected Result**: HTTP 200 with body `{"ok":true}`. On a subsequent `GET /jobs/$JOB_ID/changes`, the deleted change ID must no longer appear in the `changes` array.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID, CHANGE_ID_INSERT not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-002: DELETE non-existent change ID returns 404
- **Endpoint**: `DELETE /jobs/{id}/changes/{changeId}`
- **Description**: Verifies a 404 error is returned when the `changeId` does not exist in the database.
- **Steps**:
  1. Run the command below using the sentinel UUID.
- **Command**:
  ```bash
  curl -sS -X DELETE "http://localhost:3000/jobs/$JOB_ID/changes/00000000-0000-0000-0000-000000000000"
  ```
- **Expected Result**: HTTP 404 with body `{"error":"change_not_found","message":"The requested change does not exist."}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-003: DELETE change belonging to a different job returns 403
- **Endpoint**: `DELETE /jobs/{id}/changes/{changeId}`
- **Description**: Verifies a 403 error is returned when the `changeId` exists but belongs to a different job than the path's `{id}`.
- **Steps**:
  1. Ensure `CHANGE_ID_DELETE` belongs to `JOB_ID`, not `JOB_ID_OTHER`.
  2. Run the command below using the mismatched job ID.
- **Command**:
  ```bash
  curl -sS -X DELETE "http://localhost:3000/jobs/$JOB_ID_OTHER/changes/$CHANGE_ID_DELETE"
  ```
- **Expected Result**: HTTP 403 with body `{"error":"change_job_mismatch","message":"This change does not belong to the specified job."}`. The change row must still exist in the database.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID_OTHER, CHANGE_ID_DELETE not set in environment] <!-- 2026-06-25 -->

---

### UAT-UI-001: Accept an insert change — text retained, mark removed, change disappears from list
- **Page**: `http://localhost:5173/jobs/<JOB_ID>/editor`
- **Description**: Verifies that accepting a `trackInsert` change removes the green-underline mark while keeping the inserted text permanently in the document, and removes the change entry from the toolbar list.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<JOB_ID>/editor`.
  2. Click the **Track Changes** toggle button to enable Track Changes (button turns blue).
  3. Confirm the change list loads and shows at least one entry with an `insert` (green) badge.
  4. Note the text content of that insert change.
  5. Click **Accept** on the insert change.
  6. Observe the editor document.
  7. Observe the change list.
- **Expected Result**: The green-underline (`trackInsert`) mark is removed from the text; the text itself remains present and unformatted. The accepted change entry disappears from the toolbar list. No error message appears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Reject an insert change — inserted text removed from document
- **Page**: `http://localhost:5173/jobs/<JOB_ID>/editor`
- **Description**: Verifies that rejecting a `trackInsert` change deletes the inserted text from the document entirely and removes the change entry from the toolbar list.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<JOB_ID>/editor` (ensure a fresh insert change exists — may need to re-seed after UAT-UI-001).
  2. Enable Track Changes.
  3. Identify an insert change and note the inserted text.
  4. Click **Reject** on the insert change.
  5. Observe the editor document.
  6. Observe the change list.
- **Expected Result**: The inserted text is no longer present in the document at all. The rejected change entry disappears from the toolbar list. No error message appears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Accept a delete change — struck-through text permanently removed
- **Page**: `http://localhost:5173/jobs/<JOB_ID>/editor`
- **Description**: Verifies that accepting a `trackDelete` change permanently removes the struck-through (red-strikethrough) text from the document.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<JOB_ID>/editor` (ensure a delete change exists).
  2. Enable Track Changes.
  3. Identify a `delete` (red badge) change showing struck-through text in the editor.
  4. Click **Accept** on the delete change.
  5. Observe the editor document.
  6. Observe the change list.
- **Expected Result**: The text that had the red strikethrough is permanently deleted from the document — neither the text nor the strikethrough mark remains. The accepted change entry disappears from the toolbar list. No error message appears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Reject a delete change — struck-through text restored to normal
- **Page**: `http://localhost:5173/jobs/<JOB_ID>/editor`
- **Description**: Verifies that rejecting a `trackDelete` change restores the marked text to normal (removes the strikethrough mark, keeps the text editable).
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<JOB_ID>/editor` (ensure a delete change exists).
  2. Enable Track Changes.
  3. Identify a `delete` (red badge) change showing struck-through text in the editor.
  4. Click **Reject** on the delete change.
  5. Observe the editor document.
  6. Observe the change list.
- **Expected Result**: The struck-through text is restored to normal — the text is present with no strikethrough mark and is editable. The rejected change entry disappears from the toolbar list. No error message appears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-API-004: GET /jobs/:id/changes confirms deletion after accept/reject
- **Endpoint**: `GET /jobs/{id}/changes`
- **Description**: Verifies that after a successful accept or reject, the API confirms the `CollaborativeChange` row no longer exists.
- **Steps**:
  1. Complete UAT-API-001 (DELETE succeeds for `CHANGE_ID_INSERT`).
  2. Run the GET command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID/changes" | jq '.changes | map(.id)'
  ```
- **Expected Result**: HTTP 200; the returned array of change IDs does **not** include `$CHANGE_ID_INSERT`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Track Changes toolbar shows error when DELETE API fails
- **Page**: `http://localhost:5173/jobs/<JOB_ID>/editor`
- **Description**: Verifies that when the DELETE API call fails (e.g. network error or 500), the toolbar shows a descriptive error message and the track-change mark is kept in the document unchanged.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<JOB_ID>/editor`.
  2. Enable Track Changes; confirm at least one change is listed.
  3. In browser DevTools → Network, block requests to `*/changes/*` (or take the API offline).
  4. Click **Accept** (or **Reject**) on a change.
  5. Observe the toolbar error area and the editor document.
- **Expected Result**: A red error message appears in the toolbar (text contains "Failed to accept change" or "Failed to reject change"). The track-change mark remains visible in the document. The change entry remains in the list.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

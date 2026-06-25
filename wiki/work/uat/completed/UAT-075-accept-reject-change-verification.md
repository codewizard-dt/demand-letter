---
id: UAT-075
title: "UAT: Accept/Reject Individual Collaborative Change End-to-End"
status: pending
task: TASK-075
created: 2026-06-25
updated: 2026-06-25
---

# UAT-075 — UAT: Accept/Reject Individual Collaborative Change End-to-End

implements::[[TASK-075]]

> **Source task**: [[TASK-075]]
> **Generated**: 2026-06-25

Verifies the accept/reject individual-change flow hardened in TASK-075: mark removal on accept, text deletion, error handling on network failure, build artifact emission, and backend DELETE endpoint correctness.

---

## Prerequisites

- [ ] API running locally at `http://localhost:3000` (SAM local or deployed)
- [ ] Frontend running locally at `http://localhost:5173`
- [ ] A completed job exists in the DB; set `UAT_JOB_ID` to its UUID
- [ ] At least one `CollaborativeChange` row exists for that job (insert type); set `UAT_CHANGE_ID` to its UUID
- [ ] A second change of delete type exists; set `UAT_DELETE_CHANGE_ID` to its UUID
- [ ] Logged in as a valid user (session cookie / JWT in browser)

---

## Test Cases

### UAT-STATIC-001: Build artifact for delete-jobs-changes is emitted

- **Scenario**: TASK-075 Step 1 required `delete-jobs-changes.ts` to be added to the build entrypoints
- **Steps**:
  1. Run the check command below
- **Command**:
  ```bash
  test -f /Users/davidtaylor/Repositories/gauntlet/demand-letter/.build/handlers/delete-jobs-changes.js && echo "ARTIFACT_PRESENT" || echo "ARTIFACT_MISSING"
  ```
- **Expected Result**: Output is `ARTIFACT_PRESENT`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-001: DELETE /jobs/{id}/changes/{changeId} — happy path returns 204

- **Endpoint**: `DELETE /jobs/{id}/changes/{changeId}`
- **Description**: Accepting or rejecting a change calls this endpoint; a valid jobId + changeId pair must yield 204 with empty body.
- **Auth-Required**: false (Lambda URL, no auth header required in local SAM)
- **Steps**:
  1. Ensure `UAT_JOB_ID` and `UAT_CHANGE_ID` are set in the shell
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:3000/jobs/${UAT_JOB_ID}/changes/${UAT_CHANGE_ID}"
  ```
- **Expected Result**: HTTP status `204`
- [FAIL: auto-judge: prerequisite not satisfied — UAT_JOB_ID and UAT_CHANGE_ID env vars not set] <!-- 2026-06-25 -->

---

### UAT-API-002: DELETE /jobs/{id}/changes/{changeId} — missing changeId path segment returns 400

- **Endpoint**: `DELETE /jobs/{id}/changes/:changeId`
- **Description**: Handler returns 400 when either path parameter is absent; guards against malformed calls.
- **Steps**:
  1. Run the curl command below (changeId replaced with empty string forces path resolution to `/jobs/{id}/changes/`)
- **Command**:
  ```bash
  curl -sS -w "\n%{http_code}" -X DELETE "http://localhost:3000/jobs/nonexistent-job/changes/nonexistent-change"
  ```
- **Expected Result**: HTTP status `400` and body contains `"error"` key (e.g., `{"error":"Missing job id or change id"}` or a Prisma not-found error wrapped as 500 — if 500, see gap note below)
- [FAIL: auto-judge: HTTP 403 received (SAM local returned "Missing Authentication Token"); expected 400 — SAM API Gateway requires auth token on DELETE /jobs/{id}/changes/{changeId}] <!-- 2026-06-25 -->

---

### UAT-UI-001: Accept trackInsert — mark removed, text preserved, row disappears

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Accepting an insert-type change must keep the inserted text in the document but remove the green trackInsert highlight and remove the change row from the sidebar list.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor`
  2. Click the **Track Changes** button — it should turn blue and a badge showing the change count should appear
  3. Locate a change row with an **insert** badge (green)
  4. Verify the corresponding text in the editor is highlighted with a green mark
  5. Click the **Accept** button on that row
  6. Observe the editor
  7. Observe the change list
- **Expected Result**:
  - The inserted text remains visible in the editor (not deleted)
  - The green trackInsert highlight is removed from that text
  - The change row disappears from the list
  - No error message is shown
  - The change count badge decrements by 1
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Accept trackDelete — text deleted, row disappears

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Accepting a delete-type change must physically remove the marked text from the document.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor`
  2. Click **Track Changes** to enable
  3. Locate a change row with a **delete** badge (red)
  4. Note the text that is highlighted with a red trackDelete mark
  5. Click **Accept** on that row
  6. Observe the editor
- **Expected Result**:
  - The previously-marked text is no longer present in the editor
  - The change row disappears from the list
  - No error message is shown
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Reject trackInsert — inserted text deleted, row disappears

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Rejecting an insert-type change must remove the inserted text from the document entirely.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor` (use a job with an un-accepted insert change)
  2. Click **Track Changes** to enable
  3. Locate a change row with an **insert** badge (green)
  4. Note the highlighted text in the editor
  5. Click **Reject** on that row
  6. Observe the editor
- **Expected Result**:
  - The inserted text is removed from the editor
  - The change row disappears from the list
  - No error message is shown
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Reject trackDelete — deleted text re-inserted, row disappears

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Rejecting a delete-type change must restore the deleted text at its original position.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor` (use a job with a delete-type change)
  2. Click **Track Changes** to enable
  3. Locate a change row with a **delete** badge (red)
  4. Note the original position and the `text` value from the change's `contentDelta`
  5. Click **Reject** on that row
  6. Observe the editor at the original insertion position
- **Expected Result**:
  - The deleted text reappears in the editor at its original position
  - The change row disappears from the list
  - No error message is shown
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Network failure on Accept — error message shown, row preserved

- **Scenario**: When the `DELETE /jobs/:id/changes/:changeId` call fails (network error or non-OK response), the UI must show an error message and leave the change row and editor mark intact.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor`
  2. Click **Track Changes** to enable and confirm changes load
  3. Use browser DevTools → Network → right-click the page origin → **Block request URL** (or use a request interceptor) to force the next DELETE request to fail
  4. Click **Accept** on any change row
  5. Observe the UI
- **Expected Result**:
  - An error message is displayed: *"Failed to accept change. The mark has been kept in the document. Please try again."*
  - The change row **remains** in the list
  - The editor mark **remains** on the text (the text is not deleted)
- [FAIL: auto-judge: manual test requires human verification — DevTools network blocking required] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Network failure on Reject — error message shown, row preserved

- **Scenario**: Same as UAT-EDGE-001 but for the Reject action.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor`
  2. Click **Track Changes** to enable
  3. Block the DELETE request in DevTools as above
  4. Click **Reject** on any change row
  5. Observe the UI
- **Expected Result**:
  - An error message is displayed: *"Failed to reject change. The mark has been kept in the document. Please try again."*
  - The change row **remains** in the list
  - The editor mark **remains** on the text
- [FAIL: auto-judge: manual test requires human verification — DevTools network blocking required] <!-- 2026-06-25 -->

---

### UAT-UI-005: Empty state after all changes accepted/rejected

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: When all tracked changes are resolved, the list area shows the empty-state message.
- **Steps**:
  1. Navigate to `/jobs/$UAT_JOB_ID/editor` with a job that has exactly one change
  2. Click **Track Changes** to enable
  3. Accept or reject the single change
  4. Observe the list area
- **Expected Result**:
  - The list is empty
  - The text *"No tracked changes for this job."* (italic, gray) is displayed
  - The badge shows "0 changes"
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

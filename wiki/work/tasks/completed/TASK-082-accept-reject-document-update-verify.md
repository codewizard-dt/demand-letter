---
id: TASK-082
title: "Verify accept/reject individual changes correctly updates document state"
status: in-progress
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-075]
blocks: []
parallel_safe_with: []
uat: "[[UAT-082]]"
tags: [track-changes, accept, reject, verification, frontend]
---

# TASK-082 — Accept/Reject Changes: Document State Verification

## Objective

End-to-end verification that accepting and rejecting individual collaborative changes correctly updates the editor document: accepting an insert makes the text permanent (mark removed, text retained); accepting a delete removes the text; rejecting an insert removes the inserted text; rejecting a delete restores the deleted text. Also verifies the `CollaborativeChange` row is deleted from the database after accept/reject.

## Approach

Static source audit confirms the logic; manual browser test confirms the visual/interactive behavior. Also verifies the `DELETE /jobs/:id/changes/:changeId` call succeeds and removes the DB row.

## Steps

### 1. Static: confirm accept/reject logic completeness  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/components/TrackChangesToolbar.tsx` — for each of the four cases (accept insert, accept delete, reject insert, reject delete), confirm the correct ProseMirror command sequence is used and the DELETE API call is made <!-- Completed: 2026-06-25 — all 4 cases confirmed correct -->
- [x] Read `packages/api/src/handlers/delete-jobs-changes.ts` — confirm 200 response on successful delete, 404 if change not found, 403 if change belongs to different job <!-- Completed: 2026-06-25 — fixed: added findUnique 404 check, jobId 403 check, try-catch 500 -->

### 2. Manual: accept an insert  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] With Track Changes enabled, identify a `trackInsert` mark in the editor
- [DEFERRED-TO-UAT] Click Accept for that change
- [DEFERRED-TO-UAT] Confirm: the green underline is removed; the text is still present in the document
- [DEFERRED-TO-UAT] Confirm: the change disappears from the change list
- [DEFERRED-TO-UAT] Verify via `GET /jobs/:id/changes`: the accepted change ID no longer appears

### 3. Manual: reject an insert  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Identify a `trackInsert` mark
- [DEFERRED-TO-UAT] Click Reject for that change
- [DEFERRED-TO-UAT] Confirm: the inserted text is removed from the document
- [DEFERRED-TO-UAT] Confirm: the change disappears from the change list

### 4. Manual: accept a delete  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Identify a `trackDelete` mark (red strikethrough text)
- [DEFERRED-TO-UAT] Click Accept
- [DEFERRED-TO-UAT] Confirm: the struck-through text is permanently removed; no red strikethrough remains

### 5. Manual: reject a delete  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Identify a `trackDelete` mark
- [DEFERRED-TO-UAT] Click Reject
- [DEFERRED-TO-UAT] Confirm: the struck-through text is restored to normal (mark removed, text present and editable)

### 6. Typecheck  <!-- agent: general-purpose -->

- [x] `make typecheck` exits 0 <!-- Completed: 2026-06-25 — all 3 packages pass -->

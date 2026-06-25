---
id: TASK-082
title: "Verify accept/reject individual changes correctly updates document state"
status: todo
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-075]
blocks: []
parallel_safe_with: []
uat: ""
tags: [track-changes, accept, reject, verification, frontend]
---

# TASK-082 — Accept/Reject Changes: Document State Verification

## Objective

End-to-end verification that accepting and rejecting individual collaborative changes correctly updates the editor document: accepting an insert makes the text permanent (mark removed, text retained); accepting a delete removes the text; rejecting an insert removes the inserted text; rejecting a delete restores the deleted text. Also verifies the `CollaborativeChange` row is deleted from the database after accept/reject.

## Approach

Static source audit confirms the logic; manual browser test confirms the visual/interactive behavior. Also verifies the `DELETE /jobs/:id/changes/:changeId` call succeeds and removes the DB row.

## Steps

### 1. Static: confirm accept/reject logic completeness  <!-- agent: general-purpose -->

- [ ] Read `packages/web/src/components/TrackChangesToolbar.tsx` — for each of the four cases (accept insert, accept delete, reject insert, reject delete), confirm the correct ProseMirror command sequence is used and the DELETE API call is made
- [ ] Read `packages/api/src/handlers/delete-jobs-changes.ts` — confirm 200 response on successful delete, 404 if change not found, 403 if change belongs to different job

### 2. Manual: accept an insert  <!-- agent: general-purpose -->

- [ ] With Track Changes enabled, identify a `trackInsert` mark in the editor
- [ ] Click Accept for that change
- [ ] Confirm: the green underline is removed; the text is still present in the document
- [ ] Confirm: the change disappears from the change list
- [ ] Verify via `GET /jobs/:id/changes`: the accepted change ID no longer appears

### 3. Manual: reject an insert  <!-- agent: general-purpose -->

- [ ] Identify a `trackInsert` mark
- [ ] Click Reject for that change
- [ ] Confirm: the inserted text is removed from the document
- [ ] Confirm: the change disappears from the change list

### 4. Manual: accept a delete  <!-- agent: general-purpose -->

- [ ] Identify a `trackDelete` mark (red strikethrough text)
- [ ] Click Accept
- [ ] Confirm: the struck-through text is permanently removed; no red strikethrough remains

### 5. Manual: reject a delete  <!-- agent: general-purpose -->

- [ ] Identify a `trackDelete` mark
- [ ] Click Reject
- [ ] Confirm: the struck-through text is restored to normal (mark removed, text present and editable)

### 6. Typecheck  <!-- agent: general-purpose -->

- [ ] `pnpm --filter @demand-letter/web typecheck` exits 0

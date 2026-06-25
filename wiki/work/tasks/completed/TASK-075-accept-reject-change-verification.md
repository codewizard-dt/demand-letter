---
id: TASK-075
title: "Accept/reject individual collaborative change end-to-end: verify mark removal and delta revert"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-074]
blocks: [TASK-082]
parallel_safe_with: [TASK-076, TASK-080, TASK-081]
uat: "[[UAT-075]]"
tags: [tiptap, track-changes, accept, reject, frontend, collaboration]
---

# TASK-075 — Accept/Reject Individual Collaborative Change End-to-End

## Objective

Verify and harden the accept/reject individual-change flow implemented in TASK-074: accepting a `trackInsert` removes only the mark and retains the text; accepting a `trackDelete` removes the text; rejecting an insert removes the inserted text; rejecting a delete re-inserts the deleted text at the correct position. Also ensure the `DELETE /jobs/:id/changes/:changeId` backend call correctly purges the record and that the UI removes the change from the list after accept/reject.

## Approach

TASK-074 implemented the basic accept/reject logic in `TrackChangesToolbar.tsx`. This task audits and hardens it: adds error handling for the DELETE endpoint call (network failures should not leave the UI in a broken state), confirms the `delete-jobs-changes.ts` handler is wired into the build pipeline (UAT-074 flagged this gap), and adds integration-level smoke tests. No new frontend components are needed — only targeted fixes.

## Steps

### 1. Fix delete-jobs-changes build pipeline gap  <!-- agent: general-purpose -->

- [x] Read `packages/api/package.json` (or the esbuild config) and confirm whether `delete-jobs-changes.ts` is included in the build entrypoints <!-- Completed: 2026-06-25 -->
- [x] If missing, add it alongside other handler entrypoints so `.build/handlers/delete-jobs-changes.js` is emitted <!-- Completed: 2026-06-25 -->
- [x] Run `pnpm --filter @demand-letter/api build` and verify the artifact is emitted <!-- Completed: 2026-06-25 -->

### 2. Add error handling to accept/reject in TrackChangesToolbar  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/components/TrackChangesToolbar.tsx`: <!-- Completed: 2026-06-25 -->
  - Wrap the `DELETE /jobs/:id/changes/:changeId` call in try/catch
  - On network failure: keep the mark in the editor but show a toast/error message; do not remove the change from the list
  - On success: remove the change from the local list state and unset the mark as already done

### 3. Verify accept semantics in the editor  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/components/TrackChangesToolbar.tsx` — confirm: <!-- Completed: 2026-06-25 -->
  - Accept on `trackInsert`: calls `editor.chain().unsetMark('trackInsert').run()` (keeps text, removes mark)
  - Accept on `trackDelete`: deletes the text range then calls `editor.chain().unsetMark('trackDelete').run()`
  - Reject on `trackInsert`: deletes the text range using `editor.chain().deleteRange({ from, to }).run()`
  - Reject on `trackDelete`: re-inserts the deleted text at the correct position

### 4. Typecheck  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0 <!-- Completed: 2026-06-25 -->
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 -->

---
id: TASK-105
title: "Default to diff view after refinement completes"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-098, TASK-099, TASK-100, TASK-101, TASK-102, TASK-103, TASK-104, TASK-106]
uat: "[[UAT-105]]"
tags: [ui, frontend, editor, refinement]
---

# TASK-105 — Default to diff view after refinement completes

## Objective

When a refinement completes in `RefinementPanel`, automatically switch to diff view so attorneys immediately see what changed, with "Show Text" as the secondary toggle to revert to plain text.

## Approach

In `packages/web/src/components/RefinementPanel.tsx`, the `showDiff` state starts as `false`. When `handleRefine` succeeds, set `showDiff(true)` in the `onSuccess` callback. The existing toggle button (`'Show Text' : 'Show Diff'`) already handles both states correctly — no button label changes needed.

## Steps

### 1. Auto-enable diff view on refinement success  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/components/RefinementPanel.tsx`
- [x] In the `handleRefine` function, find the `refineMutation.mutate(...)` call
- [x] In the `onSuccess` callback, add `setShowDiff(true)` before or after `setRefinementId(result.refinementId)`:
  ```ts
  onSuccess: (result) => {
    setRefinementId(result.refinementId);
    setShowDiff(true);
  },
  ```
- [x] Verify: when refining resets (`setRefinedText('')` / `setShowDiff(false)` in `handleRefine`), the next refinement starts fresh in text mode until complete
- [x] Verify typecheck passes clean <!-- Completed: 2026-06-26 -->

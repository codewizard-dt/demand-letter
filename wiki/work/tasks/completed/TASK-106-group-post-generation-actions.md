---
id: TASK-106
title: "Group post-generation actions with primary Open in Editor CTA"
status: done
created: 2026-06-26
updated: 2026-06-26 <!-- Updated: 2026-06-26 -->
depends_on: []
blocks: []
parallel_safe_with: [TASK-098, TASK-099, TASK-100, TASK-101, TASK-102, TASK-103, TASK-104, TASK-105]
uat: "[[UAT-106]]"
tags: [ui, frontend, generate]
---

# TASK-106 — Group post-generation actions with primary Open in Editor CTA

## Objective

Rearrange the post-generation action buttons in `GeneratePage.tsx` so "Open in Editor" is the primary CTA (first, styled prominently) and "Download DOCX" is secondary. Currently they appear in reverse order with equal styling.

## Approach

In `packages/web/src/pages/GeneratePage.tsx`, both buttons are inside separate `{isDone && (...)}` blocks. Merge them into a single `{isDone && (...)}` block containing a flex row, then swap order and update classes: "Open in Editor" gets the primary `bg-primary` style, "Download DOCX" gets a secondary outlined style.

## Steps

### 1. Merge and reorder post-generation action buttons  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GeneratePage.tsx`
- [x] Find the two `{isDone && (...)}` blocks that contain the Download and Open buttons (the last two `isDone` blocks, after RefinementPanel and RefinementHistory)
- [x] Replace both separate `{isDone && <button ...>}` blocks with a single grouped block:
  ```tsx
  {isDone && (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={() => navigate(`/jobs/${id}/editor`)}
        className="px-5 py-2.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Open in Editor
      </button>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-5 py-2.5 border border-border rounded-md text-sm text-primary hover:bg-bg transition-colors disabled:opacity-50"
      >
        {isDownloading ? 'Preparing…' : 'Download DOCX'}
      </button>
    </div>
  )}
  ```
- [x] Verify the `handleDownload` function is still defined (it is — calls `downloadMutation.mutate(id!)`)
- [x] Verify typecheck passes clean

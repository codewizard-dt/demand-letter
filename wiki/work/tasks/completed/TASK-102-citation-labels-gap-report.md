---
id: TASK-102
title: "Show meaningful citation labels in Gap Report sidebar"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: [TASK-104]
parallel_safe_with: [TASK-098, TASK-099, TASK-100, TASK-101, TASK-103, TASK-105, TASK-106]
uat: "[[UAT-102]]"
tags: [ui, frontend, gap-report]
---

# TASK-102 — Show meaningful citation labels in Gap Report sidebar

## Objective

Replace the raw truncated block ID (`{bid.slice(0, 8)}…`) in the Gap Report citation sidebar with a meaningful label in `p.N · TYPE` format (e.g. `p.3 · PARA`), so attorneys can identify source locations at a glance.

## Approach

The `blocks` query already fetches all block objects including `page` and `type`. In `GapReportPage.tsx`, build a `blockMap` (keyed by `block.id`) from `blocksQuery.data`. When rendering citation pills, look up the block in the map and display `p.{block.page} · {block.type.slice(0,4).toUpperCase()}` as the label. Fall back to the truncated ID if not found.

## Steps

### 1. Build block lookup map and update citation pill labels  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GapReportPage.tsx`
- [x] After `const blocks = blocksQuery.data ?? [];`, add:
  ```ts
  const blockMap = useMemo(
    () => new Map(blocks.map((b) => [b.id, b])),
    [blocks]
  );
  ```
- [x] Add `useMemo` to the import from `'react'`
- [x] In the citation sidebar section, replace the pill button label `{bid.slice(0, 8)}…` with:
  ```tsx
  {(() => {
    const b = blockMap.get(bid);
    return b ? `p.${b.page} · ${b.type.slice(0, 4).toUpperCase()}` : `${bid.slice(0, 8)}…`;
  })()}
  ```
- [x] Verify typecheck passes clean <!-- packages/web: Done; packages/api pre-existing corsHeaders errors unrelated to this task -->

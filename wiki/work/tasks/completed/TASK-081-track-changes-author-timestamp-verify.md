---
id: TASK-081
title: "Verify track-changes view shows each edit with correct author and timestamp"
status: in-progress
created: 2026-06-25
updated: 2026-06-25 <!-- tackled 2026-06-25 -->
depends_on: []
blocks: []
parallel_safe_with: [TASK-075, TASK-076, TASK-080]
uat: "[[UAT-081]]"
tags: [track-changes, author, timestamp, verification, frontend]
---

# TASK-081 — Track-Changes Author and Timestamp Verification

## Objective

Verify that the track-changes overlay in the TipTap editor correctly attributes each insertion or deletion to the user who made it, with the correct timestamp, and that the tooltip on hover displays `{userName} · {formattedTimestamp}`. This confirms the full chain from Y.js transaction → `CollaborativeChange` DB row → `GET /jobs/:id/changes` response → TrackChangesToolbar UI rendering.

## Approach

This is primarily a static audit + manual verification task. The static portion reads source code to confirm the data flow; the manual portion requires a browser with the full stack running.

## Steps

### 1. Static: audit data flow from DB to UI  <!-- agent: general-purpose -->

- [x] Read `packages/api/src/handlers/get-jobs-changes.ts` — confirm response includes `userName` and `createdAt` fields <!-- Completed: 2026-06-25 -->
- [x] Read `packages/web/src/components/TrackChangesToolbar.tsx` — confirm:
  - `fetchJobChanges(jobId)` result is stored in component state
  - Each change is applied as a `TrackInsert` or `TrackDelete` mark with `{ userName, createdAt }` attributes
  - The mark's `renderHTML` output includes `data-user-name` and `data-created-at` attributes (or equivalent) for tooltip rendering
- [x] Read `packages/web/src/lib/editor/trackChangeMarks.ts` — confirm `userName` and `createdAt` are in `addAttributes()` <!-- Completed: 2026-06-25 -->

### 2. Static: confirm tooltip rendering  <!-- agent: general-purpose -->

- [x] In `TrackChangesToolbar.tsx` or `trackChangeMarks.ts`, confirm the tooltip text format is `{userName} · {createdAt}` (date formatted as something human-readable, not raw ISO string) <!-- Completed: 2026-06-25 -->
- [x] If the `createdAt` is rendered as a raw ISO string, update the rendering to use `new Date(createdAt).toLocaleString()` or equivalent <!-- Fixed: both TrackInsert and TrackDelete renderHTML now emit toLocaleString() for data-created-at -->

### 3. Manual: verify in browser  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Open a job with at least one recorded `CollaborativeChange` row in the database
- [DEFERRED-TO-UAT] Toggle "Track Changes" on in the editor
- [DEFERRED-TO-UAT] Hover over a marked insertion or deletion — confirm the tooltip shows the correct user name and a human-readable timestamp
- [DEFERRED-TO-UAT] Confirm the change list below the toolbar shows the same user name and timestamp

### 4. Typecheck  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 -->

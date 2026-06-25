---
id: TASK-074
title: "Track-changes view in UI: toggle insertions/deletions with author and timestamp tooltip"
status: in-progress
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-073]
blocks: []
parallel_safe_with: []
uat: "[[UAT-074]]"
tags: [tiptap, prosemirror, track-changes, frontend, react, ui]
---

# TASK-074 — Track-Changes View in UI

## Objective

Add a "Track Changes" toggle in the TipTap editor that renders inline insertions (green underline) and deletions (red strikethrough) with author name and timestamp in a tooltip. Each change can be accepted (merges permanently) or rejected (reverts the delta). The view reads from the `CollaborativeChange` records (via `GET /jobs/:id/changes` added in TASK-073) and overlays marks on the ProseMirror document.

## Approach

Define two custom TipTap marks: `TrackInsert` and `TrackDelete`. When "Track Changes" mode is toggled on, fetch `GET /jobs/:id/changes`, replay the deltas as ProseMirror marks on the current document (without mutating the base document), and render them with CSS. Tooltip on hover uses a `NodeView` or a `tippy.js` popup. Accept removes the mark and commits the content; reject removes the mark and reverts the delta.

## Steps

### 1. Define TrackInsert and TrackDelete marks  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/lib/editor/trackChangeMarks.ts`: <!-- Completed: 2026-06-25 -->
  ```typescript
  import { Mark } from '@tiptap/core'
  
  export const TrackInsert = Mark.create({
    name: 'trackInsert',
    addAttributes() {
      return {
        changeId: { default: null },
        userName: { default: '' },
        createdAt: { default: '' },
      }
    },
    renderHTML({ HTMLAttributes }) {
      return ['span', { ...HTMLAttributes, class: 'track-insert' }, 0]
    },
    parseHTML() { return [{ tag: 'span.track-insert' }] },
  })
  
  export const TrackDelete = Mark.create({
    name: 'trackDelete',
    addAttributes() {
      return {
        changeId: { default: null },
        userName: { default: '' },
        createdAt: { default: '' },
      }
    },
    renderHTML({ HTMLAttributes }) {
      return ['span', { ...HTMLAttributes, class: 'track-delete' }, 0]
    },
    parseHTML() { return [{ tag: 'span.track-delete' }] },
  })
  ```

### 2. Add TrackChangesToolbar component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/components/TrackChangesToolbar.tsx`: <!-- Completed: 2026-06-25 -->
  - Props: `{ editor: Editor; jobId: string; enabled: boolean; onToggle: () => void }`
  - Renders a "Track Changes" toggle button
  - When `enabled` transitions to `true`: fetch `fetchJobChanges(jobId)`, apply `TrackInsert` / `TrackDelete` marks on matching text ranges in the editor, show count badge
  - When `enabled` transitions to `false`: remove all `trackInsert` and `trackDelete` marks
  - List each change below the toolbar with [Accept] / [Reject] buttons

### 3. Accept and Reject handlers  <!-- agent: general-purpose -->

- [x] Accept: remove the `trackInsert` / `trackDelete` mark from the range, keeping or removing the content accordingly: <!-- Completed: 2026-06-25 -->
  - For an insert: remove only the mark (keep the text)
  - For a delete: remove the text and its mark
- [x] Reject: undo the change: <!-- Completed: 2026-06-25 -->
  - For an insert: remove the inserted text from the editor
  - For a delete: re-insert the deleted text at the correct position
- [x] Call `DELETE /jobs/:id/changes/:changeId` (created `packages/api/src/handlers/delete-jobs-changes.ts` + SAM resource in `template.yaml`) to remove the accepted/rejected record from the DB <!-- Completed: 2026-06-25 -->

### 4. CSS for track-change marks  <!-- agent: general-purpose -->

- [x] In `packages/web/src/index.css`: <!-- Completed: 2026-06-25 -->
  ```css
  .track-insert {
    text-decoration: underline;
    text-decoration-color: #16a34a;
    background-color: rgba(22, 163, 74, 0.1);
  }
  .track-delete {
    text-decoration: line-through;
    text-decoration-color: #dc2626;
    background-color: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  .track-insert[data-user-name],
  .track-delete[data-user-name] {
    cursor: help;
  }
  ```
- [x] Add tooltip on hover using a `title` attribute (or `tippy.js` for richer styling): show `{userName} · {createdAt formatted as 'MMM D, h:mm a'}` <!-- Completed: 2026-06-25 -->

### 5. Wire into EditorPage  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/pages/EditorPage.tsx`: <!-- Completed: 2026-06-25 -->
  - [x] Add `TrackInsert` and `TrackDelete` to the `extensions` array <!-- Completed: 2026-06-25 -->
  - [x] Add `[trackChangesEnabled, setTrackChangesEnabled]` state <!-- Completed: 2026-06-25 -->
  - [x] Render `<TrackChangesToolbar editor={editor} jobId={id!} enabled={trackChangesEnabled} onToggle={() => setTrackChangesEnabled(v => !v)} />` above `<EditorContent>` <!-- Completed: 2026-06-25 -->

### 6. Smoke-test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Open a job in the editor, make a tracked edit, toggle Track Changes — confirm green underline appears
- [DEFERRED-TO-UAT] Click Accept → confirm mark removed and text retained
- [DEFERRED-TO-UAT] Click Reject → confirm text reverted
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 (confirmed clean by all sub-agents) -->

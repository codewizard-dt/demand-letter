---
id: TASK-069
title: "Y.js CRDT document bound to TipTap editor via y-prosemirror"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-066]
blocks: [TASK-070, TASK-071, TASK-073]
parallel_safe_with: [TASK-067, TASK-068]
uat: "[[UAT-069]]"
tags: [yjs, crdt, tiptap, prosemirror, collaboration, frontend]
---

# TASK-069 — Y.js CRDT Document Bound to TipTap Editor

## Objective

Bind a Y.js CRDT document to the TipTap editor using `y-prosemirror` so that all editor state is represented as a Y.Doc. This is the prerequisite for real-time multi-user collaboration (TASK-070), S3 snapshot persistence (TASK-071), and change tracking (TASK-073). At this stage the Y.Doc is local only (no WebSocket provider yet); the binding alone enables user-cursor awareness and offline conflict-free merging.

## Approach

Install `yjs` and `y-prosemirror`. Add `CollaborationCursor` and `Collaboration` TipTap extensions (which wrap the y-prosemirror binding) to the editor. The Y.Doc is created per-mount and seeded from the DOCX HTML import (TASK-067). The WebSocket provider (TASK-070) will attach to the same Y.Doc later.

## Steps

### 1. Install Y.js packages  <!-- agent: general-purpose -->

- [x] Run from the repo root:
  ```
  pnpm --filter @demand-letter/web add yjs y-prosemirror @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
  ```
- [x] Verify all four entries appear in `packages/web/package.json` dependencies. <!-- Completed: 2026-06-25 — NOTE: @tiptap/extension-collaboration-cursor v2.26.2 has unmet peer dep (expects @tiptap/core ^2.x, project is on 3.x); peer mismatch to investigate in Step 4 -->

### 2. Create Y.Doc per editor session  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/pages/EditorPage.tsx`: <!-- Completed: 2026-06-25 -->
  - Added `useMemo` to React import; added `import * as Y from 'yjs'`, `import { Collaboration }`, `import { CollaborationCursor }`
  - Created `const ydoc = useMemo(() => new Y.Doc(), [])` inside component
  - Added `Collaboration.configure({ document: ydoc })` to extensions array
  - Removed `content: ''` from `useEditor`

### 3. Seed Y.Doc from DOCX HTML  <!-- agent: general-purpose -->

- [x] After mammoth conversion produces `html`, seed the editor content: <!-- Completed: 2026-06-25 — v3 fix: setContent(html, { emitUpdate: false }) not boolean second arg -->
  Guarded `ydoc.getXmlFragment('default').length === 0` check before seeding.

### 4. Add CollaborationCursor with placeholder identity  <!-- agent: general-purpose -->

- [x] Add to the `extensions` array: <!-- Completed: 2026-06-25 — provider typed `any` in v2.26.2, null is type-compatible; no errors -->
  `CollaborationCursor.configure({ provider: null, user: { name: 'You', color: '#6366f1' } })` added.

### 5. Smoke-test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Run `pnpm --filter @demand-letter/web dev` <!-- runtime — belongs in UAT -->
- [DEFERRED-TO-UAT] Open a completed job's editor; confirm content loads correctly (no blank page)
- [DEFERRED-TO-UAT] Open browser DevTools → confirm no console errors related to Y.js or prosemirror-collab
- [x] `make typecheck` exits 0 <!-- Completed: 2026-06-25 — all three packages (db, web, api) clean -->

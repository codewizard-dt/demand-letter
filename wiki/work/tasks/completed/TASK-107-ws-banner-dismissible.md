---
id: TASK-107
title: "Make WS-missing banner dismissible on EditorPage"
status: in-progress
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-099, TASK-101, TASK-102, TASK-103, TASK-104, TASK-105, TASK-106]
uat: "[[UAT-107]]"
tags: [ui, frontend, editor]
---

# TASK-107 — Make WS-missing banner dismissible on EditorPage

## Objective

Make the amber WebSocket-missing warning banner on `packages/web/src/pages/EditorPage.tsx` dismissible by adding a close (×) button so attorneys are not permanently distracted by a non-actionable notice.

## Background

`EditorPage.tsx` renders an amber warning banner at lines 122–126 whenever `VITE_WS_API_URL` is absent (i.e. no real-time collaboration server is configured). The banner currently renders unconditionally and cannot be closed. This clutters the editor UI with a permanent notice that is informational only.

## Approach

1. Add a `wsBannerDismissed` boolean state variable (default `false`) via `useState`.
2. Wrap the existing banner `<div>` inside `{!wsBannerDismissed && (...)}` so it disappears when dismissed.
3. Inside the banner `<div>`, add a `<button>` rendered on the right that calls `setWsBannerDismissed(true)` on click, labelled `×` (aria-label "Dismiss").
4. The outer banner div should use `flex` layout with `justify-between items-center` so the message and the button sit on the same row.

## Steps

### 1. Add `wsBannerDismissed` state and update the banner JSX  <!-- agent: general-purpose -->

File: `packages/web/src/pages/EditorPage.tsx`

- [x] Add `const [wsBannerDismissed, setWsBannerDismissed] = useState(false);` after the existing `const [trackChangesEnabled, setTrackChangesEnabled] = useState(false);` line (line 31). <!-- Completed: 2026-06-26 -->
- [x] Replace the existing banner block (lines 122–126): <!-- Completed: 2026-06-26 -->
  ```tsx
  {!import.meta.env.VITE_WS_API_URL && (
    <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-amber-800 text-sm">
      Collaborative editing requires a deployed WebSocket server. Export to Word is still available.
    </div>
  )}
  ```
  with the dismissible version:
  ```tsx
  {!import.meta.env.VITE_WS_API_URL && !wsBannerDismissed && (
    <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 px-4 py-3 text-amber-800 text-sm flex justify-between items-center">
      <span>Collaborative editing requires a deployed WebSocket server. Export to Word is still available.</span>
      <button
        onClick={() => setWsBannerDismissed(true)}
        aria-label="Dismiss"
        className="ml-4 text-amber-600 hover:text-amber-900 font-bold leading-none"
      >
        ×
      </button>
    </div>
  )}
  ```
- [x] Verify that the TypeScript build passes with no new errors (`pnpm -F web build` or typecheck). <!-- Completed: 2026-06-26 -->

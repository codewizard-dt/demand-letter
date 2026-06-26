---
id: TASK-097
title: "Replace AnnotatePage alert() with inline success message"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-089, TASK-090, TASK-091, TASK-092, TASK-093, TASK-094, TASK-095, TASK-096]
uat: "[[UAT-097]]"
tags: [ui, frontend, ux]
---

# TASK-097 — Replace AnnotatePage alert() with inline success message

## Objective

Replace the `alert('Zones saved successfully.')` call in `packages/web/src/pages/AnnotatePage.tsx` with a non-blocking inline success banner that auto-dismisses after 3 seconds.

## Approach

Add a `saved` boolean state to the component. On mutation success, set `saved = true` and schedule `setTimeout(() => setSaved(false), 3000)` to clear it. Render a success div above the zone list when `saved` is true. No third-party toast library needed — this is the only alert in the app and a minimal inline solution is proportionate.

## Steps

### 1. Replace alert() with stateful inline success banner  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/AnnotatePage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Add `const [saved, setSaved] = useState(false);` after existing state declarations <!-- Completed: 2026-06-26 -->
- [x] Replace: <!-- Completed: 2026-06-26 -->
  ```tsx
  onSuccess: () => alert('Zones saved successfully.'),
  ```
  with:
  ```tsx
  onSuccess: () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  },
  ```
- [x] Add the success banner JSX just before the `<div className="space-y-3">` zone list: <!-- Completed: 2026-06-26 -->
  ```tsx
  {saved && (
    <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-300 text-teal-800 rounded-md text-sm" role="status" aria-live="polite">
      Zones saved successfully.
    </div>
  )}
  ```
- [x] Verify `useState` is already imported (it is — line 1 of the file) <!-- Completed: 2026-06-26 -->

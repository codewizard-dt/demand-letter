---
id: TASK-109
title: "Add aria-live region for streaming generation output in GeneratePage"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-099, TASK-100, TASK-101, TASK-103, TASK-104, TASK-105, TASK-106, TASK-107]
uat: "[[UAT-109]]"
tags: [ui, frontend, generate, accessibility]
---

# TASK-109 — Add aria-live region for streaming generation output in GeneratePage

## Objective

Add `role="status"`, `aria-live="polite"`, and `aria-atomic="false"` to the streaming output container `<div>` in `packages/web/src/pages/GeneratePage.tsx` so that assistive technologies announce streaming content as it arrives.

## Background

`GeneratePage.tsx` renders streaming letter output inside a `<div className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded">`. This container has no ARIA live region attributes, so screen readers are unaware of content updates during streaming. Attorneys using assistive technology cannot follow the letter being generated in real time.

Adding `role="status"` (equivalent to `aria-live="polite"` as a convenience role) together with the explicit `aria-live="polite"` and `aria-atomic="false"` attributes tells assistive technologies to announce incremental chunks as they stream in without interrupting other speech.

## Approach

1. Locate the `{output && (...)}` block in `GeneratePage.tsx` — the `<div>` introduced by TASK-108.
2. Add three ARIA attributes to that `<div>`:
   - `role="status"` — marks the region as a live status area
   - `aria-live="polite"` — announces updates without interrupting current speech
   - `aria-atomic="false"` — each incremental chunk is announced as it arrives rather than the whole block
3. No logic changes — only the JSX element attributes change.

## Steps

### 1. Add ARIA attributes to streaming output div in GeneratePage  <!-- agent: general-purpose -->

File: `packages/web/src/pages/GeneratePage.tsx`

- [x] Replace the output div: <!-- Completed: 2026-06-26 -->
  ```tsx
  {output && (
    <div className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded">
      {output}
    </div>
  )}
  ```
  with:
  ```tsx
  {output && (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded"
    >
      {output}
    </div>
  )}
  ```
- [x] Verify TypeScript build passes with no new errors (`pnpm -F web typecheck`). <!-- Completed: 2026-06-26 -->

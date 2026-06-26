---
id: UAT-109
title: "UAT: Add aria-live region for streaming generation output in GeneratePage"
status: pending
task: TASK-109
created: 2026-06-26
updated: 2026-06-26
---

# UAT-109 — UAT: Add aria-live region for streaming generation output in GeneratePage

implements::[[TASK-109]]

> **Source task**: [[TASK-109]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running: `pnpm --filter @demand-letter/web dev` (default: http://localhost:5173)
- [ ] A job with status `generate_complete` or `generating` exists, or you can trigger generation on an existing job
- [ ] Auth: logged in as a valid user

---

## Test Cases

### UAT-UI-001: Output container carries `role="status"` attribute
- **Page**: `/jobs/:id/generate` (after generation has produced at least some output)
- **Description**: Verifies that the streaming output `<div>` has `role="status"` so assistive technologies recognise it as a live status region.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job where generation has completed (output text is visible).
  2. Open browser DevTools → Elements panel.
  3. Locate the prose output container (the `<div>` containing the generated letter text with class `mt-6 whitespace-pre-wrap font-sans`).
  4. Inspect its attributes.
- **Expected Result**: The div has `role="status"` present as an HTML attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Output container carries `aria-live="polite"` attribute
- **Page**: `/jobs/:id/generate` (after generation has produced at least some output)
- **Description**: Verifies that the streaming output `<div>` has `aria-live="polite"` so screen readers announce updates without interrupting current speech.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job where generation has completed (output text is visible).
  2. Open browser DevTools → Elements panel.
  3. Locate the prose output container (`<div>` with class `mt-6 whitespace-pre-wrap font-sans`).
  4. Inspect its attributes.
- **Expected Result**: The div has `aria-live="polite"` present as an HTML attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: Output container carries `aria-atomic="false"` attribute
- **Page**: `/jobs/:id/generate` (after generation has produced at least some output)
- **Description**: Verifies that `aria-atomic="false"` is set so each streamed chunk is announced as it arrives rather than the full region being re-read.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job where generation has completed (output text is visible).
  2. Open browser DevTools → Elements panel.
  3. Locate the prose output container (`<div>` with class `mt-6 whitespace-pre-wrap font-sans`).
  4. Inspect its attributes.
- **Expected Result**: The div has `aria-atomic="false"` present as an HTML attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: Output container absent before generation starts (no stale live region)
- **Page**: `/jobs/:id/generate` (before the Generate button is clicked)
- **Description**: Verifies the output container — and therefore the aria-live region — is not rendered until output actually exists, preventing a spurious empty live region from being announced.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job that has not yet been generated (no output yet).
  2. Do NOT click Generate Demand Letter.
  3. Open DevTools → Elements panel.
  4. Search for any element with `role="status"`.
- **Expected Result**: No element with `role="status"` exists in the DOM before generation begins.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-005: All three ARIA attributes coexist on the same element
- **Page**: `/jobs/:id/generate` (after generation has produced output)
- **Description**: Verifies `role`, `aria-live`, and `aria-atomic` are all present on the same single div — not split across parent/child elements.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job where generation has completed.
  2. Open DevTools → Console tab.
  3. Run: `document.querySelector('[role="status"][aria-live="polite"][aria-atomic="false"]')`
  4. Observe the returned element.
- **Expected Result**: The query returns a non-null element (the prose output container div). It is the same element that contains the generated letter text, not a wrapper or sibling element.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-EDGE-001: ARIA attributes present during mid-stream (while output is actively updating)
- **Page**: `/jobs/:id/generate` (while generation is actively streaming)
- **Description**: Verifies the live region is in place from the first chunk of output, not only after `isDone` flips to true — this is when screen reader announcements matter most.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job with no prior output.
  2. Click Generate Demand Letter.
  3. While the "Building document…" spinner is still visible and text is appearing in the output area, open DevTools → Console.
  4. Run: `document.querySelector('[role="status"][aria-live="polite"][aria-atomic="false"]')`
- **Expected Result**: The query returns a non-null element during streaming, before `isDone` is set and before post-generation actions appear.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---
id: UAT-106
title: "UAT: Group post-generation actions with primary Open in Editor CTA"
status: passed
task: TASK-106
created: 2026-06-26
updated: 2026-06-26
---

# UAT-106 — UAT: Group post-generation actions with primary Open in Editor CTA

implements::[[TASK-106]]

> **Source task**: [[TASK-106]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App running locally (`pnpm dev` or equivalent)
- [ ] At least one job exists that has completed generation (status `generate_complete`) — navigate via the jobs list or create a new one and generate it
- [ ] Test with a job ID that has a completed letter (so `isDone` becomes `true` after generation)

---

## Test Cases

### UAT-UI-001: Buttons appear grouped in a single row after generation completes

- **Page**: `/jobs/:id/generate` (navigate to any job's generate page and trigger generation, or use a job that shows the post-generation state)
- **Description**: After generation completes, the "Open in Editor" and "Download DOCX" buttons must appear together in a single flex row — not as two separate isolated elements.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a valid job.
  2. Click "Generate Demand Letter" and wait for generation to finish (the spinner disappears and the output preview appears).
  3. Observe the area below the output and refinement panels.
- **Expected Result**: A single row containing both "Open in Editor" and "Download DOCX" buttons side-by-side appears. There are no stray isolated button blocks — the two buttons share one container with horizontal spacing between them.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: "Open in Editor" is the first (leftmost) button

- **Page**: `/jobs/:id/generate` (post-generation state)
- **Description**: "Open in Editor" must appear before "Download DOCX" — it is the primary CTA and must be positioned first/leftmost in the button group.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` and complete generation (or use a job already in post-generation state).
  2. Look at the button group that appears below the refinement panels.
  3. Observe the left-to-right order of the two buttons.
- **Expected Result**: "Open in Editor" is the leftmost button. "Download DOCX" appears to its right.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: "Open in Editor" uses primary (filled) styling

- **Page**: `/jobs/:id/generate` (post-generation state)
- **Description**: The "Open in Editor" button must have a solid primary background colour, visually distinguishing it as the primary CTA.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` and reach the post-generation state.
  2. Observe the "Open in Editor" button's visual appearance.
- **Expected Result**: "Open in Editor" has a solid filled background (the app's primary colour). It is visually distinct from "Download DOCX", which has an outlined/border style with no solid fill.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: "Download DOCX" uses secondary (outlined) styling

- **Page**: `/jobs/:id/generate` (post-generation state)
- **Description**: The "Download DOCX" button must use the secondary outlined style — a visible border with no solid fill — clearly subordinate to the "Open in Editor" primary CTA.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` and reach the post-generation state.
  2. Observe the "Download DOCX" button's visual appearance.
- **Expected Result**: "Download DOCX" has a border outline with no filled background. It is visually less prominent than "Open in Editor".
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-005: "Open in Editor" navigates to the editor page

- **Page**: `/jobs/:id/generate` (post-generation state)
- **Description**: Clicking "Open in Editor" must navigate to `/jobs/:id/editor`.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job with ID `<jobId>` and reach the post-generation state.
  2. Click the "Open in Editor" button.
- **Expected Result**: The browser navigates to `/jobs/<jobId>/editor` (the editor page for that job).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-006: "Download DOCX" shows loading state while downloading

- **Page**: `/jobs/:id/generate` (post-generation state)
- **Description**: While a DOCX download is in progress, the "Download DOCX" button must become disabled and display "Preparing…" instead of "Download DOCX".
- **Steps**:
  1. Navigate to `/jobs/:id/generate` and reach the post-generation state.
  2. Click the "Download DOCX" button.
  3. Immediately observe the button text and disabled state before the download completes.
- **Expected Result**: The button text changes to "Preparing…" and the button is disabled (visually dimmed, not clickable) while the download request is in flight. Once the download completes, the button returns to "Download DOCX" and becomes enabled again.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

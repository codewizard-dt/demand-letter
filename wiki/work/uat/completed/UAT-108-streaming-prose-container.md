---
id: UAT-108
title: "UAT: Replace streaming output pre block with styled prose container in GeneratePage"
status: pending
task: TASK-108
created: 2026-06-26
updated: 2026-06-26
---

# UAT-108 — UAT: Replace streaming output pre block with styled prose container in GeneratePage

implements::[[TASK-108]]

> **Source task**: [[TASK-108]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App is running locally (`pnpm dev` or equivalent)
- [ ] A job exists that has passed the gap report (zero unresolved gaps) so the Generate button is enabled
- [ ] Navigate to `/jobs/<id>/generate` for that job

---

## Test Cases

### UAT-UI-001: Output container is a `<div>`, not a `<pre>`

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the streaming output element is rendered as a `<div>` rather than the old `<pre>` tag so browser monospace-font defaults are not applied.
- **Steps**:
  1. Navigate to the Generate page for a valid job.
  2. Click **Generate Demand Letter**.
  3. Wait for at least the first chunk of output to appear.
  4. Open DevTools (Inspect), select the output container element.
  5. Confirm the element's tag name in the Elements panel.
- **Expected Result**: The output container element is `<div>`, not `<pre>`. No `<pre>` element should be visible anywhere in the output area.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Output container carries the correct Tailwind classes

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the `<div>` carries exactly the prose-styling classes specified in TASK-108.
- **Steps**:
  1. Navigate to the Generate page for a valid job.
  2. Click **Generate Demand Letter** and wait for output to appear.
  3. In DevTools, select the output `<div>` element.
  4. Inspect its `class` attribute in the Elements panel.
- **Expected Result**: The class list contains all of: `whitespace-pre-wrap`, `font-sans`, `text-sm`, `leading-relaxed`, `bg-gray-50`, `p-4`, `rounded`, `mt-6`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: Generated letter text renders as flowing prose (not monospace)

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the letter text is visually readable in a sans-serif font with normal line spacing — not in a code/monospace style.
- **Steps**:
  1. Navigate to the Generate page for a valid job.
  2. Click **Generate Demand Letter** and wait for the full letter to stream in.
  3. Visually inspect the output text in the browser.
- **Expected Result**:
  - Text appears in a proportional sans-serif font (not Courier/monospace).
  - Line spacing is relaxed (comfortable reading rhythm, not tight code output).
  - Long lines of text wrap within the container rather than extending horizontally.
  - The container background is light gray (`bg-gray-50`), which is visually lighter than the old `bg-gray-100`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: Output container renders during streaming (not only after completion)

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the prose container appears as soon as the first chunk arrives, not only after generation completes (`isDone`).
- **Steps**:
  1. Navigate to the Generate page for a valid job.
  2. Click **Generate Demand Letter**.
  3. Watch the page during the streaming phase (before the spinner disappears and post-generation buttons appear).
- **Expected Result**: The `<div>` prose container becomes visible and populates with text during streaming — it does not wait for `isDone` to become true.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-EDGE-001: Output container is absent before generation starts

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the prose container does not render when `output` is empty (before the user clicks Generate).
- **Steps**:
  1. Navigate to the Generate page for a valid job.
  2. Do **not** click Generate.
  3. Inspect the DOM (or simply observe the page).
- **Expected Result**: No output `<div>` or `<pre>` element is present in the DOM. The page shows only the Generate button (and any sufficiency warning if applicable).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

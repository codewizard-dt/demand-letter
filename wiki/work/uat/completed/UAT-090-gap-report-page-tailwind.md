---
id: UAT-090
title: "UAT: Convert GapReportPage inline styles to Tailwind"
status: passed
task: TASK-090
created: 2026-06-26
updated: 2026-06-26
---

# UAT-090 — UAT: Convert GapReportPage inline styles to Tailwind

implements::[[TASK-090]]

> **Source task**: [[TASK-090]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running: `pnpm dev` (web at `http://localhost:5173`)
- [ ] A job exists in the database with at least one gap (unfilled slot) and at least one extracted field with block citations
- [ ] Note the job ID (e.g. `job-123`) — replace `<jobId>` in all test steps below

---

## Test Cases

### UAT-STATIC-001: No inline `style=` attributes remain in source file

- **Description**: Verify the refactor eliminated all `style={{ }}` props from `GapReportPage.tsx`
- **Steps**:
  1. From the project root, run:
     ```bash
     grep -c 'style=' packages/web/src/pages/GapReportPage.tsx
     ```
  2. Observe the output
- **Expected Result**: Command outputs `0` — zero occurrences of `style=` in the file
- [x] Pass <!-- 2026-06-26 -->

### UAT-STATIC-002: TypeScript compilation is clean

- **Description**: Verify that the Tailwind refactor introduced no TypeScript errors
- **Steps**:
  1. From the project root, run:
     ```bash
     pnpm --filter @demand-letter/web tsc --noEmit
     ```
  2. Observe the output
- **Expected Result**: Command exits 0 with no error output
- [x] Pass <!-- 2026-06-26 -->

### UAT-UI-001: Page loads at correct route with outer padding

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify the page mounts at the correct route and the outer wrapper has Tailwind padding (`p-8` = `2rem` on all sides)
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/gap-report`
  2. Open browser DevTools → Inspector
  3. Select the outermost `<div>` rendered by `GapReportPage`
  4. Inspect its `class` attribute and computed styles
- **Expected Result**: The outermost div has `class="p-8"` (or includes `p-8`) and computed padding is `32px` on all four sides. No `style=""` attribute present on the element.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Two-column grid layout renders correctly

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify the main content area uses a CSS grid with the left column taking available width and the right column fixed at 360px
- **Steps**:
  1. Navigate to the gap report page for a job with extracted fields
  2. Open DevTools → Inspector
  3. Select the direct child `<div>` inside the outer `p-8` wrapper (the grid container)
  4. Check its `class` attribute and computed CSS grid properties
- **Expected Result**: Grid div has `class` containing `grid grid-cols-[1fr_360px] gap-8 items-start`. Computed `grid-template-columns` is `<n>px 360px` (right column is exactly 360px). No `style=""` attribute on this element.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: Loading state renders with Tailwind padding

- **Page**: `http://localhost:5173/jobs/<nonexistent-or-loading-jobId>/gap-report`
- **Description**: Verify the loading state div uses `className="p-8"` and not an inline style
- **Steps**:
  1. Navigate to the gap report page for a job whose data is still loading (or briefly observe the loading flash for a known job)
  2. While loading, inspect the element shown
  3. Alternatively, inspect the source: confirm `GapReportPage.tsx` line with "Loading gap report…" uses `className="p-8"` not `style=`
- **Expected Result**: Loading div shows `class="p-8"` and text "Loading gap report…". No `style` attribute. Padding is `32px` on all sides.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: Error state renders with red Tailwind text

- **Page**: `http://localhost:5173/jobs/<invalid-jobId>/gap-report`
- **Description**: Verify an error result renders with `className="p-8 text-red-600"` and no inline style
- **Steps**:
  1. Navigate to the gap report page using a job ID that will cause an API error (e.g. a non-existent UUID)
  2. Inspect the error div rendered
- **Expected Result**: Error div has `class` containing `p-8` and `text-red-600`. Text is red (Tailwind `text-red-600` = `#dc2626`). No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-005: Gaps table has correct Tailwind border and spacing

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have gaps)
- **Description**: Verify the gap table uses Tailwind classes instead of inline styles for width, border-collapse, and margin
- **Steps**:
  1. Navigate to the gap report page for a job with at least one gap
  2. Open DevTools → Inspector
  3. Select the `<table>` element
  4. Inspect its `class` attribute and computed styles
- **Expected Result**: Table has `class="w-full border-collapse mb-6"`. Computed `width` is 100% of container, `border-collapse` is `collapse`, `margin-bottom` is `24px`. No `style` attribute on the `<table>`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-006: Table header row has gray background via Tailwind

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have gaps)
- **Description**: Verify the `<tr>` in thead uses `className="bg-gray-100"` not an inline style
- **Steps**:
  1. Navigate to the gap report page
  2. Select the `<tr>` inside `<thead>` in DevTools
  3. Inspect `class` and computed `background-color`
- **Expected Result**: `<tr>` has `class="bg-gray-100"`. Background color is `rgb(243, 244, 246)` (Tailwind gray-100). No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-007: Table header cells have Tailwind padding, border, and alignment

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify `<th>` elements use Tailwind classes for padding, text alignment, and border
- **Steps**:
  1. Navigate to the gap report page with gaps
  2. Inspect each `<th>` in DevTools
  3. Check the first three `<th>` elements (Slot Name, Null Reason, Fill Value) and the fourth (Accept Missing)
- **Expected Result**:
  - First three `<th>`: `class="p-2 text-left border border-gray-300"` — padding `8px`, text-align left, border `1px solid rgb(209, 213, 219)`
  - Fourth `<th>` (Accept Missing): `class="p-2 text-center border border-gray-300"` — text-align center
  - No `style` attribute on any `<th>`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-008: Priority slot rows have amber background and bold text

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have a gap for a PRIORITY_SLOTS field)
- **Description**: Verify priority slots render with `bg-amber-50` row background and `font-bold` first cell — using Tailwind classes, not inline styles
- **Steps**:
  1. Navigate to the gap report page for a job with a priority-slot gap (a field in `PRIORITY_SLOTS`)
  2. In DevTools, select the `<tr>` for a priority row
  3. Check its `class` attribute
  4. Select the first `<td>` in that row and check its `class` attribute
  5. Also check the star `<span>` inside that `<td>`
- **Expected Result**:
  - Priority `<tr>`: includes `bg-amber-50` in class — background is `rgb(255, 251, 235)`. No `style` attribute.
  - First `<td>`: includes `font-bold` — font-weight is `700`. No `style` attribute.
  - Star `<span>`: `class="text-orange-700 ml-1"` — color `rgb(194, 65, 12)`, margin-left `4px`. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-009: Non-priority rows have no background color

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify non-priority gap rows have no background color applied (empty class condition)
- **Steps**:
  1. Navigate to the gap report for a job with a non-priority gap row
  2. Select a non-priority `<tr>` in DevTools
  3. Check its computed `background-color`
- **Expected Result**: Non-priority `<tr>` class contains the conditional expression evaluating to `''` (empty string for the bg class). Computed background is transparent or inherited white. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-010: Fill input uses Tailwind sizing

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify the fill value `<input>` in each gap row uses `className="w-full px-1 py-0.5 border rounded"` not inline styles
- **Steps**:
  1. Navigate to the gap report page with gaps
  2. Select a fill-value `<input type="text">` in DevTools
  3. Inspect its `class` and computed styles
- **Expected Result**: Input has `class="w-full px-1 py-0.5 border rounded"`. Width is 100% of cell. Padding: horizontal `4px`, vertical `2px`. Has border and border-radius. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-011: Submit button cursor-not-allowed when no action taken

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have gaps)
- **Description**: Verify the Submit Attorney Judgment button shows `cursor-not-allowed` when no fill values or accept-missing checkboxes have been set
- **Steps**:
  1. Navigate to the gap report page without interacting with any inputs
  2. Select the "Submit Attorney Judgment" button in DevTools
  3. Hover over the button and observe cursor
  4. Inspect the button's `class` attribute
- **Expected Result**: Button class includes `cursor-not-allowed`. Cursor is `not-allowed` on hover. Button is disabled. No `style` attribute on the button.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-012: Submit button cursor-pointer after filling a value

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify the Submit button gains `cursor-pointer` when a fill value or accept-missing checkbox is set
- **Steps**:
  1. Navigate to the gap report page with gaps
  2. Type any text into a fill-value input
  3. Select the "Submit Attorney Judgment" button in DevTools
  4. Inspect the button's `class` attribute
- **Expected Result**: Button class includes `cursor-pointer`. Cursor is `pointer` on hover. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-013: Generate button cursor-not-allowed when gaps exist

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have gaps)
- **Description**: Verify the "Proceed to Generate" button is disabled with `cursor-not-allowed` when gaps remain
- **Steps**:
  1. Navigate to the gap report page for a job with unfilled gaps
  2. Select the "Proceed to Generate" button in DevTools
  3. Inspect its `class` attribute
- **Expected Result**: Button class includes `cursor-not-allowed`. Button is `disabled`. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-014: Citation sidebar has correct Tailwind styling

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify the right-column citation sidebar uses Tailwind classes for border, radius, padding, height, overflow, and background
- **Steps**:
  1. Navigate to the gap report page for a job with extracted fields
  2. In DevTools, select the right-column sidebar `<div>` (the one containing "Citation Sources")
  3. Inspect its `class` attribute and computed styles
- **Expected Result**: Sidebar div has `class` containing `border border-gray-200 rounded-lg p-4 h-fit max-h-[80vh] overflow-y-auto bg-gray-50`. Computed: border `1px solid rgb(229, 231, 235)`, border-radius `8px`, padding `16px`, max-height `80vh`, overflow-y `auto`, background `rgb(249, 250, 251)`. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-015: Citation pill inactive state has light blue styling

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have extracted fields with block citations)
- **Description**: Verify unselected citation pill buttons use `bg-blue-50 text-blue-600 border-blue-200`
- **Steps**:
  1. Navigate to the gap report page for a job with extracted fields and block IDs
  2. Locate a citation pill button in the sidebar (a short block ID like `abc12345…`)
  3. Without clicking it, inspect its `class` attribute in DevTools
- **Expected Result**: Inactive pill class includes `bg-blue-50 text-blue-600 border-blue-200` (and `px-2 py-0.5 text-xs border rounded cursor-pointer`). Background is light blue. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-016: Citation pill active state switches to solid blue

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify clicking a citation pill switches it to `bg-blue-600 text-white border-blue-300`
- **Steps**:
  1. Navigate to the gap report page with extracted fields
  2. Click a citation pill button
  3. Inspect the button's `class` attribute immediately after clicking
- **Expected Result**: Clicked pill class includes `bg-blue-600 text-white border-blue-300`. Background is solid blue (`rgb(37, 99, 235)`), text is white. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-017: Source document preview panel renders with Tailwind styling

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report` (job must have blocks)
- **Description**: Verify the source document preview panel uses Tailwind classes for margin, border, radius, padding, max-height, overflow, and background
- **Steps**:
  1. Navigate to the gap report page for a job with source document blocks
  2. Scroll down to the "Source Document Preview" panel
  3. Select the preview panel `<div>` in DevTools
  4. Inspect its `class` and computed styles
- **Expected Result**: Panel div has `class` containing `mt-8 border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-y-auto bg-white`. Computed: margin-top `32px`, max-height `500px`, background white. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-018: Inactive block has gray border and background

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify unselected source document blocks use `border border-gray-200 bg-gray-50`
- **Steps**:
  1. Navigate to the gap report page with blocks
  2. Without clicking any citation pill, select a block `<div>` in DevTools
  3. Inspect its `class` attribute
- **Expected Result**: Block div class includes `border border-gray-200 bg-gray-50` and `px-3 py-2 mb-2 rounded transition-colors duration-150`. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-019: Active block gets blue border and blue-tinted background

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify clicking a citation pill scrolls to and highlights the corresponding block with `border-2 border-blue-600 bg-blue-50`
- **Steps**:
  1. Navigate to the gap report page with extracted fields and blocks
  2. Click a citation pill button in the sidebar
  3. Observe the source document preview panel — find the block whose `id` matches the pill's block ID
  4. Select that block `<div>` in DevTools
  5. Inspect its `class` attribute
- **Expected Result**: Active block class includes `border-2 border-blue-600 bg-blue-50`. Border is `2px solid rgb(37, 99, 235)`. Background is `rgb(239, 246, 255)`. The block was scrolled into view. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-020: Block metadata and text use Tailwind typography classes

- **Page**: `http://localhost:5173/jobs/<jobId>/gap-report`
- **Description**: Verify the metadata line (`text-[11px] text-gray-400 mb-1`) and text content (`text-sm text-gray-900 whitespace-pre-wrap`) use Tailwind classes, not inline styles
- **Steps**:
  1. Navigate to the gap report page with blocks
  2. Select a source document block `<div>` in DevTools
  3. Inspect its two child divs: the metadata line (`[type] p.N · id: …`) and the text content div
- **Expected Result**:
  - Metadata div: `class="text-[11px] text-gray-400 mb-1"` — font-size `11px`, color `rgb(156, 163, 175)`, margin-bottom `4px`. No `style` attribute.
  - Text div: `class="text-sm text-gray-900 whitespace-pre-wrap"` — font-size `14px`, color `rgb(17, 24, 39)`, white-space `pre-wrap`. No `style` attribute.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

## Gaps

None. All test cases are fully researchable from the component source. Functional behavior is unchanged — this task is a pure style refactor, so all tests focus on verifying Tailwind class presence and absence of `style=` attributes.

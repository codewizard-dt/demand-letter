---
id: UAT-104
title: "UAT: Remove PRIORITY_SLOTS dead code from GapReportPage"
status: pending
task: TASK-104
created: 2026-06-26
updated: 2026-06-26
---

# UAT-104 — UAT: Remove PRIORITY_SLOTS dead code from GapReportPage

implements::[[TASK-104]]

> **Source task**: [[TASK-104]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server is running (`pnpm dev` in `packages/web`)
- [ ] At least one job exists with gap report data (status `gap_report_ready` or equivalent, with at least one gap row)
- [ ] You have the job ID for that job (visible from the jobs list page)
- [ ] Navigate to `http://localhost:5173/jobs/<jobId>/gap-report` substituting the real job ID

---

## Test Cases

### UAT-UI-001: Gap report page loads and renders the gaps table
- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies the page still renders correctly after dead code removal — no runtime errors, table visible with gap rows
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/<jobId>/gap-report`
  2. Wait for the page to finish loading (loading spinner should disappear)
  3. Confirm the heading "Gap Report" is visible
  4. Confirm the summary line shows covered/total slot count (e.g. "2 of 5 slots covered")
  5. Confirm the gaps table is visible with at least one data row under the column headers (Slot Name, Null Reason, Fill Value, Accept Missing)
- **Expected Result**: Page loads without a white screen or error card; the gap table is rendered with data rows
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Gap table rows have no amber background styling
- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies the `bg-amber-50` class (amber row highlight for "priority" slots) no longer exists on any `<tr>` in the gaps table — it was dead code and must be gone
- **Steps**:
  1. With the gap report page loaded (see UAT-UI-001), open browser DevTools (F12)
  2. In the Elements panel, inspect the `<tbody>` of the gaps table
  3. Examine each `<tr>` element representing a gap row
  4. Check the `class` attribute on every `<tr>` inside `<tbody>`
- **Expected Result**: No `<tr>` element has `bg-amber-50` in its class list; `<tr>` elements should have no `class` attribute at all (plain `<tr key="...">`)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: Field name cells have no bold font styling
- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies the `font-bold` class (used for "priority" field names) no longer exists on any field-name `<td>` — it was dead code and must be gone
- **Steps**:
  1. With the gap report page loaded, open browser DevTools
  2. In the Elements panel, find the first `<td>` in each gap row (the Slot Name column)
  3. Check the `class` attribute on those `<td>` elements
- **Expected Result**: The Slot Name `<td>` elements have `class="p-2 border border-gray-300"` exactly — no `font-bold` present
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: No orange star icons appear in field name cells
- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies the orange star `★` (`<span className="text-orange-700 ml-1">★</span>`) no longer appears in the field name cells — it was dead code and must be gone
- **Steps**:
  1. With the gap report page loaded, visually scan all rows in the Slot Name column
  2. Also use DevTools to search the DOM: Ctrl+F in Elements panel, search for `★` or `text-orange-700`
- **Expected Result**: No `★` characters appear in the table; no elements with class `text-orange-700` exist anywhere in the gaps table
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-005: Gap report submit workflow still functions
- **Page**: `/jobs/:id/gap-report`
- **Description**: Smoke-tests that the fill/accept form interaction still works after dead code removal (no regression)
- **Steps**:
  1. With the gap report page loaded and at least one gap visible, type a value into the "Fill Value" input field for any gap row
  2. Confirm the "Submit Attorney Judgment" button becomes enabled (not greyed out)
  3. Optionally click the button and verify the submission does not throw a JavaScript console error
- **Expected Result**: Entering a fill value enables the submit button; no JavaScript errors appear in the browser console related to `isPriority` or `PRIORITY_SLOTS`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

## Gaps Report

None. All test cases are directly verifiable from the source code and route configuration:
- Route confirmed: `/jobs/:id/gap-report` from `packages/web/src/App.tsx` line 34
- Component confirmed: `packages/web/src/pages/GapReportPage.tsx`
- Dead code verified removed via typecheck + search_for_pattern (no `isPriority` or `PRIORITY_SLOTS` remaining)

---
id: UAT-101
title: "UAT: Replace raw error strings with actionable error states"
status: pending
task: TASK-101
created: 2026-06-26
updated: 2026-06-26
---

# UAT-101 — UAT: Replace raw error strings with actionable error states

implements::[[TASK-101]]

> **Source task**: [[TASK-101]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running (`pnpm dev` from project root, or `pnpm --filter @demand-letter/web dev`)
- [ ] Web app accessible at `http://localhost:5173`
- [ ] Authenticated user session active (logged in at `/login`)

---

## Test Cases

### UAT-UI-001: GapReportPage shows ErrorCard on query failure
- **Page**: `/jobs/nonexistent-job-id/gap-report`
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies that when the gap report query fails (e.g. job not found), an ErrorCard is rendered instead of a raw error string. The card must show the error message, a "Try again" button, and a "Go home" link.
- **Steps**:
  1. Log in and navigate to `http://localhost:5173/jobs/nonexistent-job-id/gap-report`
  2. Wait for the query to resolve (the page will show a loading state briefly)
  3. Observe the error state rendered on the page
- **Expected Result**:
  - A card with a red border and red background (`border-red-200`, `bg-red-50`) is displayed
  - The card contains the error message text (e.g. "Error: ..." or the API error message) in dark red
  - A red "Try again" button is visible
  - A "Go home" link is visible
  - **No raw `<p className="text-red-600">` or bare text error** is shown on the page
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: GapReportPage ErrorCard "Try again" button triggers a refetch
- **Page**: `/jobs/nonexistent-job-id/gap-report`
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: The "Try again" button on the GapReportPage ErrorCard calls `gapReportQuery.refetch()` to retry the failed request.
- **Steps**:
  1. From the error state in UAT-UI-001, open browser DevTools → Network tab
  2. Click the red "Try again" button on the ErrorCard
  3. Observe the network tab
- **Expected Result**:
  - A new network request is issued to the gap report endpoint
  - The page transitions briefly back to a loading state before returning to the error card (since the job still doesn't exist)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: AnnotatePage shows ErrorCard on query failure (no retry button)
- **Page**: `/jobs/nonexistent-job-id/templates/nonexistent-template-id/annotate`
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies the AnnotatePage uses ErrorCard for its early-return error path. The AnnotatePage passes no `onRetry` prop, so no "Try again" button should appear.
- **Steps**:
  1. Log in and navigate to `http://localhost:5173/jobs/nonexistent-job-id/templates/nonexistent-template-id/annotate`
  2. Wait for the query to fail
  3. Observe the rendered error state
- **Expected Result**:
  - An ErrorCard is displayed with the error message prefixed by `"Error: "` (e.g. `"Error: ..."`)
  - A "Go home" link is visible
  - **No "Try again" button is present** (AnnotatePage passes no `onRetry`)
  - **No raw `<div className="p-8 text-red-600">` or inline error text** is shown
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: GeneratePage shows ErrorCard when generate mutation fails
- **Page**: `/jobs/:id/generate` (a valid or invalid job ID)
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies the GeneratePage uses ErrorCard to display mutation errors (i.e. when the generate API call fails). The card must include a "Try again" button wired to `handleGenerate`.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/nonexistent-job-id/generate`
  2. Click the "Generate Demand Letter" button (it may be enabled or show a disabled reason; if enabled, proceed)
  3. If the API is not running or returns an error, the mutation will fail
  4. Alternatively: open DevTools → Network → block the generate endpoint → click the button
  5. Observe the rendered error state after the mutation returns an error
- **Expected Result**:
  - An ErrorCard is displayed with the string version of the error from `generateMutation.error`
  - A red "Try again" button is visible and clicking it re-invokes `handleGenerate`
  - A "Go home" link is visible
  - **No raw `<p className="mt-4 text-red-600">` tag** is present on the page
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-005: ErrorCard "Go home" link navigates to the jobs list
- **Page**: Any page showing an ErrorCard (e.g. `/jobs/nonexistent-job-id/gap-report`)
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: The "Go home" link on ErrorCard is a React Router `<Link to="/">` that navigates to the jobs list (`/`).
- **Steps**:
  1. Navigate to any page that shows an ErrorCard (e.g. one from UAT-UI-001 or UAT-UI-003)
  2. Click the "Go home" link in the ErrorCard
  3. Observe the resulting page
- **Expected Result**:
  - Browser navigates to `http://localhost:5173/` (the jobs list page)
  - The jobs list page renders normally
  - No full page reload — navigation is client-side (React Router)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-006: ErrorCard visual layout matches design spec
- **Page**: Any page showing an ErrorCard
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies the ErrorCard renders with the correct layout: centered card, red background/border, small red message text, properly spaced buttons.
- **Steps**:
  1. Navigate to any page that shows an ErrorCard (e.g. UAT-UI-001)
  2. Inspect the rendered card visually
- **Expected Result**:
  - Card is centered horizontally with `max-w-md` constraint
  - Card has `mt-16` top margin (appears mid-page, not jammed at top)
  - Card has light red background (`bg-red-50`) and subtle red border (`border-red-200`)
  - Message text is small (`text-sm`), bold (`font-medium`), and dark red (`text-red-700`)
  - Buttons are horizontally centered (`flex justify-center`) with a gap between them
  - "Try again" button (when present) is solid red (`bg-red-600 text-white`)
  - "Go home" link has a gray border (`border-gray-300`) and is non-destructive in appearance
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

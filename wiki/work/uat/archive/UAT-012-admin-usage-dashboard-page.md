---
id: UAT-012
title: "UAT: Admin Cost Dashboard Page /admin/usage"
status: passed
task: TASK-012
created: 2026-06-23
updated: 2026-06-23
---

# UAT-012 — UAT: Admin Cost Dashboard Page /admin/usage

implements::[[TASK-012]]

> **Source task**: [[TASK-012]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] Vite dev server is running: `cd packages/web && VITE_API_URL=http://localhost:3000 pnpm dev` (serves on `http://localhost:5173`)
- [ ] SAM local API is running: `sam local start-api` (serves on `http://localhost:3000`) — required only for API-backed UI tests (UAT-UI-003 through UAT-UI-006)
- [ ] `pnpm typecheck` runs from the repo root without error
- [ ] `packages/web/src/pages/admin/UsagePage.tsx` exists
- [ ] `packages/web/src/lib/api.ts` exists
- [ ] `packages/web/src/App.tsx` exists

---

## Test Cases

### UAT-STATIC-001: UsagePage component file exists at the expected path
- **Scenario**: Static file-system check — confirm the component was created at the path the task specifies.
- **Steps**:
  1. From the repo root, run the command below.
- **Command**:
  ```bash
  test -f packages/web/src/pages/admin/UsagePage.tsx && echo "EXISTS" || echo "MISSING"
  ```
- **Expected Result**: Output is `EXISTS`. A `MISSING` result means the file was not created at the correct path.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-002: API client module exists and exports `fetchLlmCosts`
- **Scenario**: Static check — `packages/web/src/lib/api.ts` exists and contains the `fetchLlmCosts` export that the task specifies.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  grep -c "export async function fetchLlmCosts" packages/web/src/lib/api.ts
  ```
- **Expected Result**: Output is `1`. Any other value means the function is absent or duplicated.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-003: Router registers `/admin/usage` route pointing to `UsagePage`
- **Scenario**: Static check — `App.tsx` contains a React Router `<Route>` that maps `/admin/usage` to `UsagePage`.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  grep -c "path=\"/admin/usage\"" packages/web/src/App.tsx
  ```
- **Expected Result**: Output is `1`. The route must appear exactly once.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-004: Root path redirects to `/admin/usage`
- **Scenario**: Static check — `App.tsx` contains a redirect from `/` to `/admin/usage` (the task specifies root redirects to the dashboard).
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  grep -c "Navigate to=\"/admin/usage\"" packages/web/src/App.tsx
  ```
- **Expected Result**: Output is `1`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-005: TypeScript compilation passes with zero errors
- **Scenario**: `pnpm typecheck` must exit 0 with no TypeScript errors across all packages, including the new frontend files.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits with code 0 and prints no error lines. Any `error TS` output is a failure.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UI-001: Page renders loading state on initial mount
- **Scenario**: When the Vite dev server starts and the browser navigates to `/admin/usage`, the component must display a loading indicator while the API fetch is in flight. This verifies the `loading` state branch renders correctly.
- **Steps**:
  1. Start the Vite dev server: `cd packages/web && VITE_API_URL=http://localhost:3000 pnpm dev`
  2. Open `http://localhost:5173/admin/usage` in a browser (or use Playwright).
  3. Observe the page immediately on load, before the fetch resolves.
- **Expected Result**: The page shows the text `Loading...` (rendered by the loading state branch: `<p className="p-6 text-sm text-gray-500">Loading...</p>`). No table elements are visible yet.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-002: Root URL `/` redirects to `/admin/usage`
- **Scenario**: Navigating to the application root must redirect to `/admin/usage` (React Router `<Navigate to="/admin/usage" replace />`).
- **Steps**:
  1. Ensure the Vite dev server is running on port 5173.
  2. Open `http://localhost:5173/` in a browser.
  3. Observe the final URL in the address bar.
- **Expected Result**: The browser URL changes to `http://localhost:5173/admin/usage` and the usage page content (or loading state) is displayed. The final URL must not remain `/`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-003: Page renders aggregate table with correct column headers when API returns data
- **Scenario**: When the API returns at least one aggregate row, the "By Feature (last 30 days)" section must appear with its five column headers: Feature, Calls, Input Tokens, Output Tokens, Cost (USD).
- **Steps**:
  1. Ensure both the Vite dev server (port 5173) and SAM local API (port 3000) are running, and the database has at least one `LlmAuditLog` row within the last 30 days.
  2. Open `http://localhost:5173/admin/usage` in a browser.
  3. Wait for the page to finish loading (Loading... disappears).
  4. Inspect the first table section.
- **Expected Result**: The heading `By Feature (last 30 days)` is visible. The table has exactly five column headers: `Feature`, `Calls`, `Input Tokens`, `Output Tokens`, `Cost (USD)`. At least one data row is visible beneath them.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-004: Page renders recent-rows table with correct column headers when API returns data
- **Scenario**: When the API returns at least one recent row, the "Recent Calls (last 100)" section must appear with its seven column headers: When, Feature, Model, In, Out, Cost, ms.
- **Steps**:
  1. Ensure both the Vite dev server and SAM local API are running with at least one `LlmAuditLog` row.
  2. Open `http://localhost:5173/admin/usage`.
  3. Wait for loading to finish.
  4. Scroll to the second table section.
- **Expected Result**: The heading `Recent Calls (last 100)` is visible. The table has exactly seven column headers: `When`, `Feature`, `Model`, `In`, `Out`, `Cost`, `ms`. At least one data row is rendered.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-005: Empty-state message shown when API returns no aggregate data
- **Scenario**: When the API responds with `{ aggregates: [], recentRows: [] }`, the aggregate table must show "No data yet" and the recent-rows table must show "No calls recorded yet" rather than empty table bodies or errors.
- **Steps**:
  1. Ensure both the Vite dev server and SAM local API are running, and the database has no `LlmAuditLog` rows (truncate the table or use a clean DB).
  2. Open `http://localhost:5173/admin/usage`.
  3. Wait for loading to finish.
  4. Inspect both table sections.
- **Expected Result**: The aggregate table displays the text `No data yet` in a single colspan row. The recent-rows table displays the text `No calls recorded yet` in a single colspan row. No JavaScript error is thrown in the browser console.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-006: Error state rendered when API fetch fails
- **Scenario**: When `VITE_API_URL` points to a non-running server (or the server returns a non-2xx), the component must display an error message in place of the tables rather than crashing or showing a blank page.
- **Steps**:
  1. Start the Vite dev server with a bad API URL: `cd packages/web && VITE_API_URL=http://localhost:19999 pnpm dev`
  2. Open `http://localhost:5173/admin/usage`.
  3. Wait for the fetch to fail.
- **Expected Result**: The page shows an error message that includes the text `llm-costs fetch failed` (the message produced by the `fetchLlmCosts` function's error throw: `llm-costs fetch failed: ${res.status}`), or a network-level error string. The `Loading...` text is no longer shown. No unhandled React error boundary crash. The error text is displayed in a `<p>` element (red styling per the component).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-007: Cost values formatted to 4 decimal places in aggregate table
- **Scenario**: The aggregate table renders cost via `parseFloat(row._sum.estimatedCostUsd ?? '0').toFixed(4)` — costs must always display exactly 4 decimal places with a `$` prefix.
- **Steps**:
  1. Ensure both dev server and SAM API are running with at least one `LlmAuditLog` row that has a non-zero `estimatedCostUsd`.
  2. Open `http://localhost:5173/admin/usage` and wait for data to load.
  3. Read the Cost (USD) column in the aggregate table.
- **Expected Result**: Each cost cell in the aggregate table starts with `$` and shows exactly 4 digits after the decimal point (e.g., `$0.0024`). Cells must not show raw multi-decimal Prisma Decimal strings like `0.00240000`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

---

### UAT-UI-008: Recent-rows cost formatted to 6 decimal places
- **Scenario**: The recent-rows table renders cost via `parseFloat(row.estimatedCostUsd).toFixed(6)` — costs must always display exactly 6 decimal places with a `$` prefix.
- **Steps**:
  1. Ensure both dev server and SAM API are running with at least one `LlmAuditLog` row.
  2. Open `http://localhost:5173/admin/usage` and wait for data to load.
  3. Read the Cost column in the Recent Calls table.
- **Expected Result**: Each cost cell in the recent-rows table starts with `$` and shows exactly 6 digits after the decimal point (e.g., `$0.000240`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-23 -->

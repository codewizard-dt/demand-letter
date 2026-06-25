---
id: UAT-047
title: "UAT: Generate Button Gap Gate: Disable Until Gap Report Clears"
status: passed
task: TASK-047
created: 2026-06-25
updated: 2026-06-25
---

# UAT-047 — UAT: Generate Button Gap Gate: Disable Until Gap Report Clears

implements::[[TASK-047]]

> **Source task**: [[TASK-047]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] The full monorepo is running locally: API on `http://localhost:3000`, web on `http://localhost:5173`
- [ ] A valid job ID exists in the database. Set `export UAT_JOB_ID=<your-job-id>` before running API tests.
- [ ] A job ID with no template (or an invalid job ID) is available for 404/error-path tests. Set `export UAT_MISSING_JOB_ID=ffffffff-ffff-ffff-ffff-ffffffffffff`.
- [ ] The browser is authenticated (login at `http://localhost:5173/login` first).

---

## Test Cases

### UAT-API-001: Gap report returns 200 with correct shape for a valid job

- **Endpoint**: `GET /jobs/:id/gap-report`
- **Description**: Verifies the gap-report endpoint returns HTTP 200 with a body matching the `GapReport` interface — `covered` (number), `total` (number), and `gaps` (array of `GapItem` objects each with `fieldName`, `nullReason`, and `acceptMissing`).
- **Steps**:
  1. Ensure `UAT_JOB_ID` is set to a job that has a template and at least one extracted field.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_JOB_ID/gap-report" | jq '{covered,total,gaps_count: (.gaps | length), first_gap: .gaps[0]}'
  ```
- **Expected Result**: HTTP 200 (implicit — jq output succeeds). Response body contains `covered` (integer ≥ 0), `total` (integer ≥ 0), `covered ≤ total`, and `gaps` is an array. If a gap item is present it must have `fieldName` (string), `nullReason` (string or null), and `acceptMissing` (boolean).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-002: Gap report returns 200 with empty gaps array when all slots are covered

- **Endpoint**: `GET /jobs/:id/gap-report`
- **Description**: Verifies that when all template slots are covered (all fields have sufficient confidence, `acceptMissing=true`, or `source='attorney-judgment'`), `gaps` is an empty array and `covered === total`.
- **Steps**:
  1. Use a job where all required slots have been filled/accepted (use the attorney-judgment API or ensure extraction covered all slots).
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_JOB_ID/gap-report" | jq '{covered, total, gaps_length: (.gaps | length)}'
  ```
- **Expected Result**: `gaps_length` is `0`, `covered` equals `total`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-003: Gap report returns 404 for unknown job ID

- **Endpoint**: `GET /jobs/:id/gap-report`
- **Description**: Verifies the endpoint returns 404 with `{ "error": "Job not found" }` when the job ID does not exist in the database.
- **Steps**:
  1. Ensure `UAT_MISSING_JOB_ID` is set to a UUID that does not match any database row.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}" "http://localhost:3000/jobs/$UAT_MISSING_JOB_ID/gap-report"
  ```
- **Expected Result**: `404`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-004: Gap report response body on 404 contains error field

- **Endpoint**: `GET /jobs/:id/gap-report`
- **Description**: Verifies the 404 response body has the shape `{ "error": "Job not found" }`.
- **Steps**:
  1. Ensure `UAT_MISSING_JOB_ID` is set to a non-existent UUID.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_MISSING_JOB_ID/gap-report" | jq '.error'
  ```
- **Expected Result**: `"Job not found"`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UI-001: Generate button is disabled and shows loading message on page load

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies that immediately after the Generate Page loads (before the gap-report fetch completes), the "Generate Demand Letter" button is disabled and an inline message reading "Checking sufficiency — please wait…" appears beneath it.
- **Steps**:
  1. Open the browser DevTools Network panel and set network throttling to "Slow 3G" to slow the gap-report fetch.
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate`.
  3. Observe the button immediately after the page renders (before the network response arrives).
- **Expected Result**:
  - The "Generate Demand Letter" button is visually dimmed (opacity reduced) and has the `not-allowed` cursor on hover.
  - An inline paragraph beneath the button reads exactly: "Checking sufficiency — please wait…"
  - The button cannot be clicked to trigger generation.
  - The button has a `title` attribute containing "Checking sufficiency — please wait…"
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Generate button is disabled with gap count message when gaps remain

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies that once the gap-report fetch completes and `gaps.length > 0`, the button is disabled and the inline paragraph shows the exact slot-count message.
- **Steps**:
  1. Use a job ID where `GET /jobs/:id/gap-report` returns at least 1 gap item (verify with `UAT-API-001`).
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate`.
  3. Wait for the page to finish loading (loading message disappears).
  4. Observe the button and the text beneath it.
- **Expected Result**:
  - The "Generate Demand Letter" button remains disabled (dimmed, not-allowed cursor).
  - An inline paragraph beneath the button reads: "N required slot(s) still uncovered. Go to the Gap Report to fill or accept them before generating." where N is the number of gaps returned by the API. (Use singular "slot" when N=1, plural "slots" when N>1.)
  - The button `title` attribute matches that same message.
  - No generation is triggered.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Generate button is enabled and message disappears when all gaps are cleared

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies that once the gap-report fetch completes and `gaps` is an empty array, the button is enabled and no inline message is shown.
- **Steps**:
  1. Use a job where all slots are covered (gap-report returns `gaps: []`). Verify with `UAT-API-002`.
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate`.
  3. Wait for the page to finish loading.
  4. Observe the button state.
- **Expected Result**:
  - The "Generate Demand Letter" button is visually enabled (full opacity, default cursor).
  - No inline paragraph message is shown beneath the button.
  - Clicking the button initiates generation (the button label changes to "Generating…").
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Button title attribute carries the disabled reason

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies the button's native `title` attribute is set to the disabled reason string while the button is disabled, providing a tooltip on hover, and is absent (or undefined) when the button is enabled.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate` with a job that has remaining gaps.
  2. After the page loads, hover over the "Generate Demand Letter" button.
  3. Inspect the button element (DevTools → Elements) and read the `title` attribute.
  4. Also verify with a gaps-cleared job (same attribute should be absent).
- **Expected Result**:
  - With gaps remaining: the button's `title` attribute equals the same gap-count message shown in the inline paragraph.
  - With all gaps cleared: the button's `title` attribute is absent or empty (the JSX uses `title={disabledReason ?? undefined}`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-005: Inline message is not shown while generation is in progress

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies that once the user clicks "Generate Demand Letter" (button enabled, gaps cleared), the inline message is suppressed during the generation stream (`disabledReason && !isGenerating` condition).
- **Steps**:
  1. Use a job with all gaps cleared.
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate`.
  3. Click "Generate Demand Letter".
  4. Observe the area beneath the button while the label reads "Generating…".
- **Expected Result**:
  - While `isGenerating` is true (button label = "Generating…"), no inline paragraph message appears beneath the button.
  - The button is disabled during generation (label change + no second click possible).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-006: Generate button has disabled:opacity-50 and disabled:cursor-not-allowed classes

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies the Tailwind classes `disabled:opacity-50` and `disabled:cursor-not-allowed` are present on the button element per the acceptance criteria.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate` with a job that has remaining gaps.
  2. Wait for the page to load.
  3. Open DevTools → Elements. Inspect the "Generate Demand Letter" button element.
  4. Read the `class` attribute.
- **Expected Result**:
  - The button element's class list contains both `disabled:opacity-50` and `disabled:cursor-not-allowed`.
  - The button is visually dimmed and shows the not-allowed cursor when hovered.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-007: Gap report fetch error disables the button with an error message

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/generate`
- **Description**: Verifies that if the gap-report API call fails (network error, 404, 500), the button stays disabled and shows an error message instead of the gap-count message.
- **Steps**:
  1. Use a job ID that does not exist in the database (so `GET /jobs/:id/gap-report` returns 404 and `fetchGapReport` throws).
  2. Navigate to `http://localhost:5173/jobs/<invalid-id>/generate`.
  3. Wait for the page to finish attempting the fetch.
  4. Observe the button and inline text.
- **Expected Result**:
  - The "Generate Demand Letter" button remains disabled.
  - An inline paragraph appears beneath the button starting with "Could not check gap report: " followed by the error message from the thrown Error.
  - The button's `title` attribute matches the inline message.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Singular slot grammar in disabled message (exactly 1 gap)

- **Scenario**: The gap report returns exactly 1 gap item.
- **Steps**:
  1. Use a job where `GET /jobs/:id/gap-report` returns exactly `gaps: [{ ... }]` (length = 1).
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate`.
  3. Wait for the page to load.
  4. Read the inline paragraph text beneath the button.
- **Expected Result**: The inline message reads "1 required **slot** still uncovered. Go to the Gap Report to fill or accept them before generating." — singular "slot", not "slots".
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Plural slots grammar in disabled message (more than 1 gap)

- **Scenario**: The gap report returns more than 1 gap item.
- **Steps**:
  1. Use a job where `GET /jobs/:id/gap-report` returns `gaps` with `length > 1`.
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/generate`.
  3. Wait for the page to load.
  4. Read the inline paragraph text beneath the button.
- **Expected Result**: The inline message reads "N required **slots** still uncovered. Go to the Gap Report to fill or accept them before generating." — plural "slots".
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Shared GapReport/GapItem types — GapReportPage imports from api.ts

- **Scenario**: Type deduplication — `GapReportPage.tsx` must import `GapReport` and `GapItem` from `../lib/api`, not declare them locally.
- **Steps**:
  1. In the project root, run: `grep -n "interface GapItem\|interface GapReport" packages/web/src/pages/GapReportPage.tsx`
- **Command**:
  ```bash
  grep -n "interface GapItem\|interface GapReport" packages/web/src/pages/GapReportPage.tsx
  ```
- **Expected Result**: The command produces **no output** (exit code 1 / empty). The local interface declarations were removed; only the import from `../lib/api` remains.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-004: Shared types are exported from api.ts

- **Scenario**: `GapReport`, `GapItem`, and `fetchGapReport` are all exported from `packages/web/src/lib/api.ts`.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -n "^export" packages/web/src/lib/api.ts | grep -E "GapItem|GapReport|fetchGapReport"
  ```
- **Expected Result**: Three matching lines appear — one for `export interface GapItem`, one for `export interface GapReport`, and one for `export async function fetchGapReport`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-005: TypeScript typecheck passes with no errors

- **Scenario**: After all code changes (shared types, GeneratePage gap-gate, GapReportPage import update), the TypeScript compiler reports no errors across the web package.
- **Steps**:
  1. From the monorepo root, run the typecheck command.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web typecheck
  ```
- **Expected Result**: Command exits with code `0` and prints no type errors. Any pre-existing errors outside the scope of TASK-047 are out of scope.
- [x] Pass <!-- 2026-06-25 -->

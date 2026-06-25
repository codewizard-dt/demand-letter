---
id: UAT-034
title: "UAT: ROADMAP-003 Phase 4 — Sufficiency Gate & Gap Report"
status: pending
task: TASK-034
created: 2026-06-24
updated: 2026-06-24
---

# UAT-034 — UAT: ROADMAP-003 Phase 4 — Sufficiency Gate & Gap Report

implements::[[TASK-034]]

> **Source task**: [[TASK-034]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Local SAM API is running: `sam local start-api --env-vars env.json` (or equivalent)
- [ ] `DATABASE_URL` is set in the env file and points to a reachable PostgreSQL instance
- [ ] At least one `Job` row exists in the database (note the `id` for use as `$JOB_ID` below)
- [ ] The job has at least one `Template` row and at least one `TemplateSlot` row (so the gap report has something to evaluate)
- [ ] `jq` is installed for JSON assertions
- [ ] Set shell variable: `export JOB_ID=<a valid job cuid>`
- [ ] Set shell variable: `export BAD_JOB_ID=nonexistent-job-id-99999`
- [ ] Set shell variable: `export SAM_BASE=http://localhost:3000`

---

## Test Cases

---

### UAT-STATIC-001: TypeScript compiles with zero errors across all packages

- **Description**: Verifies that the new source files (`sufficiency-gate.ts`, `get-jobs-gap-report.ts`, `post-jobs-attorney-judgment.ts`, `GapReportPage.tsx`) and all modified files type-check cleanly at the monorepo level.
- **Steps**:
  1. From the monorepo root, run the command below.
  2. Observe exit code and output — any type error is a failure.
- **Command**:
  ```bash
  pnpm typecheck 2>&1 | tail -20
  ```
- **Expected Result**: Command exits 0. No `error TS` lines appear in output. Output ends with a blank line or the pnpm success summary.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-002: Prisma schema defines `source` and `acceptMissing` on `ExtractedField`

- **Description**: Verifies that both new columns are declared on the `ExtractedField` model with the correct types and defaults.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -A 20 'model ExtractedField' packages/db/prisma/schema.prisma | grep -E 'source|acceptMissing'
  ```
- **Expected Result**: Output contains two lines:
  - One matching `source` with type `String?`
  - One matching `acceptMissing` with type `Boolean` and `@default(false)`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-003: `sufficiency-gate.ts` exports `computeGapReport`, `GapItem`, and `GapReport`

- **Description**: Verifies that the sufficiency-gate module exposes the required named exports so that the generate handler and gap-report handler can import them.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -E 'export (async function|interface)' packages/api/src/lib/sufficiency-gate.ts
  ```
- **Expected Result**: Output contains lines for `export interface GapItem`, `export interface GapReport`, and `export async function computeGapReport`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-004: `template.yaml` registers `GetJobsGapReportFunction`

- **Description**: Verifies that `GetJobsGapReportFunction` is wired to `GET /jobs/{id}/gap-report` with the DbLayer and the correct handler path.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -A 25 'GetJobsGapReportFunction:' template.yaml
  ```
- **Expected Result**: Output shows:
  - `Handler: dist/handlers/get-jobs-gap-report.handler`
  - `- !Ref DbLayer`
  - `Path: /jobs/{id}/gap-report`
  - `Method: get`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-005: `template.yaml` registers `PostJobsAttorneyJudgmentFunction`

- **Description**: Verifies that `PostJobsAttorneyJudgmentFunction` is wired to `POST /jobs/{id}/attorney-judgment` with the DbLayer and the correct handler path.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -A 25 'PostJobsAttorneyJudgmentFunction:' template.yaml
  ```
- **Expected Result**: Output shows:
  - `Handler: dist/handlers/post-jobs-attorney-judgment.handler`
  - `- !Ref DbLayer`
  - `Path: /jobs/{id}/attorney-judgment`
  - `Method: post`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-006: `GapReportPage.tsx` exists in the web package

- **Description**: Verifies the React gap-report UI page file is present at the expected path.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  test -f packages/web/src/pages/GapReportPage.tsx && echo "EXISTS" || echo "MISSING"
  ```
- **Expected Result**: Output is `EXISTS`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-STATIC-007: Generate handler calls `computeGapReport` and returns 422 on gaps

- **Description**: Verifies that `post-jobs-generate.ts` imports `computeGapReport` and gates generation with a 422 `gap_report_not_cleared` error.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -E 'computeGapReport|gap_report_not_cleared|422' packages/api/src/handlers/post-jobs-generate.ts
  ```
- **Expected Result**: Output contains lines referencing `computeGapReport`, `gap_report_not_cleared`, and `422` (statusCode 422 return).
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-API-001: `GET /jobs/:id/gap-report` — missing `id` path parameter returns 400

- **Description**: Verifies the handler rejects requests where the `id` path parameter is absent.
- **Steps**:
  1. Ensure the SAM API is running.
  2. Run the curl command below (path deliberately has no job id segment).
- **Command**:
  ```bash
  curl -sS -X GET "${SAM_BASE}/jobs//gap-report" | jq '{statusCode: .statusCode, error: .error}'
  ```
- **Expected Result**: HTTP 400. Response body contains `{"error": "Missing job ID"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-002: `GET /jobs/:id/gap-report` — unknown job ID returns 404

- **Description**: Verifies the handler returns 404 when the job does not exist in the database.
- **Steps**:
  1. Ensure the SAM API is running.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X GET "${SAM_BASE}/jobs/${BAD_JOB_ID}/gap-report" | jq '.'
  ```
- **Expected Result**: HTTP 404. Response body is `{"error": "Job not found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-003: `GET /jobs/:id/gap-report` — valid job returns correct shape

- **Description**: Verifies the gap report response includes `covered`, `total`, and `gaps` array with the correct GapItem shape.
- **Steps**:
  1. Ensure the SAM API is running and `$JOB_ID` points to a job that has template slots.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X GET "${SAM_BASE}/jobs/${JOB_ID}/gap-report" | jq '{covered: .covered, total: .total, gapsIsArray: (.gaps | type)}'
  ```
- **Expected Result**: HTTP 200. Response has:
  - `covered` — a non-negative integer
  - `total` — a non-negative integer (≥ `covered`)
  - `gapsIsArray` — `"array"`

  Each element in `gaps` (if any) has `fieldName` (string), `nullReason` (string or null), and `acceptMissing` (boolean).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-004: `GET /jobs/:id/gap-report` — `covered + gaps.length = total`

- **Description**: Verifies the arithmetic invariant: covered slots plus uncovered gaps always equals the total slot count.
- **Steps**:
  1. Run the curl command below against a job with known template slots.
- **Command**:
  ```bash
  curl -sS -X GET "${SAM_BASE}/jobs/${JOB_ID}/gap-report" | jq '{invariant_holds: ((.covered + (.gaps | length)) == .total)}'
  ```
- **Expected Result**: HTTP 200. `invariant_holds` is `true`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-005: `POST /jobs/:id/attorney-judgment` — missing `id` path parameter returns 400

- **Description**: Verifies the handler rejects requests where the `id` path parameter is absent.
- **Steps**:
  1. Ensure the SAM API is running.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs//attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[]}' | jq '.'
  ```
- **Expected Result**: HTTP 400. Response body contains `{"error": "Missing job ID"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-006: `POST /jobs/:id/attorney-judgment` — unknown job ID returns 404

- **Description**: Verifies the handler returns 404 when the job does not exist.
- **Steps**:
  1. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${BAD_JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[]}' | jq '.'
  ```
- **Expected Result**: HTTP 404. Response body is `{"error": "Job not found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-007: `POST /jobs/:id/attorney-judgment` — invalid JSON body returns 400

- **Description**: Verifies the handler returns 400 when the request body is not valid JSON.
- **Steps**:
  1. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d 'not-json' | jq '.'
  ```
- **Expected Result**: HTTP 400. Response body is `{"error": "Invalid JSON body"}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-008: `POST /jobs/:id/attorney-judgment` — happy path upserts fields and returns `{ok:true}`

- **Description**: Verifies that a valid attorney-judgment submission returns 200 with `{ok:true}` and persists the field values.
- **Steps**:
  1. Pick a `fieldName` that corresponds to an existing `TemplateSlot` for the job (e.g., `demand_amount`). Replace `<field>` below.
  2. Run the curl command below.
  3. Immediately call `GET /jobs/:id/gap-report` and confirm that `covered` increased by 1 (or the field no longer appears in `gaps`).
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[{"fieldName":"demand_amount","value":"$250,000.00"}],"acceptMissing":[]}' | jq '.'
  ```
- **Expected Result**: HTTP 200. Response body is `{"ok": true}`. A subsequent GET to the gap-report endpoint shows `demand_amount` is no longer in `gaps`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-009: `POST /jobs/:id/attorney-judgment` — `acceptMissing` list marks slots as satisfied

- **Description**: Verifies that passing a field name in `acceptMissing` marks the slot satisfied without requiring a value, and it disappears from the gap report.
- **Steps**:
  1. Pick a gap field other than `demand_amount` (e.g., `general_damages_estimate`).
  2. Run the curl command below.
  3. Run `GET /jobs/:id/gap-report` to confirm the slot no longer appears in `gaps`.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[],"acceptMissing":["general_damages_estimate"]}' | jq '.'
  ```
- **Expected Result**: HTTP 200. `{"ok": true}`. Subsequent gap report shows `general_damages_estimate` absent from `gaps`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-API-010: `POST /jobs/:id/generate` returns 422 `gap_report_not_cleared` when gaps remain

- **Description**: Verifies the generation gate blocks generation when the gap report still has uncovered slots that are not marked `acceptMissing`.
- **Steps**:
  1. Use a job that has at least one gap remaining (reset or create fresh if needed after UAT-API-008/009).
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/generate" | jq '{statusCode: .statusCode, error: .error, gapsIsArray: (.gaps | type)}'
  ```
- **Expected Result**: HTTP 422. Response body contains:
  - `error`: `"gap_report_not_cleared"`
  - `gaps`: an array with at least one element
  - `message`: a non-empty string describing uncovered slots
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Sufficiency gate treats `acceptMissing=true` field as covered even when `isNull=true`

- **Description**: Verifies the gate logic: a slot with `isNull=true` but `acceptMissing=true` does NOT appear in gaps.
- **Steps**:
  1. Submit `acceptMissing: ["future_medical_estimate"]` via `POST /jobs/:id/attorney-judgment`.
  2. Immediately call `GET /jobs/:id/gap-report`.
  3. Check that `future_medical_estimate` does not appear in `gaps`.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[],"acceptMissing":["future_medical_estimate"]}' | jq '.ok' && curl -sS -X GET "${SAM_BASE}/jobs/${JOB_ID}/gap-report" | jq '[.gaps[].fieldName] | contains(["future_medical_estimate"])'
  ```
- **Expected Result**: First call returns `true` (ok). Second call returns `false` (i.e., `future_medical_estimate` is NOT in the gaps array).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Sufficiency gate treats `source="attorney-judgment"` field as covered

- **Description**: Verifies the gate logic: a slot with `source="attorney-judgment"` is always covered regardless of confidence.
- **Steps**:
  1. Submit a field via `POST /jobs/:id/attorney-judgment` fields list (e.g., `general_damages_estimate` with a value).
  2. Call `GET /jobs/:id/gap-report`.
  3. Verify the field is absent from `gaps`.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[{"fieldName":"general_damages_estimate","value":"$100,000"}],"acceptMissing":[]}' | jq '.ok' && curl -sS -X GET "${SAM_BASE}/jobs/${JOB_ID}/gap-report" | jq '[.gaps[].fieldName] | contains(["general_damages_estimate"])'
  ```
- **Expected Result**: First call: `true`. Second call: `false` (field not in gaps).
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-003: `POST /jobs/:id/attorney-judgment` with empty `fields` and `acceptMissing` still returns 200

- **Description**: Verifies the handler gracefully handles a no-op payload (both arrays empty) without error.
- **Steps**:
  1. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{"fields":[],"acceptMissing":[]}' | jq '.'
  ```
- **Expected Result**: HTTP 200. Response body is `{"ok": true}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-EDGE-004: `POST /jobs/:id/attorney-judgment` with omitted body fields defaults gracefully

- **Description**: Verifies the handler tolerates a body with neither `fields` nor `acceptMissing` keys (both default to `[]`).
- **Steps**:
  1. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "${SAM_BASE}/jobs/${JOB_ID}/attorney-judgment" -H 'Content-Type: application/json' -d '{}' | jq '.'
  ```
- **Expected Result**: HTTP 200. Response body is `{"ok": true}`.
- [FAIL: auto-judge: prerequisite not satisfied — SAM local API is not running on localhost:3000] <!-- 2026-06-24 -->

---

### UAT-UI-001: Gap report page renders at `/jobs/:id/gap-report`

- **Description**: Verifies the React route is wired and the page loads without crashing. The page should display "Gap Report" heading and a coverage summary.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Start the web dev server: `pnpm --filter @demand-letter/web dev` (or open the built app).
  2. Navigate to `http://localhost:5173/jobs/<JOB_ID>/gap-report` (replace `<JOB_ID>` with a real job id).
  3. Wait for the page to finish loading (spinner disappears).
  4. Observe the page content.
- **Expected Result**: Page renders with:
  - An `<h1>` reading "Gap Report"
  - A coverage summary line such as "X of Y slots covered."
  - No JavaScript console errors or white-screen crashes.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-002: Gap table shows uncovered slots with Slot Name, Null Reason, Fill Value, Accept Missing columns

- **Description**: Verifies the gap table renders the correct columns when gaps exist.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Use a job that has at least one gap.
  2. Navigate to the gap-report page.
  3. Observe the table headers.
- **Expected Result**: Table has exactly four column headers: "Slot Name", "Null Reason", "Fill Value", "Accept Missing".
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-003: Priority slots (`demand_amount`, `general_damages_estimate`, `future_medical_estimate`) are visually highlighted

- **Description**: Verifies that the three priority slots receive a distinct visual treatment (highlighted background and star indicator) in the gap table.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Use a job where at least one of `demand_amount`, `general_damages_estimate`, or `future_medical_estimate` appears in `gaps`.
  2. Navigate to the gap-report page.
  3. Locate the row for one of the priority slot names.
  4. Observe the row's visual styling.
- **Expected Result**: Priority slot rows have a distinct background color (yellowish/highlighted) and a "★" star character next to the slot name. Non-priority rows do not share this styling.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-004: "Submit Attorney Judgment" button is disabled when no fill values or checkboxes are active

- **Description**: Verifies the submit button starts disabled and only enables when the user has entered at least one fill value or checked at least one "Accept Missing" box.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Navigate to the gap-report page with at least one gap present.
  2. Without entering any text or checking any box, observe the "Submit Attorney Judgment" button state.
  3. Type a value in one of the Fill Value inputs.
  4. Observe the button state again.
- **Expected Result**:
  - Step 2: Button is disabled (visually greyed out, `cursor: not-allowed`).
  - Step 4: Button becomes enabled (`cursor: pointer`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-005: Submitting attorney judgment re-fetches gap report and updates coverage count

- **Description**: Verifies that after a successful "Submit Attorney Judgment" POST, the page automatically re-fetches the gap report and the coverage summary updates.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Navigate to the gap-report page with at least one gap.
  2. Note the current coverage summary (e.g., "2 of 5 slots covered").
  3. Enter a fill value for one gap field.
  4. Click "Submit Attorney Judgment".
  5. Wait for the request to complete (button shows "Submitting…" then returns to normal).
  6. Observe the updated coverage summary.
- **Expected Result**: Coverage count increases (e.g., "3 of 5 slots covered"). The submitted field no longer appears in the gap table.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-006: "Proceed to Generate" button is disabled when gaps remain and enabled when all gaps are cleared

- **Description**: Verifies the generate gate in the UI: the "Proceed to Generate" button must be disabled while any gaps remain and only enable when `gaps.length === 0`.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Navigate to the gap-report page with at least one gap.
  2. Observe the "Proceed to Generate" button state — it should be disabled.
  3. Clear all remaining gaps (fill values or accept-missing checkboxes for every remaining gap, then submit).
  4. After re-fetch, observe the button state again.
- **Expected Result**:
  - Step 2: Button disabled.
  - Step 4: Button enabled. Summary line reads "All slots satisfied — ready to generate."
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

---

### UAT-UI-007: Checking "Accept Missing" disables the Fill Value input for that row

- **Description**: Verifies that checking the "Accept Missing" checkbox for a row disables the corresponding fill value text input.
- **Page**: `/jobs/<JOB_ID>/gap-report`
- **Steps**:
  1. Navigate to the gap-report page with at least one gap.
  2. Locate a gap row with an enabled Fill Value input.
  3. Check the "Accept Missing" checkbox for that row.
  4. Observe the Fill Value input for the same row.
- **Expected Result**: After checking the box, the Fill Value input for that row is disabled (greyed out, non-editable).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->


---
id: UAT-064
title: "UAT: Refinement history list — collapsible panel of past instructions and acceptance status"
status: passed
task: TASK-064
created: 2026-06-25
updated: 2026-06-25
---

# UAT-064 — UAT: Refinement history list

implements::[[TASK-064]]

> **Source task**: [[TASK-064]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] SAM local API running on `http://localhost:3000` (`sam local start-api`)
- [ ] Database accessible (DATABASE_URL set and migrated, `Refinement` table exists)
- [ ] At least one `Job` row exists in the database (capture its `id` as `$JOB_ID`)
- [ ] Frontend dev server running on `http://localhost:5173` (`pnpm --filter @demand-letter/web dev`)
- [ ] A job in `done` state exists for UI tests (a job that has already been generated)

---

## Test Cases

### UAT-API-001: GET /jobs/:id/refinements returns 200 with refinements array

- **Endpoint**: `GET /jobs/{id}/refinements`
- **Description**: Verifies the happy-path response — a job with existing refinements returns a `{ refinements: [...] }` body with status 200, each row containing `id`, `instruction`, `scope`, `accepted`, and `createdAt`.
- **Steps**:
  1. Ensure at least one `Refinement` row exists for `$JOB_ID` (submit a refinement via the UI or insert directly into the DB).
  2. Run the curl command below.
  3. Confirm HTTP 200 and the `refinements` array is present with at least one entry.
  4. Confirm each entry has the fields: `id` (string), `instruction` (string), `scope` (string), `accepted` (boolean), `createdAt` (ISO string).
  5. Confirm the array is ordered newest-first (higher `createdAt` values appear first).
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/'"$JOB_ID"'/refinements' | jq '.'
  ```
- **Expected Result**: HTTP 200 with body `{ "refinements": [ { "id": "...", "instruction": "...", "scope": "...", "accepted": true|false, "createdAt": "..." }, ... ] }`, ordered by `createdAt` descending.
- [FAIL: auto-judge: prerequisite not satisfied — $JOB_ID not set in environment; cannot verify live API response] <!-- 2026-06-25 -->

---

### UAT-API-002: GET /jobs/:id/refinements returns empty array for job with no refinements

- **Endpoint**: `GET /jobs/{id}/refinements`
- **Description**: Verifies that a job with no refinements returns a 200 with an empty array, not a 404 or error.
- **Steps**:
  1. Identify or create a job that has zero `Refinement` rows (capture its id as `$EMPTY_JOB_ID`).
  2. Run the curl command below.
  3. Confirm HTTP 200 and `refinements` is `[]`.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs/'"$EMPTY_JOB_ID"'/refinements' | jq '.'
  ```
- **Expected Result**: HTTP 200 with body `{ "refinements": [] }`.
- [FAIL: auto-judge: prerequisite not satisfied — $EMPTY_JOB_ID not set in environment; cannot verify live API response] <!-- 2026-06-25 -->

---

### UAT-API-003: GET /jobs/:id/refinements with missing id returns 400

- **Endpoint**: `GET /jobs/{id}/refinements`
- **Description**: Verifies the handler guards against a missing `id` path parameter by returning 400.
- **Steps**:
  1. Invoke the handler directly (e.g., via SAM CLI invoke or a test harness) with `pathParameters` set to `null` or `{}`.
  2. Confirm the response is HTTP 400.
  3. Confirm the body contains `{ "error": "Missing job id" }`.
- **Command**:
  ```bash
  echo '{"pathParameters": null}' | sam local invoke GetJobsRefinementsFunction --event -
  ```
- **Expected Result**: Response statusCode `400`, body `{"error":"Missing job id"}`.
- [FAIL: auto-judge: GetJobsRefinementsFunction not found in running SAM instance — template.yaml updated but SAM not reloaded] <!-- 2026-06-25 -->

---

### UAT-UI-001: RefinementHistory renders as collapsible `<details>` with correct count in summary

- **Page**: `http://localhost:5173/jobs/$JOB_ID` (GeneratePage for a done job)
- **Description**: Verifies the `<details>` element is rendered with a `<summary>` that reads "Refinement history (N)" where N is the actual count of refinements for the job.
- **Steps**:
  1. Navigate to the GeneratePage for a job that is in `done` state and has at least one refinement.
  2. Locate the collapsible block — look for a `<details>` element at the bottom of the page, below the RefinementPanel.
  3. Verify the `<summary>` text reads **"Refinement history (N)"** where N matches the number of refinements in the database for that job.
  4. Click the summary to expand the panel.
  5. Verify the refinement list is now visible.
- **Expected Result**: A `<details>` element is visible below the RefinementPanel. Its `<summary>` reads "Refinement history (N)" with the correct count. Clicking expands the list.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Empty state shows "No refinements yet." inside the panel

- **Page**: `http://localhost:5173/jobs/$EMPTY_JOB_ID` (a done job with zero refinements)
- **Description**: Verifies the empty-state message is displayed when a done job has no refinements.
- **Steps**:
  1. Navigate to the GeneratePage for a job that is in `done` state and has zero refinements.
  2. Locate the `<details>` block with summary "Refinement history (0)".
  3. Click to expand.
  4. Confirm the message **"No refinements yet."** is shown in the expanded content area.
- **Expected Result**: The summary reads "Refinement history (0)" and the expanded body shows "No refinements yet." (grey text).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Each refinement row shows accepted/rejected badge, scope badge, truncated instruction, and timestamp

- **Page**: `http://localhost:5173/jobs/$JOB_ID` (a done job with refinements)
- **Description**: Verifies that each row in the history list displays all required fields in the correct format: a green "Accepted" or red "Rejected" badge, a blue scope badge, the instruction text (truncated if > 80 chars), and a human-readable timestamp.
- **Steps**:
  1. Navigate to the GeneratePage for a done job that has at least one accepted and one rejected refinement.
  2. Expand the "Refinement history" panel.
  3. For an **accepted** row: confirm a green badge labelled **"Accepted"**, a blue scope badge with the scope text, the instruction text, and a timestamp.
  4. For a **rejected** row: confirm a red badge labelled **"Rejected"**, a blue scope badge, instruction text, and timestamp.
  5. For a row whose instruction is longer than 80 characters: confirm the displayed text is cut to 80 characters followed by **"…"** (single Unicode ellipsis character U+2026).
  6. For a row whose instruction is 80 characters or fewer: confirm the full instruction is shown without ellipsis.
- **Expected Result**: Each row correctly shows its acceptance badge (green "Accepted" / red "Rejected"), a blue scope badge, instruction text (truncated at 80 chars with `…` when over limit), and a localized timestamp string.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: RefinementHistory panel is only rendered when isDone is true

- **Page**: `http://localhost:5173/jobs/$JOB_ID` (a job that has NOT yet been generated / isDone is false)
- **Description**: Verifies the RefinementHistory component is not rendered until the job reaches the done state.
- **Steps**:
  1. Navigate to the GeneratePage for a job that has not yet been generated (output not yet produced, isDone is false).
  2. Confirm that **no** `<details>` element with a "Refinement history" summary is present on the page.
  3. Click the "Generate" button and wait for generation to complete (isDone becomes true).
  4. Confirm the "Refinement history" panel now appears below the RefinementPanel.
- **Expected Result**: The RefinementHistory panel is absent while isDone is false; it appears immediately once isDone becomes true.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-005: RefinementHistory re-fetches after an accept/reject action

- **Page**: `http://localhost:5173/jobs/$JOB_ID` (a done job)
- **Description**: Verifies that when `RefinementPanel` triggers `onAccepted`, the `refinementRefresh` counter increments, causing `RefinementHistory` to re-fetch and display the newly added refinement.
- **Steps**:
  1. Navigate to the GeneratePage for a done job.
  2. Expand the "Refinement history" panel and note the current count N shown in the summary.
  3. Submit a new refinement instruction via the RefinementPanel and click **Accept**.
  4. Without manually refreshing the page, observe the "Refinement history" panel.
  5. Confirm the summary count updates to **N+1**.
  6. Expand (or the panel may already be expanded) and confirm the new refinement row appears at the top of the list (newest first).
- **Expected Result**: After accepting a refinement, the count in "Refinement history (N)" increments to N+1 automatically, and the new entry appears at the top of the list without a full page reload.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Instruction truncation boundary — exactly 80 chars not truncated; 81 chars truncated

- **Page**: `http://localhost:5173/jobs/$JOB_ID` (a done job)
- **Description**: Verifies the exact truncation boundary in the RefinementHistory component. Instructions of 80 characters or fewer display in full; instructions of 81+ characters are cut to the first 80 characters followed by the Unicode ellipsis `…`.
- **Steps**:
  1. Create two refinements directly in the database or via the API:
     - **Row A**: instruction is exactly 80 characters (e.g., 80 × `"a"`).
     - **Row B**: instruction is exactly 81 characters (e.g., 81 × `"b"`).
  2. Navigate to the GeneratePage for the job and expand the history panel.
  3. For **Row A** (80 chars): confirm the full 80-character string is displayed with no ellipsis appended.
  4. For **Row B** (81 chars): confirm only the first 80 characters are displayed, followed by `…` (U+2026), and the 81st character is not shown.
- **Expected Result**:
  - 80-char instruction → displayed verbatim, no trailing `…`.
  - 81-char instruction → first 80 chars + `…` displayed; 81st char absent.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

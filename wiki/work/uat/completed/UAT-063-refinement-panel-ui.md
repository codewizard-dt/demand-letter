---
id: UAT-063
title: "UAT: Refinement panel UI — instruction input, SSE consumer, inline diff, accept/revert buttons"
status: pending
task: TASK-063
created: 2026-06-25
updated: 2026-06-25
---

# UAT-063 — UAT: Refinement panel UI

implements::[[TASK-063]]

> **Source task**: [[TASK-063]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Frontend dev server running: `pnpm --filter @demand-letter/web dev` (listens on `http://localhost:5173`)
- [ ] API running locally: `sam local start-api` (listens on `http://localhost:3000`)
- [ ] A job with a **completed** generation exists in the database; export its ID: `export JOB_ID=<uuid>`
- [ ] AWS credentials configured (Bedrock calls require valid credentials for the refine endpoint)
- [ ] A refinement record exists for accept/reject tests; export its ID: `export REFINEMENT_ID=<uuid>` (obtain from DB after running UAT-API-001, or query `SELECT id FROM refinements WHERE job_id = '$JOB_ID' ORDER BY created_at DESC LIMIT 1`)

---

## Test Cases

### UAT-API-001: POST /jobs/:id/refine — valid instruction returns 200 SSE stream

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: A valid instruction triggers Bedrock generation, creates a Refinement record, and returns the result as a text/event-stream SSE response. Chunks arrive as `data: <text>` events; the stream ends with `event: complete`.
- **Steps**:
  1. Ensure `$JOB_ID` points to a job with generated output (`jobs.output IS NOT NULL`).
  2. Run the curl command below. The response will be delayed while Bedrock generates; expect the full SSE body once the Lambda returns.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Make the demand amount more assertive"}'
  ```
- **Expected Result**: HTTP 200. Response body contains one or more lines of the form `data: <text>` followed by a final `event: complete` line. Content-Type header is `text/event-stream`. A new row is inserted in the `refinements` table with `before_text` = the previous job output and `accepted = false`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-API-002: POST /jobs/:id/refine with scope — scoped instruction accepted

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: When `scope` is set to a specific section name, the backend appends a scope suffix to the LLM prompt and the instruction is processed without error.
- **Steps**:
  1. Ensure `$JOB_ID` points to a job with generated output.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Strengthen the language","scope":"damages"}'
  ```
- **Expected Result**: HTTP 200. SSE body returned as in UAT-API-001. The `refinements` table row has `scope = 'damages'`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-API-003: POST /jobs/:id/refine — missing instruction returns 400

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Omitting the `instruction` field must be rejected with a 400 error.
- **Steps**:
  1. Run the curl command below with an empty instruction.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{}'
  ```
- **Expected Result**: HTTP 400. Body: `{"error":"Missing instruction"}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-API-004: POST /jobs/:id/refine — non-existent job returns 404

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Requesting refinement for a job that does not exist returns 404.
- **Steps**:
  1. Run the curl command below with a fabricated job ID.
- **Command**:
  ```bash
  curl -sS -X POST 'http://localhost:3000/jobs/00000000-0000-0000-0000-000000000000/refine' -H 'Content-Type: application/json' -d '{"instruction":"anything"}'
  ```
- **Expected Result**: HTTP 404. Body: `{"error":"Job not found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-API-005: POST /jobs/:id/refine — job without output returns 422

- **Endpoint**: `POST /jobs/{id}/refine`
- **Description**: Requesting refinement for a job that exists but has no generated output returns 422 Unprocessable Entity.
- **Steps**:
  1. Identify or create a job with `output IS NULL`; export `export NO_OUTPUT_JOB_ID=<uuid>`.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$NO_OUTPUT_JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"anything"}'
  ```
- **Expected Result**: HTTP 422. Body: `{"error":"Job output not yet generated"}`.
- [FAIL: auto-judge: prerequisite not satisfied — NO_OUTPUT_JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-API-006: PATCH /jobs/:id/refine/:refinement_id/accept — marks accepted and updates job output

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Accepting a refinement sets `refinements.accepted = true` and updates `jobs.output` to `refinements.after_text` in a single transaction.
- **Steps**:
  1. Ensure `$REFINEMENT_ID` is a valid refinement for `$JOB_ID` (from UAT-API-001).
  2. Run the curl command below.
  3. Verify in the DB: `SELECT accepted FROM refinements WHERE id = '$REFINEMENT_ID'` should be `true`; `SELECT output FROM jobs WHERE id = '$JOB_ID'` should equal `refinements.after_text`.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/refine/$REFINEMENT_ID/accept"
  ```
- **Expected Result**: HTTP 200. Body: `{"ok":true}`. Database reflects the transaction described above.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID and REFINEMENT_ID env vars not set] <!-- 2026-06-25 -->

---

### UAT-API-007: PATCH /jobs/:id/refine/:refinement_id/reject — marks not accepted

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/reject`
- **Description**: Rejecting a refinement sets `refinements.accepted = false` (idempotent) and does not change `jobs.output`.
- **Steps**:
  1. Ensure `$REFINEMENT_ID` is a valid refinement for `$JOB_ID`.
  2. Run the curl command below.
  3. Verify: `SELECT accepted FROM refinements WHERE id = '$REFINEMENT_ID'` remains `false`.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/refine/$REFINEMENT_ID/reject"
  ```
- **Expected Result**: HTTP 200. Body: `{"ok":true}`. `jobs.output` is unchanged.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID and REFINEMENT_ID env vars not set] <!-- 2026-06-25 -->

---

### UAT-API-008: PATCH accept — wrong job ID returns 403

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Using a `jobId` that does not own the refinement record must be rejected with 403.
- **Steps**:
  1. Use the correct `$REFINEMENT_ID` but substitute a different (valid) job ID.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/00000000-0000-0000-0000-000000000000/refine/$REFINEMENT_ID/accept"
  ```
- **Expected Result**: HTTP 403. Body: `{"error":"refinement_job_mismatch"}`.
- [FAIL: auto-judge: prerequisite not satisfied — REFINEMENT_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-API-009: PATCH accept — non-existent refinement returns 404

- **Endpoint**: `PATCH /jobs/{id}/refine/{refinement_id}/accept`
- **Description**: Requesting accept for a refinement that does not exist returns 404.
- **Steps**:
  1. Run the curl command below with a fabricated refinement ID.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/refine/00000000-0000-0000-0000-000000000000/accept"
  ```
- **Expected Result**: HTTP 404. Body: `{"error":"refinement_not_found"}`.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-UI-001: Refinement panel is hidden before generation completes

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: The `RefinementPanel` must not be visible on a job page where `isDone` is `false` (i.e., before the "Generate" button has been clicked and the SSE stream has finished).
- **Steps**:
  1. Navigate to a **newly created** job's generate page (no generation yet, so `isDone = false`).
  2. Observe the page content.
- **Expected Result**: No element with heading "Refine Letter" is present in the DOM. The panel is entirely absent.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Refinement panel appears after generation completes

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate`
- **Description**: Once a letter has been generated and `isDone` becomes `true`, the refinement panel is rendered below the letter output.
- **Steps**:
  1. Navigate to the generate page for a job that has already produced a letter (or generate one now and wait for streaming to finish).
  2. Observe the page below the letter `<pre>` block.
- **Expected Result**: A card with heading **"Refine Letter"** is visible. It contains a textarea, a "Scope:" label with a dropdown, and a "Refine" button.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Scope dropdown contains all expected options

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (letter generated, panel visible)
- **Description**: The Scope dropdown must present exactly the five options defined in `SCOPE_OPTIONS`.
- **Steps**:
  1. With the Refinement Panel visible, click the "Scope:" dropdown.
  2. List all visible options.
- **Expected Result**: The dropdown contains exactly: **All**, **Medical Narrative**, **Damages**, **Liability**, **Demand Amount** (in that order). Default selected is "All".
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Refine button disabled when instruction textarea is empty

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (panel visible)
- **Description**: The "Refine" button must be disabled when the instruction textarea is empty or contains only whitespace.
- **Steps**:
  1. With the panel visible and the textarea empty, observe the "Refine" button state.
  2. Type only spaces into the textarea; observe the button state.
- **Expected Result**: The "Refine" button is disabled (not clickable) in both cases.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-005: Typing an instruction and clicking Refine shows loading spinner and streams text

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (panel visible)
- **Description**: After submitting an instruction, the panel shows a loading spinner and begins displaying streamed text in a `<pre>` block as the SSE response arrives.
- **Steps**:
  1. Type `Make the demand amount more assertive` into the instruction textarea.
  2. Click **Refine**.
  3. Observe the panel immediately after clicking.
  4. Wait for the response to finish streaming.
- **Expected Result**:
  - Immediately after click: a spinning indicator and the text "Refining…" appear; the textarea, scope dropdown, and Refine button are all disabled.
  - As chunks arrive: text accumulates in a `<pre>` block below the controls.
  - Once complete: the spinner disappears; the textarea and dropdown re-enable.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-006: After streaming, diff toggle and Accept/Revert buttons appear

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (refinement just completed)
- **Description**: When streaming finishes and `refinedText` is non-empty, the panel must show a "Show Diff" toggle button along with "Accept" and "Revert" action buttons.
- **Steps**:
  1. Complete UAT-UI-005 so that a refinement result is displayed.
  2. Observe the panel controls after streaming completes.
- **Expected Result**: Three buttons are visible: **Show Diff**, **Accept** (green), and **Revert** (red outlined). The refined text is still visible in the `<pre>` block.
- **Note**: Per the requirement (TASK-063 step 3), Accept and Revert should be enabled once `refinementId` is received. See UAT-EDGE-001 — there is a known implementation gap that may cause these buttons to be disabled.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-007: Show Diff toggle renders colored line-level diff

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (refinement completed, buttons visible)
- **Description**: Clicking "Show Diff" switches from the plain text `<pre>` view to a line-by-line diff view with color-coded additions and removals.
- **Steps**:
  1. With refined text displayed, click **Show Diff**.
  2. Observe the diff area.
  3. Click **Show Text** to toggle back.
  4. Observe that plain text returns.
- **Expected Result**:
  - After clicking Show Diff: added lines have a green background (`bg-green-100`), removed lines have a red background (`bg-red-100`) with strikethrough, unchanged lines are plain. Each line is prefixed with `+ `, `- `, or two spaces respectively.
  - After clicking Show Text: the `<pre>` block with the plain refined text reappears; the diff view disappears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-008: Accept button calls accept endpoint and updates parent letter text

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (refinement completed, Accept enabled)
- **Description**: Clicking Accept calls `PATCH /jobs/:id/refine/:refinementId/accept` and replaces the displayed letter text with the refined text via `onAccepted`.
- **Steps**:
  1. With a completed refinement, note the current letter text in the `<pre>` block above the panel.
  2. Click **Accept**.
  3. Observe the letter `<pre>` block above the panel.
- **Expected Result**: The letter `<pre>` block above the panel now shows the refined text (which was previously in the panel's output). The accept API call returns 200.
- **Note**: This test depends on Accept being enabled. See UAT-EDGE-001 for the known gap.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-009: Revert button calls reject endpoint and clears refined text

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (refinement completed, Revert enabled)
- **Description**: Clicking Revert calls `PATCH /jobs/:id/refine/:refinementId/reject` and clears the refinement state (refinedText, refinementId, showDiff reset).
- **Steps**:
  1. With a completed refinement, click **Revert**.
  2. Observe the panel state.
- **Expected Result**: The refined text `<pre>` block disappears. The "Show Diff", "Accept", and "Revert" buttons disappear. The panel returns to showing only the textarea, scope dropdown, and Refine button. The original letter text above is unchanged.
- **Note**: This test depends on Revert being enabled. See UAT-EDGE-001 for the known gap.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-010: Error message displayed when refine API call fails

- **Page**: `http://localhost:5173/jobs/$JOB_ID/generate` (panel visible)
- **Description**: When the refine API returns an error (e.g., network failure or 4xx), the panel displays an error message.
- **Steps**:
  1. Stop the local API server (to simulate a network error).
  2. Type any instruction into the textarea and click **Refine**.
  3. Observe the panel.
- **Expected Result**: An error message is shown in a red box below the controls. The loading spinner disappears. The textarea and buttons re-enable. No unhandled exception appears in the browser console.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: SSE complete event must carry refinementId (IMPLEMENTATION GAP)

- **Scenario**: The requirement (TASK-063 step 3, TASK-061 spec) states the backend should emit `event: complete\ndata: {"refinementId":"<uuid>"}\n\n` so the frontend can enable Accept/Revert buttons.
- **Steps**:
  1. Run the refine curl from UAT-API-001 and capture the full SSE body.
  2. Locate the `event: complete` line and the immediately following `data:` line.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Any instruction"}' | grep -A1 'event: complete'
  ```
- **Expected Result** (per requirement): The `data:` line after `event: complete` contains a JSON payload with `refinementId`, e.g. `data: {"refinementId":"<uuid>"}`.
- **Actual Result** (as implemented): The `data:` line is empty (`data: `). The `refinementId` is never sent to the client. Consequence: the frontend always receives `refinementId = ''`; Accept and Revert buttons are permanently disabled.
- **Gap**: `packages/api/src/handlers/post-jobs-refine.ts` builds the SSE body as `chunks.map(c => \`data: ${c}\n\n\`).join('') + 'event: complete\ndata: \n\n'`. The refinement record ID is created (`prisma.refinement.create`) but its `id` is not injected into the complete event. The fix requires capturing the created record's ID and emitting `data: ${JSON.stringify({ refinementId: record.id })}\n\n` in the complete event.
- [FAIL: auto-judge: prerequisite not satisfied — JOB_ID env var not set] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Scope 'all' is sent as undefined (not the string "all") in the request body

- **Scenario**: When the user selects "All" from the scope dropdown, the frontend should send `scope: undefined` (omitting the key) rather than `scope: "all"`, per the `handleRefine` logic: `scope === 'all' ? undefined : scope`.
- **Steps**:
  1. Open browser DevTools → Network tab.
  2. Navigate to the generate page with a completed letter.
  3. Leave the Scope dropdown on "All". Type any instruction and click Refine.
  4. Inspect the request payload of the `POST /jobs/$JOB_ID/refine` request.
- **Expected Result**: The request body is `{"instruction":"<your text>"}` with no `scope` key (or `scope: null`/`scope: undefined` which JSON.stringify omits). The backend receives `scope = undefined` and uses the full letter text without a scope suffix.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Refine button disabled while request is in progress

- **Scenario**: While a refinement is in progress (`isRefining = true`), all interactive controls in the panel must be disabled to prevent double-submission.
- **Steps**:
  1. Type an instruction and click Refine.
  2. While the spinner is active (before the response completes), attempt to click the Refine button again, change the scope dropdown, or edit the textarea.
- **Expected Result**: The Refine button, scope dropdown, and instruction textarea all have the `disabled` attribute while `isRefining` is true. A second click on Refine does not trigger a second API call.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

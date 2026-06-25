---
id: UAT-065
title: "UAT: E2E verification — attorney refinement loop (all Phase 3 scenarios)"
status: pending
task: TASK-065
created: 2026-06-25
updated: 2026-06-25
---

# UAT-065 — UAT: E2E verification — attorney refinement loop

implements::[[TASK-065]]

> **Source task**: [[TASK-065]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] `sam local start-api` running on port 3000 with a valid `DATABASE_URL` and `BEDROCK_MODEL_ID` env var
- [ ] Local Postgres running with all migrations applied (`pnpm prisma migrate deploy` in `packages/db`)
- [ ] At least one job with `status = complete` and a non-null `job.output` exists. Set `export JOB_ID=<uuid>` before running API tests.
- [ ] Vite dev server running on port 5173 (`pnpm dev` in `packages/web`) for UI tests
- [ ] AWS credentials with Bedrock access available in the shell environment for SAM local

---

## Test Cases

---

### Scenario A: Full refinement flow

---

### UAT-API-001: POST /refine returns SSE stream and creates a refinement row

- **Endpoint**: `POST /jobs/{JOB_ID}/refine`
- **Description**: Submitting an instruction must return a `text/event-stream` response whose body contains one or more `data:` lines followed by a terminal `event: complete` block carrying a `refinementId` UUID. A `Refinement` row with `accepted=false` must be persisted in the database.
- **Steps**:
  1. Ensure `$JOB_ID` is exported (a job with `output` set).
  2. Run the command below.
  3. Inspect the response body: look for `data:` chunk lines and the `event: complete` block containing `refinementId`.
  4. Save the `refinementId` from the complete block for UAT-API-002.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Increase general damages to $250,000 and update the demand accordingly"}'
  ```
- **Expected Result**: HTTP 200. Response `Content-Type` header is `text/event-stream`. Body contains lines matching `data: <text>` (one or more) and ends with `event: complete\ndata: {"refinementId":"<uuid>"}`. A new row exists in the `refinements` table with `job_id=$JOB_ID`, `accepted=false`, `instruction="Increase general damages to $250,000 and update the demand accordingly"`, `scope='all'`, and non-empty `before_text` and `after_text`.
- [FAIL: auto-judge: live environment prerequisite not met — POST /jobs/{id}/refine route not registered in running SAM local instance (returns Missing Authentication Token); no job with non-null output in DB] <!-- 2026-06-25 -->

---

### UAT-API-002: PATCH accept updates job.output and sets accepted=true

- **Endpoint**: `PATCH /jobs/{JOB_ID}/refine/{REFINEMENT_ID}/accept`
- **Description**: Accepting a refinement must atomically set `refinement.accepted=true` and overwrite `job.output` with `refinement.after_text`.
- **Steps**:
  1. Use the `$REFINEMENT_ID` obtained from UAT-API-001.
  2. Export: `export REFINEMENT_ID=<uuid from above>`
  3. Run the command below.
  4. Verify the response body.
  5. Query the DB: `SELECT accepted FROM refinements WHERE id='$REFINEMENT_ID'` must be `true`. `SELECT output FROM jobs WHERE id='$JOB_ID'` must match the `after_text` of the refinement.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/refine/$REFINEMENT_ID/accept"
  ```
- **Expected Result**: HTTP 200, body `{"ok":true}`. In the database: `refinements.accepted=true` for `$REFINEMENT_ID`; `jobs.output` equals the `after_text` column of that refinement row.
- [FAIL: auto-judge: live environment prerequisite not met — PATCH /jobs/{id}/refine/{id}/accept route not registered in running SAM local; no complete job with output in DB] <!-- 2026-06-25 -->

---

### UAT-UI-001: Full flow — instruction → stream → diff → accept → DOCX download

- **Page**: `http://localhost:5173/jobs/{JOB_ID}/generate`
- **Description**: Verifies Scenario A end-to-end in the browser: instruction entry, streaming output, diff view, accept propagation to the letter display, and DOCX download.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$JOB_ID/generate`.
  2. If the letter has not been generated yet, click **Generate Demand Letter** and wait for it to complete.
  3. In the **Refine Letter** panel, type `Increase general damages to $250,000 and update the demand accordingly` into the instruction textarea.
  4. Leave the **Scope** selector set to **All**.
  5. Click **Refine**.
  6. Observe: a spinning indicator and "Refining…" text appear. As the request completes, the `<pre>` element below the controls fills with the revised letter text. (Note: in SAM local, text may appear all at once rather than incrementally due to buffering.)
  7. Once the Refine button reactivates, click **Show Diff**.
  8. Observe: the diff view renders changed lines with a green background (prefix `+ `) and removed lines with a red background and strikethrough (prefix `- `). The demand amount change should be visible.
  9. Click **Accept**.
  10. Observe: the main letter `<pre>` at the top of the page updates to the refined text.
  11. Click **Download DOCX**.
  12. Open the downloaded `demand-letter.docx` and confirm the figure `$250,000` appears in the document body.
- **Expected Result**:
  - Streaming `<pre>` shows the revised letter after refinement completes.
  - Diff view renders added lines in `bg-green-100` (green) and removed lines in `bg-red-100` with strikethrough.
  - After Accept: the letter display in GeneratePage reflects the refined text.
  - Downloaded DOCX contains `$250,000` in the demand paragraph.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### Scenario B: Scoped instruction — medical_narrative only

---

### UAT-API-003: POST /refine with scope=medical_narrative

- **Endpoint**: `POST /jobs/{JOB_ID}/refine`
- **Description**: When `scope` is `medical_narrative`, the API prompt instructs the model to return only the revised text for that section. The `refinements` row must store `scope='medical_narrative'`.
- **Steps**:
  1. Run the command below.
  2. Inspect the `event: complete` block to extract the `refinementId`.
  3. Inspect the `data:` lines: the content should be §4-level prose only (medical narrative), not the full letter with header, demand paragraph, etc.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Rewrite to be more concise","scope":"medical_narrative"}'
  ```
- **Expected Result**: HTTP 200, SSE stream. `event: complete` block contains a `refinementId`. `after_text` stored in the DB for this refinement is scoped prose (does not contain the full letter structure including salutation, header, and demand amount paragraph). `scope` column in `refinements` is `medical_narrative`.
- [FAIL: auto-judge: live environment prerequisite not met — POST /jobs/{id}/refine route not registered in running SAM local instance; no complete job with output in DB] <!-- 2026-06-25 -->

---

### UAT-UI-002: Scoped instruction — scope selector and output scope

- **Page**: `http://localhost:5173/jobs/{JOB_ID}/generate`
- **Description**: Verifies that selecting the `medical_narrative` scope sends the correct scope and that the refined output is limited to the medical narrative section.
- **Steps**:
  1. Navigate to the generate page for a job with a completed letter.
  2. In the **Scope** dropdown, select **Medical Narrative**.
  3. Enter instruction `Rewrite to be more concise` in the textarea.
  4. Click **Refine** and wait for completion.
  5. Inspect the text shown in the `<pre>` element: it should contain only the medical narrative prose (§4), not the full letter including the header block, salutation, damages tally, or demand paragraph.
- **Expected Result**: The refined `<pre>` output is scoped prose for the medical narrative section only. The rest of the letter is not repeated in the output.

> **Implementation gap**: The `PATCH /accept` handler unconditionally sets `job.output = refinement.after_text`. For a scoped refinement, `after_text` is only §4 prose — accepting it will replace the full letter text with just the section, destroying the header and demand paragraph. **Do not click Accept** for this test case; the Accept step for scoped refinements is intentionally not yet implemented as a merge operation. Report this gap to the development team.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### Scenario C: Revert after accept

---

### UAT-API-004: PATCH reject sets accepted=false

- **Endpoint**: `PATCH /jobs/{JOB_ID}/refine/{REFINEMENT_ID}/reject`
- **Description**: Rejecting a refinement must set `accepted=false` in the `refinements` table without modifying `job.output`.
- **Steps**:
  1. First create a refinement (UAT-API-001 or a new POST /refine call). Save the `refinementId`.
  2. Export: `export REFINEMENT_ID=<uuid>`. Note the current `job.output` before proceeding.
  3. Run the command below.
  4. Query DB: `SELECT accepted FROM refinements WHERE id='$REFINEMENT_ID'` must be `false`. `SELECT output FROM jobs WHERE id='$JOB_ID'` must be unchanged from before.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/refine/$REFINEMENT_ID/reject"
  ```
- **Expected Result**: HTTP 200, body `{"ok":true}`. `refinements.accepted=false` for `$REFINEMENT_ID`. `jobs.output` is unchanged.
- [FAIL: auto-judge: live environment prerequisite not met — PATCH /jobs/{id}/refine/{id}/reject route not registered in running SAM local instance; no REFINEMENT_ID available] <!-- 2026-06-25 -->

---

### UAT-UI-003: Revert after accept restores post-first-accept letter text

- **Page**: `http://localhost:5173/jobs/{JOB_ID}/generate`
- **Description**: Verifies Scenario C — revert on a second refinement returns the letter display to the text that was set after the first accept.
- **Steps**:
  1. Navigate to the generate page for a job with a completed letter.
  2. Perform the first refinement: enter any instruction, click **Refine**, wait for completion, click **Accept**.
  3. Note the letter text now shown in the main `<pre>` on the page (this is the post-first-accept text).
  4. Perform a second refinement: enter a different instruction, click **Refine**, wait for completion.
  5. **Do NOT click Accept.** Instead, click **Revert**.
  6. Observe: the `refinedText` area clears, the diff view hides, and the Accept/Revert buttons disappear.
  7. The main letter `<pre>` on the page should still display the post-first-accept text from step 3 (i.e., the `currentText` prop passed to RefinementPanel is unchanged).
- **Expected Result**:
  - After Revert: the RefinementPanel clears its local state.
  - The main letter `<pre>` shows the first-accept text (not the second refinement's text, and not the original pre-accept text).
  - In the `refinements` table: the second refinement has `accepted=false`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### Scenario D: refinements table data integrity

---

### UAT-API-005: GET /refinements returns all refinement rows for a job

- **Endpoint**: `GET /jobs/{JOB_ID}/refinements`
- **Description**: After running Scenarios A–C, the GET endpoint must return all refinement rows for the job with the correct fields.
- **Steps**:
  1. After running UAT-API-001 through UAT-API-004 and the UI tests for Scenarios A–C.
  2. Run the command below.
  3. Inspect the `refinements` array: each object must have `id`, `instruction`, `scope`, `accepted`, and `createdAt`. (Note: `before_text` and `after_text` are not returned by this endpoint for size reasons — verify them directly in the DB.)
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$JOB_ID/refinements" | jq '.refinements'
  ```
- **Expected Result**: HTTP 200. `refinements` array is non-empty. Each entry has `id` (UUID string), `instruction` (non-empty string), `scope` (one of `all`, `medical_narrative`, `damages`, `liability`, `demand_amount`), `accepted` (boolean), `createdAt` (ISO timestamp). Rows are ordered by `createdAt` descending.
- [FAIL: auto-judge: live environment prerequisite not met — GET /jobs/{id}/refinements route not verified as registered; no refinement rows exist (UAT-API-001 prerequisite not met)] <!-- 2026-06-25 -->

---

### UAT-DB-001: Verify refinements table row contents via psql

- **Scenario**: Direct database inspection to confirm `before_text`, `after_text`, `accepted`, `job_id`, `instruction`, `scope`, and `created_at` are all populated and consistent.
- **Steps**:
  1. Source your local env to get `DATABASE_URL`:
     ```bash
     source .env && psql "$DATABASE_URL"
     ```
  2. Run each query:
     ```sql
     -- All refinements for the job; confirm before_text and after_text are non-empty
     SELECT id, job_id, scope, accepted, length(before_text) AS before_len,
            length(after_text) AS after_len, created_at
     FROM refinements WHERE job_id = '<JOB_ID>' ORDER BY created_at;

     -- Accepted refinements: after_text must match jobs.output
     SELECT r.id, r.after_text = j.output AS output_matches
     FROM refinements r JOIN jobs j ON j.id = r.job_id
     WHERE r.job_id = '<JOB_ID>' AND r.accepted = true;

     -- Reverted refinements: accepted must be false
     SELECT id, accepted FROM refinements WHERE job_id = '<JOB_ID>' AND accepted = false;
     ```
- **Expected Result**:
  - All rows have `job_id` populated.
  - `before_len` and `after_len` are both > 0.
  - `instruction`, `scope`, and `created_at` are non-null for every row.
  - For accepted refinements: `output_matches = true`.
  - For the reverted second refinement: `accepted = false`.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### Scenario E: Cost dashboard shows refinement rows

---

### UAT-API-006: GET /admin/llm-costs includes refinement aggregate

- **Endpoint**: `GET /admin/llm-costs`
- **Description**: After refinement calls have been made, the cost dashboard must include an aggregate entry with `feature='refinement'` and non-zero token counts.
- **Steps**:
  1. Ensure at least one `POST /jobs/{id}/refine` call has been made and completed (UAT-API-001 or later).
  2. Run the command below.
  3. Inspect `aggregates`: locate the entry where `feature === 'refinement'`.
  4. Inspect `recentRows`: verify at least one row with `feature === 'refinement'` exists.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=1' | jq '{aggregates: .aggregates, refinementRows: [.recentRows[] | select(.feature=="refinement")]}'
  ```
- **Expected Result**: HTTP 200. `aggregates` array contains an entry `{feature:"refinement", _count:{id: ≥1}, _sum:{inputTokens: >0, outputTokens: >0, estimatedCostUsd: >0}}`. `recentRows` contains at least one object with `feature="refinement"`, non-zero `inputTokens`, `outputTokens`, and `estimatedCostUsd`, and a non-null `durationMs`.
- [FAIL: auto-judge: live environment prerequisite not met — no refinement LlmAuditLog rows exist; requires UAT-API-001 to have run successfully first] <!-- 2026-06-25 -->

---

### UAT-UI-004: Admin cost dashboard shows refinement feature row

- **Page**: `http://localhost:5173/admin/usage`
- **Description**: Verifies that the `/admin/usage` UI page renders a row for the `refinement` feature with non-zero token and cost values.
- **Steps**:
  1. Navigate to `http://localhost:5173/admin/usage`.
  2. Locate the cost breakdown table.
  3. Find the row where the feature column shows `refinement`.
  4. Verify the `inputTokens`, `outputTokens`, and `estimatedCostUsd` cells show non-zero values.
  5. Verify a `refinement` aggregate row appears in any summary/groupBy table shown on the page.
- **Expected Result**: A row for `refinement` appears in the cost dashboard with non-zero token counts and a non-zero estimated cost. The aggregate section includes a `refinement` bucket.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### Edge Cases

---

### UAT-EDGE-001: POST /refine with missing instruction returns 400

- **Scenario**: The `instruction` field is required. Omitting it must return a 400 error.
- **Steps**: Run the command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$JOB_ID/refine" -H 'Content-Type: application/json' -d '{"scope":"all"}'
  ```
- **Expected Result**: HTTP 400, body `{"error":"Missing instruction"}`.
- [FAIL: auto-judge: live environment prerequisite not met — POST /jobs/{id}/refine route not registered in running SAM local (returns Missing Authentication Token instead of 400)] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: POST /refine on a job with no output returns 422

- **Scenario**: Refining a job that has no `output` (not yet generated) must be rejected with 422.
- **Steps**:
  1. Create a new job via `POST /jobs` and note its ID (it will have `output=null`). Export as `export EMPTY_JOB_ID=<uuid>`.
  2. Run the command below.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/$EMPTY_JOB_ID/refine" -H 'Content-Type: application/json' -d '{"instruction":"Make it stronger"}'
  ```
- **Expected Result**: HTTP 422, body `{"error":"Job output not yet generated"}`.
- [FAIL: auto-judge: live environment prerequisite not met — POST /jobs/{id}/refine route not registered in running SAM local (returns Missing Authentication Token instead of 422)] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: PATCH accept with mismatched job/refinement IDs returns 403

- **Scenario**: Attempting to accept a refinement that belongs to a different job must be forbidden.
- **Steps**:
  1. Use `$REFINEMENT_ID` from UAT-API-001 (belongs to `$JOB_ID`).
  2. Create a second job and export its ID as `export OTHER_JOB_ID=<uuid>`.
  3. Run the command below.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$OTHER_JOB_ID/refine/$REFINEMENT_ID/accept"
  ```
- **Expected Result**: HTTP 403, body `{"error":"refinement_job_mismatch"}`.
- [FAIL: auto-judge: live environment prerequisite not met — PATCH /jobs/{id}/refine/{id}/accept route not registered in running SAM local; no REFINEMENT_ID available] <!-- 2026-06-25 -->

---

### UAT-EDGE-004: PATCH accept on non-existent refinement returns 404

- **Scenario**: Accepting a refinement that does not exist must return 404.
- **Steps**: Run the command below with a fabricated UUID.
- **Command**:
  ```bash
  curl -sS -X PATCH "http://localhost:3000/jobs/$JOB_ID/refine/00000000-0000-0000-0000-000000000000/accept"
  ```
- **Expected Result**: HTTP 404, body `{"error":"refinement_not_found"}`.
- [FAIL: auto-judge: live environment prerequisite not met — PATCH /jobs/{id}/refine/{id}/accept route not registered in running SAM local (returns Missing Authentication Token)] <!-- 2026-06-25 -->

---

## Implementation Gap — Scoped Accept

> **Gap**: `PATCH /jobs/{id}/refine/{refinement_id}/accept` sets `job.output = refinement.after_text` unconditionally. When `scope` is `medical_narrative` (or any non-`all` scope), `after_text` contains only the section prose, not the full letter. Accepting a scoped refinement therefore replaces the full letter with only the revised section, destroying all other sections. The requirement per ROADMAP-006 is that accepting a scoped refinement should splice the revised section back into the full letter. This test (UAT-UI-002) is written against the requirement — a future implementation of the merge step is needed before UAT-UI-002 can pass fully.

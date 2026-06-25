---
id: UAT-059
title: "UAT: Phase 5 End-to-end compliance verification — PHI redaction, detection failure, attorney vs developer roles"
status: passed
task: TASK-059
created: 2026-06-25
updated: 2026-06-25
---

# UAT-059 — UAT: Phase 5 End-to-end compliance verification

implements::[[TASK-059]]

> **Source task**: [[TASK-059]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Node.js and `pnpm` are installed; project dependencies resolved (`pnpm install`)
- [ ] `packages/api/src/lib/compliance-verify.ts` contains the Phase 5 assertions block added in TASK-059
- [ ] `packages/api/src/handlers/sns-textract-completion.ts` exists (from TASK-054)
- [ ] `packages/api/src/handlers/get-jobs-blocks.ts` exists (from TASK-055)
- [ ] `packages/api/src/lib/redact-text.ts` exists (from TASK-053)

---

## Test Cases

### UAT-SCRIPT-001: Full compliance-verify script exits 0 with 18 assertions passing

- **Description**: Run `pnpm --filter @demand-letter/api compliance-verify` and verify all 18 assertions pass with no failures.
- **Steps**:
  1. From the project root, run the command below
  2. Observe the console output
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api compliance-verify
  ```
- **Expected Result**: Script outputs `Results: 18 passed, 0 failed` (or more, if new assertions have been added) and exits with code 0. No `✗` lines appear in the output.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-002: Phase 5 section is present in script output

- **Description**: Verify the script specifically emits the `Phase 5 structural assertions:` heading, confirming the new section was not accidentally removed.
- **Steps**:
  1. Run the compliance-verify script as in UAT-SCRIPT-001
  2. Observe the section heading in the output
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api compliance-verify
  ```
- **Expected Result**: The output includes the line `Phase 5 structural assertions:` followed by five `✓` lines:
  - `✓ SNS handler merges PHI and PII entities`
  - `✓ SNS handler writes real data to phiOffsets (not JsonNull)`
  - `✓ GET /blocks selects phiOffsets from DB`
  - `✓ GET /blocks has isAttorney guard`
  - `✓ createMany follows detection calls (not before)`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Script exits non-zero when a Phase 5 assertion would fail

- **Description**: Verify the fail-closed behavior — if a structural check fails, the script exits 1. This can be tested by temporarily running a variant that injects a known-false assertion.
- **Scenario**: A required structural pattern is absent from one of the handler files.
- **Steps**:
  1. This is a static verification of the assertion framework — confirmed by code inspection of `compliance-verify.ts`
  2. The `assert()` function increments `failed` on falsy conditions and the script calls `process.exit(1)` when `failed > 0`
  3. Verify the source code contains `if (failed > 0) process.exit(1);` at the end of the file
- **Expected Result**: Code inspection confirms `process.exit(1)` is the terminal path when any assertion fails. The script is fail-closed by construction — any removed structural pattern from any handler causes a non-zero exit.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-RUNTIME-001: Runtime verification procedures are documented in task file

- **Description**: Verify that the `## Runtime Verification` section exists in the TASK-059 task file, covering the five manual test procedures described in the objective.
- **Steps**:
  1. Read `wiki/work/tasks/TASK-059-phase5-e2e-compliance-verification.md`
  2. Locate the `## Runtime Verification` section
  3. Confirm it contains procedures for: Pat Donahue pipeline test, CloudWatch log check, developer role redacted response, attorney role full text response, and detection failure simulation
- **Expected Result**: The task file contains a `## Runtime Verification (manual — requires live AWS environment)` section with subsections for all five manual verification procedures, each including the specific commands or SQL queries to run and the expected outcomes.
- [x] Pass <!-- 2026-06-25 -->

---

## Runtime Verification (manual — requires live AWS environment)

The following tests require a deployed AWS environment. They are documented here for completeness and must be executed manually against a live deployment.

### UAT-LIVE-001: Pat Donahue pipeline — phiOffsets populated in DB

- **Scenario**: Upload and process a Pat Donahue case PDF, then query the DB for populated `phi_offsets`.
- **Steps**:
  1. Upload Pat Donahue scanned PDF via `POST /jobs/:id/files`
  2. Trigger ingest via `POST /jobs/:id/documents/ingest`
  3. Wait for Textract SNS completion (monitor Lambda logs)
  4. Query: `SELECT id, jsonb_array_length(phi_offsets::jsonb) FROM blocks WHERE source_file_id IN (SELECT id FROM source_files WHERE job_id = '$JOB_ID') LIMIT 10;`
- **Expected Result**: At least one block has `phi_offsets` length ≥ 1; collectively ≥ 5 detected entities across all blocks for that job.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

### UAT-LIVE-002: CloudWatch — no raw PHI in Lambda logs

- **Scenario**: After processing a Pat Donahue case, verify the Lambda logs contain no raw PHI strings.
- **Steps**:
  1. Run the CloudWatch query below (set `$Stage` to the deployed stage name)
  2. Verify zero matching events are returned
- **Command**:
  ```bash
  aws logs filter-log-events --log-group-name /aws/lambda/${Stage}-SnsTextractCompletionFunction --filter-pattern '"Donahue" OR "Patrick" OR "123-45"' --start-time $(date -d '1 hour ago' +%s000)
  ```
- **Expected Result**: The response contains `events: []` — no log events match PHI patterns.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

### UAT-LIVE-003: Developer role — response text is redacted

- **Scenario**: Call `GET /jobs/:id/blocks` with `X-Caller-Role: developer` and verify text is redacted.
- **Steps**:
  1. Set `$API_URL` and `$JOB_ID` to a processed job with PHI-containing blocks
  2. Run the curl below
  3. Inspect the `text` field in the response
- **Command**:
  ```bash
  curl -sS -H 'X-Caller-Role: developer' "https://$API_URL/jobs/$JOB_ID/blocks?limit=1" | jq '.blocks[0].text'
  ```
- **Expected Result**: The `text` field contains token placeholders like `[PATIENT_NAME]` or `[SSN]` — not the original PHI values like "Donahue".
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

### UAT-LIVE-004: Attorney role — response text is unredacted

- **Scenario**: Call `GET /jobs/:id/blocks` with `X-Caller-Role: attorney` and verify full text is returned.
- **Steps**:
  1. Set `$API_URL` and `$JOB_ID` to the same job as UAT-LIVE-003
  2. Run the curl below
  3. Inspect the `text` field in the response
- **Command**:
  ```bash
  curl -sS -H 'X-Caller-Role: attorney' "https://$API_URL/jobs/$JOB_ID/blocks?limit=1" | jq '.blocks[0].text'
  ```
- **Expected Result**: The `text` field contains the original, unredacted text — no token placeholders present.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---
id: UAT-057
title: "UAT: Integration test — assert no raw PHI in SNS handler logs or developer-facing block API"
status: passed
task: TASK-057
created: 2026-06-25
updated: 2026-06-25
---

# UAT-057 — UAT: Integration test — assert no raw PHI in SNS handler logs or developer-facing block API

implements::[[TASK-057]]

> **Source task**: [[TASK-057]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Working directory is `/Users/davidtaylor/Repositories/gauntlet/demand-letter`
- [ ] `pnpm` is installed and dependencies are up to date (`pnpm install`)
- [ ] `packages/api/src/lib/compliance-verify.ts` exists
- [ ] `packages/api/src/lib/redact-text.ts` exists with `redactText()` and `TOKEN_MAP`
- [ ] `packages/api/src/handlers/sns-textract-completion.ts` exists with fail-closed comment and PHI detection calls
- [ ] `packages/api/src/handlers/get-jobs-blocks.ts` exists with role-based redaction via `x-caller-role` header
- [ ] `tsx` is available (installed as a dev dependency in `@demand-letter/api`)

---

## Test Cases

### UAT-SCRIPT-001: compliance-verify script exits 0 with all assertions passing

- **Description**: Verifies the `compliance-verify` npm script runs end-to-end, executes all 13 assertions, and exits with code 0 (no failures).
- **Steps**:
  1. From the project root, run the compliance-verify script via pnpm filter:
     ```bash
     pnpm --filter @demand-letter/api compliance-verify
     ```
  2. Observe the output — it should print two sections: "redactText unit tests:" and "Static source checks:"
  3. Confirm the final line reads `Results: 13 passed, 0 failed`
  4. Confirm the process exits with code 0 (no non-zero exit, no "ERR_" output from pnpm)
- **Expected Result**: Exit code 0. Output contains `Results: 13 passed, 0 failed`. All 13 `✓` lines are present; no `✗` lines appear.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UNIT-001: redactText — PATIENT entity span is replaced with [PATIENT_NAME]

- **Description**: Verifies that `redactText` replaces a `PATIENT`-typed entity at the specified offsets with the `[PATIENT_NAME]` token and does not leave the original text in the output.
- **Steps**:
  1. This is verified by the compliance-verify script assertion: `"PATIENT span replaced with token"` and `"PATIENT replaced with [PATIENT_NAME]"`.
  2. Run the compliance-verify script per UAT-SCRIPT-001 and confirm both of these `✓` lines appear.
  3. Input used: `'Patient John Doe - DOB: 01/01/1980'` with entity `{ type: 'PATIENT', startOffset: 8, endOffset: 15 }`.
  4. Expected: result does NOT contain `'John Doe'` and DOES contain `'[PATIENT_NAME]'`.
- **Expected Result**: Both assertions pass — `✓ PATIENT span replaced with token` and `✓ PATIENT replaced with [PATIENT_NAME]` appear in output.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UNIT-002: redactText — empty string and no-entity inputs return original text

- **Description**: Verifies that `redactText('', [])` returns `''` and `redactText('no phi here', [])` returns `'no phi here'` unchanged.
- **Steps**:
  1. This is verified by the compliance-verify script assertions: `"empty string returns empty string"` and `"no entities returns original text"`.
  2. Run the compliance-verify script per UAT-SCRIPT-001 and confirm both `✓` lines appear.
- **Expected Result**: `✓ empty string returns empty string` and `✓ no entities returns original text` appear in output.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UNIT-003: redactText — SSN entity replaced with [SSN] token

- **Description**: Verifies the TOKEN_MAP mapping for `SSN` type produces the `[SSN]` replacement token.
- **Steps**:
  1. This is verified by the compliance-verify script assertion: `"SSN replaced with [SSN]"`.
  2. Run the compliance-verify script per UAT-SCRIPT-001 and confirm `✓ SSN replaced with [SSN]` appears.
  3. Input: `'SSN: 123-45-6789'` with entity `{ type: 'SSN', startOffset: 5, endOffset: 16 }`.
- **Expected Result**: `✓ SSN replaced with [SSN]` appears in output.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UNIT-004: redactText — unknown entity type falls back to [PHI_ENTITY]

- **Description**: Verifies that entity types not present in TOKEN_MAP fall back to the generic `[PHI_ENTITY]` token rather than throwing or returning an empty string.
- **Steps**:
  1. This is verified by the compliance-verify script assertion: `"unknown type replaced with [PHI_ENTITY]"`.
  2. Run the compliance-verify script per UAT-SCRIPT-001 and confirm `✓ unknown type replaced with [PHI_ENTITY]` appears.
  3. Input: `'data here'` with entity `{ type: 'UNKNOWN_TYPE', startOffset: 0, endOffset: 4 }`.
- **Expected Result**: `✓ unknown type replaced with [PHI_ENTITY]` appears in output.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-001: SNS handler has fail-closed comment and calls detectPhi/detectPii/phiOffsets

- **Description**: Verifies that `sns-textract-completion.ts` contains the four required compliance strings confirming: (1) fail-closed policy is documented, (2) `detectPhi` is called, (3) `detectPii` is called, (4) `phiOffsets` is stored.
- **Steps**:
  1. These are verified by the compliance-verify script assertions: `"SNS handler has fail-closed comment"`, `"SNS handler calls detectPhi"`, `"SNS handler calls detectPii"`, `"SNS handler writes phiOffsets"`.
  2. Run the compliance-verify script per UAT-SCRIPT-001 and confirm all four `✓` lines appear.
- **Expected Result**: All four `✓` lines appear:
  - `✓ SNS handler has fail-closed comment`
  - `✓ SNS handler calls detectPhi`
  - `✓ SNS handler calls detectPii`
  - `✓ SNS handler writes phiOffsets`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: GET /blocks handler applies redactText and checks x-caller-role with attorney role

- **Description**: Verifies that `get-jobs-blocks.ts` contains the three required compliance strings confirming: (1) `redactText` is imported and called, (2) the `x-caller-role` header is checked, (3) the `attorney` role is specifically handled.
- **Steps**:
  1. These are verified by the compliance-verify script assertions: `"GET /blocks imports and calls redactText"`, `"GET /blocks checks caller role header"`, `"GET /blocks has attorney role check"`.
  2. Run the compliance-verify script per UAT-SCRIPT-001 and confirm all three `✓` lines appear.
- **Expected Result**: All three `✓` lines appear:
  - `✓ GET /blocks imports and calls redactText`
  - `✓ GET /blocks checks caller role header`
  - `✓ GET /blocks has attorney role check`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: compliance-verify script fails with exit code 1 when an assertion fails

- **Description**: Verifies the script's error-reporting mechanism — if any assertion fails, the script must exit with code 1 so CI pipelines fail correctly. This validates the test harness itself.
- **Steps**:
  1. Temporarily rename or corrupt a file that the static checks depend on (e.g., rename `packages/api/src/handlers/sns-textract-completion.ts` to `sns-textract-completion.ts.bak`).
  2. Run `pnpm --filter @demand-letter/api compliance-verify`.
  3. Observe that the script prints one or more `✗` lines and the final line shows `failed > 0`.
  4. Confirm the process exits with code 1 (pnpm will print a non-zero exit error or you can run with `echo $?`).
  5. Restore the file: rename `sns-textract-completion.ts.bak` back to `sns-textract-completion.ts`.
- **Expected Result**: Script exits with code 1 and prints at least one `✗` failure line when a required file is missing.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

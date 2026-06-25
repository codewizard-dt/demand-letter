---
id: UAT-053
title: "UAT: redactText utility — replace PHI/PII entity spans with typed tokens"
status: passed
task: TASK-053
created: 2026-06-25
updated: 2026-06-25
completed: 2026-06-25
---

# UAT-053 — UAT: redactText utility — replace PHI/PII entity spans with typed tokens

implements::[[TASK-053]]

> **Source task**: [[TASK-053]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] `packages/api` dependencies installed (`pnpm install` from repo root)
- [ ] TypeScript compiled or `ts-node` / `tsx` available (`pnpm --filter @demand-letter/api exec tsx --version`)

All tests below use a one-liner `tsx` invocation that imports directly from source. Run from the repo root.

---

## Test Cases

### UAT-EDGE-001: Empty entities array returns original text unchanged

- **Scenario**: Calling `redactText` with an empty entities array must short-circuit and return the original string exactly.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/redact-text'; const r = redactText('John Smith DOB 01/01/1980', []); console.log(r === 'John Smith DOB 01/01/1980' ? 'PASS' : 'FAIL: got ' + r);"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Single PATIENT entity is replaced with [PATIENT_NAME]

- **Scenario**: A single entity of type `PATIENT` spanning the patient's name is replaced with the `[PATIENT_NAME]` token.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/redact-text'; const r = redactText('Patient John Smith was seen', [{ type: 'PATIENT', startOffset: 8, endOffset: 18 }]); console.log(r === 'Patient [PATIENT_NAME] was seen' ? 'PASS' : 'FAIL: got ' + r);"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Multiple non-overlapping entities replaced without offset drift

- **Scenario**: Two entities at different offsets must both be replaced correctly. The descending-sort strategy prevents offset drift when earlier spans are modified first.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/redact-text'; const text = 'Patient Jane Doe DOB 12/31/1990 SSN 123-45-6789'; const entities = [{ type: 'PATIENT', startOffset: 8, endOffset: 16 }, { type: 'DATE', startOffset: 21, endOffset: 31 }, { type: 'SSN', startOffset: 36, endOffset: 47 }]; const r = redactText(text, entities); const expected = 'Patient [PATIENT_NAME] DOB [DATE_OF_BIRTH] SSN [SSN]'; console.log(r === expected ? 'PASS' : 'FAIL: got |' + r + '| expected |' + expected + '|');"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-004: Unknown entity type falls back to [PHI_ENTITY]

- **Scenario**: An entity whose `type` is not in the TOKEN_MAP must produce `[PHI_ENTITY]` rather than throwing or silently dropping the span.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/redact-text'; const r = redactText('Record XYZ-001 filed', [{ type: 'UNKNOWN_TYPE', startOffset: 7, endOffset: 14 }]); console.log(r === 'Record [PHI_ENTITY] filed' ? 'PASS' : 'FAIL: got ' + r);"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-005: TOKEN_MAP aliases all resolve correctly

- **Scenario**: Multiple alias types that should produce the same token (`PERSON`→`[PATIENT_NAME]`, `NAME`→`[PATIENT_NAME]`, `DATE_TIME`→`[DATE_OF_BIRTH]`, `PHONE_NUMBER`→`[PHONE]`, `LOCATION`→`[ADDRESS]`, `DOCTOR`→`[PROVIDER]`, `HOSPITAL`→`[PROVIDER]`, `ORGANIZATION`→`[PROVIDER]`, `DIAGNOSIS`→`[MEDICAL_CONDITION]`) must all produce the expected token.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/redact-text'; const cases = [['PERSON','[PATIENT_NAME]'],['NAME','[PATIENT_NAME]'],['DATE_TIME','[DATE_OF_BIRTH]'],['PHONE_NUMBER','[PHONE]'],['LOCATION','[ADDRESS]'],['DOCTOR','[PROVIDER]'],['HOSPITAL','[PROVIDER]'],['ORGANIZATION','[PROVIDER]'],['DIAGNOSIS','[MEDICAL_CONDITION]']]; let pass = true; for (const [type, expected] of cases) { const r = redactText('span', [{type, startOffset:0, endOffset:4}]); if (r !== expected) { console.log('FAIL type=' + type + ' got=' + r + ' expected=' + expected); pass = false; } } if (pass) console.log('PASS');"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-006: redactText and RedactableEntity are exported from lib/index.ts

- **Scenario**: Downstream consumers import from the barrel export `lib/index.ts`, not directly from `lib/redact-text.ts`. Both the function and the interface type must be accessible via that barrel.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/index'; const r = redactText('test data', [{ type: 'SSN', startOffset: 5, endOffset: 9 }]); console.log(r === 'test [SSN]' ? 'PASS' : 'FAIL: got ' + r);"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-007: Entities supplied in ascending order are still applied correctly

- **Scenario**: Callers may supply entities in the order the detector returns them (ascending offset). The function must internally sort descending before applying, so no offset shift occurs regardless of input order.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx -e "import { redactText } from './src/lib/redact-text'; const text = 'Name: Alice, Phone: 555-1234'; const entities = [{ type: 'NAME', startOffset: 6, endOffset: 11 }, { type: 'PHONE', startOffset: 20, endOffset: 28 }]; const r = redactText(text, entities); const expected = 'Name: [PATIENT_NAME], Phone: [PHONE]'; console.log(r === expected ? 'PASS' : 'FAIL: got |' + r + '| expected |' + expected + '|');"
  ```
- **Expected Result**: Output is `PASS`
- [x] Pass <!-- 2026-06-25 -->

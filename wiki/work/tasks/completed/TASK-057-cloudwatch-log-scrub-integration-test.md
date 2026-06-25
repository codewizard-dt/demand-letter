---
id: TASK-057
title: "Integration test: assert no raw PHI in SNS handler logs or developer-facing block API"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-054, TASK-055, TASK-056]
blocks: [TASK-059]
parallel_safe_with: [TASK-059]
uat: "[[UAT-057]]"
tags: [compliance, hipaa, testing, cloudwatch, integration-test]
---

# TASK-057 — Integration test: assert no raw PHI in SNS handler logs or developer-facing block API

implements::[[ROADMAP-005]]

## Objective

Phase 3 item 3 of ROADMAP-005: write a static/unit-level test suite that verifies the compliance controls are wired correctly — (1) redactText correctly replaces known PHI patterns, (2) the SNS handler fail-closed policy is documented and the code structure confirms errors propagate, (3) the GET /blocks developer-role path applies redactText before returning. This is a static code verification test (no live AWS required).

## Approach

Create `packages/api/src/lib/__tests__/compliance.test.ts` (or a script under `packages/api/src/lib/compliance-verify.ts`) that:
1. Unit-tests `redactText()` with known entities
2. Inspects the source of `sns-textract-completion.ts` to confirm the fail-closed comment exists
3. Inspects the source of `get-jobs-blocks.ts` to confirm `redactText` import and role-check code exists

Since there is no test runner configured, use a simple Node.js script that `process.exit(1)` on failure (matching the pattern from earlier verification tasks).

## Steps

### 1. Create compliance-verify.ts script  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/compliance-verify.ts`: <!-- Completed: 2026-06-25 -->

  ```typescript
  import { redactText } from './redact-text';
  import * as fs from 'fs';
  import * as path from 'path';

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) { console.log(`  ✓ ${msg}`); passed++; }
    else { console.error(`  ✗ ${msg}`); failed++; }
  }

  // Unit tests for redactText
  console.log('redactText unit tests:');

  const entities = [
    { type: 'PATIENT', startOffset: 8, endOffset: 15 },
    { type: 'DATE', startOffset: 20, endOffset: 30 },
  ];
  const redacted = redactText('Patient John Doe - DOB: 01/01/1980', entities);
  assert(!redacted.includes('John Doe'), 'PATIENT span replaced with token');
  assert(redacted.includes('[PATIENT_NAME]'), 'PATIENT replaced with [PATIENT_NAME]');

  assert(redactText('', []) === '', 'empty string returns empty string');
  assert(redactText('no phi here', []) === 'no phi here', 'no entities returns original text');

  const ssn = redactText('SSN: 123-45-6789', [{ type: 'SSN', startOffset: 5, endOffset: 16 }]);
  assert(ssn.includes('[SSN]'), 'SSN replaced with [SSN]');

  const unknown = redactText('data here', [{ type: 'UNKNOWN_TYPE', startOffset: 0, endOffset: 4 }]);
  assert(unknown.includes('[PHI_ENTITY]'), 'unknown type replaced with [PHI_ENTITY]');

  // Static source checks
  console.log('\nStatic source checks:');

  const snsHandler = fs.readFileSync(
    path.join(__dirname, '../handlers/sns-textract-completion.ts'), 'utf-8'
  );
  assert(snsHandler.includes('Fail-closed'), 'SNS handler has fail-closed comment');
  assert(snsHandler.includes('detectPhi'), 'SNS handler calls detectPhi');
  assert(snsHandler.includes('detectPii'), 'SNS handler calls detectPii');
  assert(snsHandler.includes('phiOffsets'), 'SNS handler writes phiOffsets');

  const blocksHandler = fs.readFileSync(
    path.join(__dirname, '../handlers/get-jobs-blocks.ts'), 'utf-8'
  );
  assert(blocksHandler.includes('redactText'), 'GET /blocks imports and calls redactText');
  assert(blocksHandler.includes('x-caller-role') || blocksHandler.includes('X-Caller-Role'), 'GET /blocks checks caller role header');
  assert(blocksHandler.includes('attorney'), 'GET /blocks has attorney role check');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  ```

### 2. Add run script to package.json  <!-- agent: general-purpose -->

- [x] In `packages/api/package.json`, add: <!-- Completed: 2026-06-25 -->
  ```json
  "compliance-verify": "tsx src/lib/compliance-verify.ts"
  ```
  to the `scripts` section

### 3. Run the verification script  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api compliance-verify` <!-- Completed: 2026-06-25 -->
- [x] All assertions must pass (exit code 0) <!-- 13/13 passed -->
- [x] Fix any failures by tracing back to the relevant task (TASK-053/054/055) <!-- No failures -->

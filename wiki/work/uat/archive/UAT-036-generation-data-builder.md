---
id: UAT-036
title: "UAT: Generation data builder: assemble docxtemplater data object from extracted_fields"
status: passed
task: TASK-036
created: 2026-06-24
updated: 2026-06-24
---

# UAT-036 — UAT: Generation Data Builder

implements::[[TASK-036]]

> **Source task**: [[TASK-036]]
> **Generated**: 2026-06-24

---

## Overview

`buildDataObject(jobId)` is a pure library function in `packages/api/src/lib/generation-data-builder.ts`. It has no HTTP endpoint; tests run as Node.js scripts via `tsx` directly against the local Postgres database. Each test seeds data via a small inline Prisma script, calls `buildDataObject`, and asserts on the returned object.

---

## Prerequisites

- [ ] Local Postgres is running and `DATABASE_URL` is set (source from `.env`)
- [ ] DB schema is up to date: `pnpm --filter @demand-letter/db prisma migrate deploy` (or `prisma db push`)
- [ ] `tsx` is available: `pnpm --filter @demand-letter/api exec tsx --version` should print a version
- [ ] Project root is the working directory for all commands below

---

## Test Cases

### UAT-SCRIPT-001: Happy path — known schema fields with real values

- **Description**: Seeds a job with three `ExtractedField` rows whose `fieldName` values exist in `FIELD_SCHEMA`. Verifies that `buildDataObject` returns the correct camelCase keys mapped via `dbNameToTagName`, and excludes no valid rows.
- **Steps**:
  1. Source env: `. ./packages/api/.env` (or however your local env is loaded)
  2. Run the script below — it seeds data, calls the function, prints the result, then cleans up.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-001-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    await prisma.extractedField.createMany({ data: [
      { jobId, fieldName: 'claimant_name', value: 'Jane Doe', isNull: false, source: null, acceptMissing: false },
      { jobId, fieldName: 'demand_amount', value: '$150,000', isNull: false, source: null, acceptMissing: false },
      { jobId, fieldName: 'date_of_loss', value: '2025-03-15', isNull: false, source: null, acceptMissing: false },
    ]});
    const data = await buildDataObject(jobId);
    console.log(JSON.stringify(data, null, 2));
    if (data['claimantName'] !== 'Jane Doe') throw new Error('claimantName mismatch');
    if (data['demandAmount'] !== '$150,000') throw new Error('demandAmount mismatch');
    if (data['dateOfLoss'] !== '2025-03-15') throw new Error('dateOfLoss mismatch');
    if (Object.keys(data).length !== 3) throw new Error('Expected 3 keys, got ' + Object.keys(data).length);
    console.log('PASS');
  } finally {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: Output contains `"claimantName": "Jane Doe"`, `"demandAmount": "$150,000"`, `"dateOfLoss": "2025-03-15"`, and prints `PASS`. The returned object has exactly 3 keys.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-002: Attorney-judgment override wins over extracted value

- **Description**: The `@@unique([jobId, fieldName])` constraint means each `(jobId, fieldName)` pair has exactly one row. When that row's `source === "attorney-judgment"`, the row's value is the override value already stored in DB. Verifies that `buildDataObject` returns the attorney-judgment value as-is (no separate merge logic needed — the DB row is already the canonical value).
- **Steps**:
  1. Source env as in UAT-SCRIPT-001.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-002-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    await prisma.extractedField.createMany({ data: [
      { jobId, fieldName: 'demand_amount', value: '$200,000', isNull: false, source: 'attorney-judgment', acceptMissing: false },
      { jobId, fieldName: 'claimant_name', value: 'John Smith', isNull: false, source: null, acceptMissing: false },
    ]});
    const data = await buildDataObject(jobId);
    if (data['demandAmount'] !== '$200,000') throw new Error('attorney override not preserved: got ' + data['demandAmount']);
    if (data['claimantName'] !== 'John Smith') throw new Error('claimantName mismatch');
    console.log('PASS');
  } finally {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: Returns `{ demandAmount: '$200,000', claimantName: 'John Smith' }`. Prints `PASS`. The attorney-judgment value `$200,000` is the value in the result.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-003: Null fields with acceptMissing=true included as empty string

- **Description**: When `isNull === true` and `acceptMissing === true`, the field must be included with an empty string `""` (not omitted). The sufficiency gate has already approved this field as intentionally absent. Downstream docxtemplater `nullGetter` can then decide treatment.
- **Steps**:
  1. Source env as above.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-003-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    await prisma.extractedField.createMany({ data: [
      { jobId, fieldName: 'incident_time', value: null, isNull: true, source: null, acceptMissing: true },
      { jobId, fieldName: 'claimant_name', value: 'Jane Roe', isNull: false, source: null, acceptMissing: false },
    ]});
    const data = await buildDataObject(jobId);
    if (!('incidentTime' in data)) throw new Error('incidentTime should be present (acceptMissing=true)');
    if (data['incidentTime'] !== '') throw new Error('incidentTime should be empty string, got: ' + JSON.stringify(data['incidentTime']));
    if (data['claimantName'] !== 'Jane Roe') throw new Error('claimantName mismatch');
    console.log('PASS');
  } finally {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: Result object contains `incidentTime: ""` (empty string, key present) and `claimantName: 'Jane Roe'`. Prints `PASS`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-004: Null fields with acceptMissing=false are omitted entirely

- **Description**: When `isNull === true` and `acceptMissing === false`, the field must be omitted from the result object (not set to empty string or null). The sufficiency gate handles blocking; the builder just skips these.
- **Steps**:
  1. Source env as above.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-004-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    await prisma.extractedField.createMany({ data: [
      { jobId, fieldName: 'policy_limits', value: null, isNull: true, source: null, acceptMissing: false },
      { jobId, fieldName: 'claimant_name', value: 'Bob Lee', isNull: false, source: null, acceptMissing: false },
    ]});
    const data = await buildDataObject(jobId);
    if ('policyLimits' in data) throw new Error('policyLimits should be omitted (isNull=true, acceptMissing=false)');
    if (data['claimantName'] !== 'Bob Lee') throw new Error('claimantName mismatch');
    if (Object.keys(data).length !== 1) throw new Error('Expected 1 key, got ' + Object.keys(data).length);
    console.log('PASS');
  } finally {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: Result object does NOT contain `policyLimits`. Only `claimantName` is present. Prints `PASS`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-005: Unknown fieldName (not in FIELD_SCHEMA) falls back to raw fieldName key

- **Description**: When `dbNameToTagName` returns `undefined` for an unrecognised `fieldName`, the builder must fall back to using the raw DB field name as the key (not crash, not drop the row).
- **Steps**:
  1. Source env as above.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-005-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    await prisma.extractedField.createMany({ data: [
      { jobId, fieldName: 'custom_unknown_field', value: 'some_value', isNull: false, source: null, acceptMissing: false },
    ]});
    const data = await buildDataObject(jobId);
    if (!('custom_unknown_field' in data)) throw new Error('Unknown field should fall back to raw fieldName key');
    if (data['custom_unknown_field'] !== 'some_value') throw new Error('Value mismatch for unknown field');
    console.log('PASS');
  } finally {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: Result contains `custom_unknown_field: 'some_value'` (raw snake_case key, not camelCase). Prints `PASS`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Empty job — throws on zero extracted fields

- **Description**: If a `jobId` has no `ExtractedField` rows at all, `buildDataObject` must throw `Error('No extracted fields found for job <jobId>')`. This is the explicit error contract from the task spec.
- **Steps**:
  1. Source env as above.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-edge-001-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    let threw = false;
    try {
      await buildDataObject(jobId);
    } catch (err: any) {
      threw = true;
      const expected = `No extracted fields found for job ${jobId}`;
      if (err.message !== expected) throw new Error(`Wrong error message. Expected: "${expected}", got: "${err.message}"`);
    }
    if (!threw) throw new Error('Expected buildDataObject to throw but it did not');
    console.log('PASS');
  } finally {
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: `buildDataObject` throws with message `No extracted fields found for job uat-036-edge-001-<timestamp>`. Script prints `PASS`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Mixed null/non-null rows — only eligible rows appear in output

- **Description**: A realistic job has a mix of: fields with values (include), fields with `isNull=true, acceptMissing=false` (omit), and fields with `isNull=true, acceptMissing=true` (include as `""`). Verifies all three inclusion rules applied simultaneously.
- **Steps**:
  1. Source env as above.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { prisma } from '@demand-letter/db';
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';

  const jobId = 'uat-036-edge-002-' + Date.now();
  try {
    await prisma.job.create({ data: { id: jobId, status: 'pending' } });
    await prisma.extractedField.createMany({ data: [
      // included: has value
      { jobId, fieldName: 'claimant_name', value: 'Alice', isNull: false, source: null, acceptMissing: false },
      // included as "": acceptMissing=true, isNull=true
      { jobId, fieldName: 'incident_time', value: null, isNull: true, source: null, acceptMissing: true },
      // omitted: isNull=true, acceptMissing=false
      { jobId, fieldName: 'policy_limits', value: null, isNull: true, source: null, acceptMissing: false },
      // included: has value AND acceptMissing=true (value wins over acceptMissing path)
      { jobId, fieldName: 'demand_amount', value: '$100,000', isNull: false, source: null, acceptMissing: true },
    ]});
    const data = await buildDataObject(jobId);
    if (data['claimantName'] !== 'Alice') throw new Error('claimantName wrong');
    if (!('incidentTime' in data) || data['incidentTime'] !== '') throw new Error('incidentTime should be empty string');
    if ('policyLimits' in data) throw new Error('policyLimits should be omitted');
    if (data['demandAmount'] !== '$100,000') throw new Error('demandAmount wrong: ' + data['demandAmount']);
    if (Object.keys(data).length !== 3) throw new Error('Expected 3 keys, got ' + Object.keys(data).length);
    console.log('PASS');
  } finally {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  }
  EOF
  ```
- **Expected Result**: Result has exactly 3 keys: `claimantName: 'Alice'`, `incidentTime: ''`, `demandAmount: '$100,000'`. `policyLimits` is absent. Prints `PASS`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-003: Re-export from lib/index.ts is accessible

- **Description**: Verifies that `buildDataObject` and `GenerationData` are correctly re-exported from `packages/api/src/lib/index.ts` so consumers can import from the barrel file.
- **Steps**:
  1. Source env as above.
  2. Run the script below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsx --tsconfig packages/api/tsconfig.json - << 'EOF'
  import { buildDataObject } from './packages/api/src/lib/index';
  if (typeof buildDataObject !== 'function') throw new Error('buildDataObject not exported from lib/index');
  console.log('PASS: buildDataObject is exported from lib/index');
  EOF
  ```
- **Expected Result**: Prints `PASS: buildDataObject is exported from lib/index`. No import error.
- [x] Pass <!-- 2026-06-24 -->

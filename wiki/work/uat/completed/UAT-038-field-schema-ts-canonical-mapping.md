---
id: UAT-038
title: "UAT: field-schema.ts: centralize snake_case → camelCase docxtemplater tag mapping"
status: passed
task: TASK-038
created: 2026-06-24
updated: 2026-06-24 <!-- UAT passed -->
---

# UAT-038 — UAT: field-schema.ts Canonical Field Mapping

implements::[[TASK-038]]

> **Source task**: [[TASK-038]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Working directory: repo root (`/Users/davidtaylor/Repositories/gauntlet/demand-letter`)
- [ ] `pnpm install` has been run and `node_modules` exist in `packages/api`
- [ ] `packages/api/src/lib/field-schema.ts` exists

---

## Test Cases

### UAT-SCRIPT-001: FIELD_SCHEMA exports and is non-empty
- **Scenario**: `FIELD_SCHEMA` is exported from `field-schema.ts` and from `index.ts`, is a non-empty readonly array of `FieldDef` objects
- **Steps**:
  1. Run the command below
- **Command**:
  ```bash
  node --input-type=module --loader ts-node/esm -e "
  import { FIELD_SCHEMA } from './packages/api/src/lib/field-schema.ts';
  if (!Array.isArray(FIELD_SCHEMA) || FIELD_SCHEMA.length === 0) throw new Error('FIELD_SCHEMA is empty or not an array');
  console.log('OK: FIELD_SCHEMA has', FIELD_SCHEMA.length, 'entries');
  " 2>&1 || cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA } from './src/lib/field-schema.js';
  if (!Array.isArray(FIELD_SCHEMA) || FIELD_SCHEMA.length === 0) throw new Error('FIELD_SCHEMA is empty or not an array');
  console.log('OK: FIELD_SCHEMA has', FIELD_SCHEMA.length, 'entries');
  "
  ```
- **Expected Result**: Prints `OK: FIELD_SCHEMA has 74 entries` (or the actual count; must be ≥ 40). No error thrown.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-002: Every FieldDef entry has all four required properties with correct types
- **Scenario**: Each element in `FIELD_SCHEMA` has `dbName` (string), `tagName` (string), `required` (boolean), `isLoop` (boolean). No entry has `undefined`, `null`, or mistyped values.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA } from './src/lib/field-schema.js';
  const bad = FIELD_SCHEMA.filter(f =>
    typeof f.dbName !== 'string' || !f.dbName ||
    typeof f.tagName !== 'string' || !f.tagName ||
    typeof f.required !== 'boolean' ||
    typeof f.isLoop !== 'boolean'
  );
  if (bad.length > 0) { console.error('FAIL: malformed entries', bad); process.exit(1); }
  console.log('OK: all', FIELD_SCHEMA.length, 'entries are well-formed FieldDef objects');
  "
  ```
- **Expected Result**: Prints `OK: all N entries are well-formed FieldDef objects` with no exit code 1.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-003: dbNameToTagName — known field mappings return correct camelCase tags
- **Scenario**: `dbNameToTagName` converts snake_case DB field names to camelCase docxtemplater tag names correctly for a representative sample across both source lists.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { dbNameToTagName } from './src/lib/field-schema.js';
  const cases = [
    ['letter_date', 'letterDate'],
    ['delivery_method', 'deliveryMethod'],
    ['adjuster_name', 'adjusterName'],
    ['claim_number', 'claimNumber'],
    ['date_of_loss', 'dateOfLoss'],
    ['per_provider_line_items', 'perProviderLineItems'],
    ['total_medical_specials', 'totalMedicalSpecials'],
    ['demand_amount', 'demandAmount'],
    ['general_damages_figure', 'generalDamagesFigure'],
    ['expiry_acceptance_mechanics', 'expiryAcceptanceMechanics'],
    ['claimant_dob', 'claimantDob'],
    ['insurer_adjuster_email', 'insurerAdjusterEmail'],
    ['pain_and_suffering_description', 'painAndSufferingDescription'],
    ['future_treatment_recommended', 'futureTreatmentRecommended'],
    ['attorney_bar_number', 'attorneyBarNumber'],
  ];
  let failed = 0;
  for (const [dbName, expected] of cases) {
    const result = dbNameToTagName(dbName);
    if (result !== expected) {
      console.error('FAIL:', dbName, '-> got', result, 'expected', expected);
      failed++;
    }
  }
  if (failed) process.exit(1);
  console.log('OK: all', cases.length, 'dbName->tagName mappings are correct');
  "
  ```
- **Expected Result**: Prints `OK: all 15 dbName->tagName mappings are correct` with no failures.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-004: tagNameToDbName — known tag names return correct snake_case DB field names
- **Scenario**: `tagNameToDbName` is the inverse of `dbNameToTagName` for all known fields.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { tagNameToDbName } from './src/lib/field-schema.js';
  const cases = [
    ['letterDate', 'letter_date'],
    ['claimNumber', 'claim_number'],
    ['perProviderLineItems', 'per_provider_line_items'],
    ['demandAmount', 'demand_amount'],
    ['painAndSufferingDescription', 'pain_and_suffering_description'],
    ['futureTreatmentRecommended', 'future_treatment_recommended'],
    ['expiryAcceptanceMechanics', 'expiry_acceptance_mechanics'],
    ['attorneyBarNumber', 'attorney_bar_number'],
  ];
  let failed = 0;
  for (const [tagName, expected] of cases) {
    const result = tagNameToDbName(tagName);
    if (result !== expected) {
      console.error('FAIL:', tagName, '-> got', result, 'expected', expected);
      failed++;
    }
  }
  if (failed) process.exit(1);
  console.log('OK: all', cases.length, 'tagName->dbName mappings are correct');
  "
  ```
- **Expected Result**: Prints `OK: all 8 tagName->dbName mappings are correct` with no failures.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-005: dbNameToTagName and tagNameToDbName return undefined for unknown names
- **Scenario**: Both helpers return `undefined` (not a thrown error, not null, not an empty string) when called with a name that is not in `FIELD_SCHEMA`.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { dbNameToTagName, tagNameToDbName } from './src/lib/field-schema.js';
  const r1 = dbNameToTagName('nonexistent_field');
  const r2 = tagNameToDbName('nonexistentField');
  const r3 = dbNameToTagName('');
  const r4 = tagNameToDbName('');
  if (r1 !== undefined) { console.error('FAIL: dbNameToTagName(unknown) returned', r1); process.exit(1); }
  if (r2 !== undefined) { console.error('FAIL: tagNameToDbName(unknown) returned', r2); process.exit(1); }
  if (r3 !== undefined) { console.error('FAIL: dbNameToTagName(\"\") returned', r3); process.exit(1); }
  if (r4 !== undefined) { console.error('FAIL: tagNameToDbName(\"\") returned', r4); process.exit(1); }
  console.log('OK: all unknown lookups return undefined');
  "
  ```
- **Expected Result**: Prints `OK: all unknown lookups return undefined` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-006: Round-trip consistency — dbNameToTagName and tagNameToDbName are mutual inverses for all entries
- **Scenario**: For every entry in `FIELD_SCHEMA`, `tagNameToDbName(dbNameToTagName(f.dbName))` equals `f.dbName` and `dbNameToTagName(tagNameToDbName(f.tagName))` equals `f.tagName`.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA, dbNameToTagName, tagNameToDbName } from './src/lib/field-schema.js';
  let failed = 0;
  for (const f of FIELD_SCHEMA) {
    const roundTripDb = tagNameToDbName(dbNameToTagName(f.dbName) ?? '');
    if (roundTripDb !== f.dbName) {
      console.error('FAIL roundtrip dbName:', f.dbName, '->', dbNameToTagName(f.dbName), '->', roundTripDb);
      failed++;
    }
    const roundTripTag = dbNameToTagName(tagNameToDbName(f.tagName) ?? '');
    if (roundTripTag !== f.tagName) {
      console.error('FAIL roundtrip tagName:', f.tagName, '->', tagNameToDbName(f.tagName), '->', roundTripTag);
      failed++;
    }
  }
  if (failed) process.exit(1);
  console.log('OK: all', FIELD_SCHEMA.length, 'entries pass round-trip consistency');
  "
  ```
- **Expected Result**: Prints `OK: all N entries pass round-trip consistency` with no failures.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-007: per_provider_line_items is the only isLoop: true entry
- **Scenario**: Exactly one entry has `isLoop: true`, and that entry's `dbName` is `per_provider_line_items` with `tagName` `perProviderLineItems`.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA } from './src/lib/field-schema.js';
  const loops = FIELD_SCHEMA.filter(f => f.isLoop);
  if (loops.length !== 1) {
    console.error('FAIL: expected exactly 1 isLoop entry, got', loops.length, JSON.stringify(loops));
    process.exit(1);
  }
  if (loops[0].dbName !== 'per_provider_line_items' || loops[0].tagName !== 'perProviderLineItems') {
    console.error('FAIL: wrong isLoop entry', JSON.stringify(loops[0]));
    process.exit(1);
  }
  console.log('OK: per_provider_line_items is the only isLoop:true entry');
  "
  ```
- **Expected Result**: Prints `OK: per_provider_line_items is the only isLoop:true entry` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-008: required: true and required: false fields are correctly assigned
- **Scenario**: Core template-side fields (letter_date, demand_amount, release_scope, etc.) are `required: true`; optional fields (incident_time, future_treatment, lien_handling_terms, per_provider_line_items) are `required: false`.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { dbNameToTagName, FIELD_SCHEMA } from './src/lib/field-schema.js';
  const req = (name) => FIELD_SCHEMA.find(f => f.dbName === name)?.required;
  const mustBeTrue = ['letter_date','delivery_method','adjuster_name','claim_number','date_of_loss','demand_amount','policy_limits','release_scope','expiry_acceptance_mechanics','attorney_name','firm_name','firm_address','diagnoses','treating_providers','at_fault_party','at_fault_conduct','general_damages_figure','claimant_name','insured_name','insurer_name','insurer_address','demand_expiry_date','incident_date','incident_location','total_medical_specials','adjuster_title'];
  const mustBeFalse = ['incident_time','traffic_conditions','claimant_conduct','liability_admission_status','examination_findings','imaging_results','future_treatment','per_provider_line_items','future_medical_reserve','occupational_impact_narrative','statutory_citation','lien_handling_terms','payee_instructions','bar_affiliation'];
  let failed = 0;
  for (const name of mustBeTrue) {
    if (req(name) !== true) { console.error('FAIL: expected required:true for', name, 'got', req(name)); failed++; }
  }
  for (const name of mustBeFalse) {
    if (req(name) !== false) { console.error('FAIL: expected required:false for', name, 'got', req(name)); failed++; }
  }
  if (failed) process.exit(1);
  console.log('OK: required flags correct for all', mustBeTrue.length + mustBeFalse.length, 'checked fields');
  "
  ```
- **Expected Result**: Prints `OK: required flags correct for all 40 checked fields` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-009: index.ts re-exports FIELD_SCHEMA, dbNameToTagName, tagNameToDbName, and FieldDef type
- **Scenario**: All four public symbols from `field-schema.ts` are importable via the barrel `index.ts`.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA, dbNameToTagName, tagNameToDbName } from './src/lib/index.js';
  if (!Array.isArray(FIELD_SCHEMA) || FIELD_SCHEMA.length === 0) throw new Error('FIELD_SCHEMA not re-exported');
  if (typeof dbNameToTagName !== 'function') throw new Error('dbNameToTagName not re-exported');
  if (typeof tagNameToDbName !== 'function') throw new Error('tagNameToDbName not re-exported');
  console.log('OK: all symbols re-exported correctly from index.ts');
  "
  ```
- **Expected Result**: Prints `OK: all symbols re-exported correctly from index.ts` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-010: generation-data-builder.ts imports dbNameToTagName from field-schema (no inline toCamel)
- **Scenario**: The inline `toCamel` regex has been removed from `generation-data-builder.ts` and the file imports `dbNameToTagName` from `./field-schema` instead.
- **Steps**:
  1. Search the source file for the presence of `dbNameToTagName` import and absence of a toCamel regex
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./src/lib/generation-data-builder.ts', 'utf8');
  if (!src.includes(\"import { dbNameToTagName } from './field-schema'\") &&
      !src.includes('import { dbNameToTagName } from \"./field-schema\"') &&
      !src.includes('dbNameToTagName')) {
    console.error('FAIL: dbNameToTagName import not found in generation-data-builder.ts'); process.exit(1);
  }
  if (/const toCamel\s*=/.test(src) || /\.replace\(\/[^/]*_[^/]*\/.*camel/i.test(src)) {
    console.error('FAIL: inline toCamel regex still present in generation-data-builder.ts'); process.exit(1);
  }
  console.log('OK: generation-data-builder.ts imports dbNameToTagName and has no inline toCamel regex');
  "
  ```
- **Expected Result**: Prints `OK: generation-data-builder.ts imports dbNameToTagName and has no inline toCamel regex` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-011: buildDataObject uses dbNameToTagName as the key mapper
- **Scenario**: `generation-data-builder.ts` source contains `dbNameToTagName(row.fieldName) ?? row.fieldName` as the key construction expression, confirming the fallback contract.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./src/lib/generation-data-builder.ts', 'utf8');
  if (!src.includes('dbNameToTagName(row.fieldName) ?? row.fieldName')) {
    console.error('FAIL: fallback key expression not found in generation-data-builder.ts');
    console.error('Hint: expected: dbNameToTagName(row.fieldName) ?? row.fieldName');
    process.exit(1);
  }
  console.log('OK: buildDataObject uses dbNameToTagName(row.fieldName) ?? row.fieldName');
  "
  ```
- **Expected Result**: Prints `OK: buildDataObject uses dbNameToTagName(row.fieldName) ?? row.fieldName` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-SCRIPT-012: Typecheck passes with zero errors
- **Scenario**: The TypeScript compiler accepts all changes introduced by TASK-038 with no type errors.
- **Steps**:
  1. Run from the repo root
- **Command**:
  ```bash
  make typecheck
  ```
- **Expected Result**: Exit code 0, with output indicating typecheck passed. No TypeScript errors reported across any package.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-001: dbNameToTagName does not throw on unexpected input types — null/undefined
- **Scenario**: The helper handles gracefully even when called with values that might arrive from unsafe JS callers (not typed callers).
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { dbNameToTagName, tagNameToDbName } from './src/lib/field-schema.js';
  let ok = true;
  try {
    const r = (dbNameToTagName as any)(null);
    if (r !== undefined) { console.error('FAIL: dbNameToTagName(null) returned', r); ok = false; }
  } catch(e) {
    console.error('FAIL: dbNameToTagName(null) threw:', e.message); ok = false;
  }
  try {
    const r = (tagNameToDbName as any)(undefined);
    if (r !== undefined) { console.error('FAIL: tagNameToDbName(undefined) returned', r); ok = false; }
  } catch(e) {
    console.error('FAIL: tagNameToDbName(undefined) threw:', e.message); ok = false;
  }
  if (!ok) process.exit(1);
  console.log('OK: helpers return undefined for null/undefined input without throwing');
  "
  ```
- **Expected Result**: Prints `OK: helpers return undefined for null/undefined input without throwing` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-002: No duplicate dbName or tagName values in FIELD_SCHEMA
- **Scenario**: `FIELD_SCHEMA` is a canonical mapping — each `dbName` and each `tagName` must be unique across all entries. Duplicates would cause the helpers to silently return the first match and shadow the second.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA } from './src/lib/field-schema.js';
  const dbNames = FIELD_SCHEMA.map(f => f.dbName);
  const tagNames = FIELD_SCHEMA.map(f => f.tagName);
  const dupDb = dbNames.filter((n, i) => dbNames.indexOf(n) !== i);
  const dupTag = tagNames.filter((n, i) => tagNames.indexOf(n) !== i);
  if (dupDb.length || dupTag.length) {
    if (dupDb.length) console.error('FAIL: duplicate dbName(s):', dupDb);
    if (dupTag.length) console.error('FAIL: duplicate tagName(s):', dupTag);
    process.exit(1);
  }
  console.log('OK: no duplicate dbName or tagName values in FIELD_SCHEMA');
  "
  ```
- **Expected Result**: Prints `OK: no duplicate dbName or tagName values in FIELD_SCHEMA` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-003: All tagName values are valid camelCase (no underscores, starts with lowercase)
- **Scenario**: docxtemplater tag names must be camelCase. Any tagName with underscores or leading uppercase would be passed verbatim to docxtemplater and silently fail to match a template slot.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA } from './src/lib/field-schema.js';
  const camelPattern = /^[a-z][a-zA-Z0-9]*$/;
  const bad = FIELD_SCHEMA.filter(f => !camelPattern.test(f.tagName));
  if (bad.length) {
    console.error('FAIL: non-camelCase tagName(s):', bad.map(f => f.tagName));
    process.exit(1);
  }
  console.log('OK: all', FIELD_SCHEMA.length, 'tagName values are valid camelCase');
  "
  ```
- **Expected Result**: Prints `OK: all N tagName values are valid camelCase` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-004: All dbName values are valid snake_case (lowercase letters, digits, underscores only)
- **Scenario**: `dbName` values are stored in `extracted_fields.fieldName` in Postgres — camelCase or mixed-case values would cause lookup mismatches at runtime.
- **Steps**:
  1. Run the command below from `packages/api`
- **Command**:
  ```bash
  cd packages/api && npx tsx -e "
  import { FIELD_SCHEMA } from './src/lib/field-schema.js';
  const snakePattern = /^[a-z][a-z0-9_]*$/;
  const bad = FIELD_SCHEMA.filter(f => !snakePattern.test(f.dbName));
  if (bad.length) {
    console.error('FAIL: non-snake_case dbName(s):', bad.map(f => f.dbName));
    process.exit(1);
  }
  console.log('OK: all', FIELD_SCHEMA.length, 'dbName values are valid snake_case');
  "
  ```
- **Expected Result**: Prints `OK: all N dbName values are valid snake_case` with exit code 0.
- [x] Pass <!-- 2026-06-24 -->

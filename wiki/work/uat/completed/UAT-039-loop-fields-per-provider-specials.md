---
id: UAT-039
title: "UAT: Loop Fields: Per-Provider Specials Table"
status: passed
task: TASK-039
created: 2026-06-24
updated: 2026-06-24
---

# UAT-039 — UAT: Loop Fields: Per-Provider Specials Table

implements::[[TASK-039]]

> **Source task**: [[TASK-039]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] PostgreSQL running and `DATABASE_URL` set (or `.env` sourced) so `prisma` can connect
- [ ] `pnpm install` has been run at the repo root
- [ ] A test job row exists in the `jobs` table (required by `ExtractedField.jobId` FK); scripts below create one via `prisma.$executeRaw` or direct insert
- [ ] `packages/api` and `packages/db` built / `tsx` available for script invocation

---

## Test Cases

### UAT-SCRIPT-001: Happy path — valid JSON array produces `specials` key with correct shape

- **Description**: When `per_provider_line_items` has a well-formed JSON array value, `buildDataObject` must write it under the key `specials` with the parsed array, and the returned object must have a `specials` entry whose elements each have `provider`, `amount`, and `date` string fields.
- **Steps**:
  1. Create a job row and one `extracted_fields` row: `fieldName='per_provider_line_items'`, `value='[{"provider":"UCSF","amount":"$4,200","date":"2024-03-15"},{"provider":"Stanford Health","amount":"$1,800","date":"2024-04-01"}]'`, `isNull=false`, `acceptMissing=false`.
  2. Run the script below (replace `<JOB_ID>` with the inserted job ID).
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  const data = await buildDataObject('<JOB_ID>');
  const specials = data['specials'];
  if (!Array.isArray(specials)) { console.error('FAIL: specials is not an array'); process.exit(1); }
  if (specials.length !== 2) { console.error('FAIL: expected 2 items, got', specials.length); process.exit(1); }
  const first = specials[0];
  if (first.provider !== 'UCSF' || first.amount !== '\$4,200' || first.date !== '2024-03-15') { console.error('FAIL: first item wrong:', JSON.stringify(first)); process.exit(1); }
  console.log('PASS', JSON.stringify(specials));
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS [{"provider":"UCSF","amount":"$4,200","date":"2024-03-15"},{"provider":"Stanford Health","amount":"$1,800","date":"2024-04-01"}]`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-002: `specials` key NOT present in scalar section — loop field excluded from flat object

- **Description**: The `per_provider_line_items` field must be handled only in the loop pass. It must NOT appear in the flat scalar section of the returned object (i.e. no `perProviderLineItems` key and no raw `per_provider_line_items` key).
- **Steps**:
  1. Reuse the job and `extracted_fields` row from UAT-SCRIPT-001 (or insert a fresh one with the same `per_provider_line_items` value plus one scalar field, e.g. `fieldName='demand_amount'`, `value='$250,000'`, `isNull=false`).
  2. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  const data = await buildDataObject('<JOB_ID>');
  if ('perProviderLineItems' in data) { console.error('FAIL: perProviderLineItems key leaked into scalar section'); process.exit(1); }
  if ('per_provider_line_items' in data) { console.error('FAIL: per_provider_line_items raw key leaked into scalar section'); process.exit(1); }
  if (!('specials' in data)) { console.error('FAIL: specials key missing entirely'); process.exit(1); }
  console.log('PASS keys:', Object.keys(data).join(', '));
  "
  ```
- **Expected Result**: Script exits 0; output contains `PASS keys:` with no `perProviderLineItems` or `per_provider_line_items` among the keys, but `specials` is present.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-003: Null value writes empty array under `specials`

- **Description**: When `per_provider_line_items` has `value=NULL` (i.e. `row.value` is `null`), `buildDataObject` must write `[]` under `specials` — never omit the key and never throw.
- **Steps**:
  1. Insert an `extracted_fields` row: `fieldName='per_provider_line_items'`, `value=NULL`, `isNull=true`, `acceptMissing=false`.
  2. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  const data = await buildDataObject('<JOB_ID>');
  const specials = data['specials'];
  if (!Array.isArray(specials)) { console.error('FAIL: specials is not an array, got', typeof specials); process.exit(1); }
  if (specials.length !== 0) { console.error('FAIL: expected empty array, got', specials.length, 'items'); process.exit(1); }
  console.log('PASS specials=[]');
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS specials=[]`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-004: Empty string value writes empty array under `specials`

- **Description**: When `per_provider_line_items` has `value=''` (empty string — which `JSON.parse('')` throws on), `buildDataObject` must silently catch the error and write `[]` under `specials`.
- **Steps**:
  1. Insert an `extracted_fields` row: `fieldName='per_provider_line_items'`, `value=''`, `isNull=false`, `acceptMissing=false`.
  2. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  const data = await buildDataObject('<JOB_ID>');
  const specials = data['specials'];
  if (!Array.isArray(specials)) { console.error('FAIL: specials not an array'); process.exit(1); }
  if (specials.length !== 0) { console.error('FAIL: expected empty array, length was', specials.length); process.exit(1); }
  console.log('PASS empty string → specials=[]');
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS empty string → specials=[]`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Malformed JSON value writes empty array — never throws

- **Description**: When `per_provider_line_items.value` is malformed JSON (e.g. `'not-json'`), `buildDataObject` must catch the `JSON.parse` error and return `[]` under `specials`. The function must not throw.
- **Steps**:
  1. Insert an `extracted_fields` row: `fieldName='per_provider_line_items'`, `value='not-json'`, `isNull=false`, `acceptMissing=false`.
  2. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  let data;
  try {
    data = await buildDataObject('<JOB_ID>');
  } catch (err) {
    console.error('FAIL: buildDataObject threw:', err.message); process.exit(1);
  }
  const specials = data['specials'];
  if (!Array.isArray(specials) || specials.length !== 0) { console.error('FAIL: expected specials=[], got', JSON.stringify(specials)); process.exit(1); }
  console.log('PASS malformed JSON → specials=[]');
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS malformed JSON → specials=[]`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Partially malformed JSON object in array — behavior verification

- **Description**: When `per_provider_line_items.value` is a JSON array where one element is missing a required field (e.g. `[{"provider":"UCSF","amount":"$1,000"}]` — no `date` key), `buildDataObject` must still return the parsed array as-is (no validation layer). The key requirement is that `JSON.parse` succeeds and the array is stored verbatim.
- **Steps**:
  1. Insert an `extracted_fields` row: `fieldName='per_provider_line_items'`, `value='[{"provider":"UCSF","amount":"$1,000"}]'`, `isNull=false`, `acceptMissing=false`.
  2. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  const data = await buildDataObject('<JOB_ID>');
  const specials = data['specials'];
  if (!Array.isArray(specials) || specials.length !== 1) { console.error('FAIL: expected 1-item array, got', JSON.stringify(specials)); process.exit(1); }
  if (specials[0].provider !== 'UCSF') { console.error('FAIL: provider mismatch'); process.exit(1); }
  console.log('PASS partial object preserved verbatim:', JSON.stringify(specials));
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS partial object preserved verbatim: [{"provider":"UCSF","amount":"$1,000"}]`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-003: Return type is `Record<string, string | Array<Record<string, string>>>`

- **Description**: `GenerationData` must be exported as a type alias `Record<string, string | Array<Record<string, string>>>` from `generation-data-builder.ts` (or `lib/index.ts`). This test verifies the static export and that the `specials` key is assignable to the union type.
- **Steps**:
  1. Search `packages/api/src/lib/generation-data-builder.ts` for the `GenerationData` type alias.
  2. Search `packages/api/src/lib/index.ts` for the re-export of `GenerationData`.
  3. Run typecheck.
- **Command**:
  ```bash
  grep -n 'GenerationData' packages/api/src/lib/generation-data-builder.ts packages/api/src/lib/index.ts && pnpm --filter @demand-letter/api typecheck
  ```
- **Expected Result**:
  - `generation-data-builder.ts` contains `export type GenerationData = Record<string, string | Array<Record<string, string>>>` (or equivalent union)
  - `index.ts` re-exports `GenerationData`
  - `pnpm typecheck` exits 0 with no errors
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-005: `tagName` is `specials` (not `perProviderLineItems`) — schema verification

- **Description**: The `FIELD_SCHEMA` entry for `per_provider_line_items` must have `tagName: "specials"` (hardcoded) and `isLoop: true`. This is the one case where tag name diverges from the camelCase formula.
- **Steps**:
  1. Run the script below to confirm the schema entry.
- **Command**:
  ```bash
  npx tsx -e "
  import { FIELD_SCHEMA } from './packages/api/src/lib/field-schema';
  const entry = FIELD_SCHEMA.find(f => f.dbName === 'per_provider_line_items');
  if (!entry) { console.error('FAIL: per_provider_line_items not found in FIELD_SCHEMA'); process.exit(1); }
  if (entry.tagName !== 'specials') { console.error('FAIL: tagName is', entry.tagName, 'expected specials'); process.exit(1); }
  if (entry.isLoop !== true) { console.error('FAIL: isLoop is', entry.isLoop, 'expected true'); process.exit(1); }
  console.log('PASS tagName=specials isLoop=true');
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS tagName=specials isLoop=true`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-006: `per_provider_line_items` is the only `isLoop: true` entry in `FIELD_SCHEMA`

- **Description**: `FIELD_SCHEMA` must have exactly one entry with `isLoop: true`. All other entries must have `isLoop: false`. This guards against accidental loop-field proliferation.
- **Steps**:
  1. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { FIELD_SCHEMA } from './packages/api/src/lib/field-schema';
  const loopFields = FIELD_SCHEMA.filter(f => f.isLoop);
  if (loopFields.length !== 1) { console.error('FAIL: expected 1 loop field, found', loopFields.length, ':', loopFields.map(f=>f.dbName).join(', ')); process.exit(1); }
  if (loopFields[0].dbName !== 'per_provider_line_items') { console.error('FAIL: wrong loop field:', loopFields[0].dbName); process.exit(1); }
  console.log('PASS exactly one loop field: per_provider_line_items');
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS exactly one loop field: per_provider_line_items`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-007: Mixed scalar + loop fields — scalar fields unaffected by loop processing

- **Description**: When a job has both scalar fields (e.g. `demand_amount`) and the `per_provider_line_items` loop field, `buildDataObject` must correctly return both — scalar fields as strings under their camelCase keys, and loop field as an array under `specials`.
- **Steps**:
  1. Insert `extracted_fields` rows for a job: one scalar (`fieldName='demand_amount'`, `value='$250,000'`, `isNull=false`) and one loop (`fieldName='per_provider_line_items'`, `value='[{"provider":"UCSF","amount":"$4,200","date":"2024-03-15"}]'`, `isNull=false`).
  2. Run the script below.
- **Command**:
  ```bash
  npx tsx -e "
  import { buildDataObject } from './packages/api/src/lib/generation-data-builder';
  const data = await buildDataObject('<JOB_ID>');
  if (data['demandAmount'] !== '\$250,000') { console.error('FAIL: demandAmount wrong:', data['demandAmount']); process.exit(1); }
  if (!Array.isArray(data['specials']) || data['specials'].length !== 1) { console.error('FAIL: specials wrong:', JSON.stringify(data['specials'])); process.exit(1); }
  if (data['specials'][0].provider !== 'UCSF') { console.error('FAIL: specials[0].provider wrong'); process.exit(1); }
  console.log('PASS scalar and loop fields coexist correctly');
  "
  ```
- **Expected Result**: Script exits 0 and prints `PASS scalar and loop fields coexist correctly`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-008: `buildDataObject` and `GenerationData` re-exported from `lib/index.ts`

- **Description**: The lib barrel must re-export both `buildDataObject` and `GenerationData` so downstream callers (e.g. `post-jobs-generate.ts`) can import from `'../lib'` without reaching into the file directly.
- **Steps**:
  1. Run the command below to verify the re-exports exist.
- **Command**:
  ```bash
  grep -n 'buildDataObject\|GenerationData' packages/api/src/lib/index.ts
  ```
- **Expected Result**: Output contains at least one line referencing `buildDataObject` and at least one line referencing `GenerationData` (either individual named exports or a wildcard re-export that covers them)
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-009: Monorepo-wide typecheck passes with loop-field changes

- **Description**: The updated `buildDataObject` return type (`Record<string, string | Array<...>>`) and the `GenerationData` type alias must not introduce any TypeScript errors across the monorepo.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits 0 with zero type errors across all three packages (`api`, `db`, `web`)
- [x] Pass <!-- 2026-06-24 -->

---
id: TASK-038
title: "field-schema.ts: centralize snake_case → camelCase docxtemplater tag mapping"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: [TASK-036, TASK-037, TASK-039]
uat: ""
tags: [generation, docxtemplater, field-schema, canonical]
---

# TASK-038 — field-schema.ts Canonical Field Mapping

## Objective

Create `packages/api/src/lib/field-schema.ts` as the single source of truth for the mapping between DB field names (snake_case, e.g. `patient_name`) and docxtemplater tag keys (camelCase, e.g. `patientName`). This file replaces the ad-hoc snake_case → camelCase regex in `generation-data-builder.ts` (TASK-036) and the duplicate `CANONICAL_FIELDS` arrays currently split between `zone-field-schema.ts` and `extraction-schema.ts`. Update `generation-data-builder.ts` to import from this new file.

## Approach

Create one exported constant `FIELD_SCHEMA` as an array of `{ dbName: string; tagName: string; required: boolean; isLoop: boolean }` objects, covering the full canonical field list. The `dbName` is the snake_case name stored in `extracted_fields.fieldName`; the `tagName` is the camelCase key docxtemplater expects. `required` controls whether the sufficiency gate counts a missing value as a blocking gap. `isLoop` flags fields that carry arrays (e.g. `per_provider_line_items`) for special handling in TASK-039. Export convenience helpers: `dbNameToTagName(dbName: string): string | undefined` and `tagNameToDbName(tagName: string): string | undefined`.

The two existing `CANONICAL_FIELDS` constants (`zone-field-schema.ts` and `extraction-schema.ts`) diverged during development. This task reconciles them against the Prisma schema and the template's actual variable zones.

## Steps

### 1. Audit existing field lists  <!-- agent: general-purpose -->

- [ ] Read `packages/api/src/lib/zone-field-schema.ts` — note the full list of snake_case field names.
- [ ] Read `packages/api/src/lib/extraction-schema.ts` — note the `CANONICAL_FIELDS` array.
- [ ] Identify fields that appear in one but not the other; resolve discrepancies by keeping all unique fields from both lists (union).

### 2. Create `packages/api/src/lib/field-schema.ts`  <!-- agent: general-purpose -->

- [ ] Create the file with:
  ```ts
  export interface FieldDef {
    dbName: string;    // snake_case, matches extracted_fields.fieldName
    tagName: string;   // camelCase, matches docxtemplater {tag}
    required: boolean; // if true, sufficiency gate treats absence as a gap
    isLoop: boolean;   // if true, value is an array (handled by TASK-039)
  }

  export const FIELD_SCHEMA: readonly FieldDef[] = [
    // ... one entry per canonical field
  ];
  ```
- [ ] Populate `FIELD_SCHEMA` with all fields from the union of the two existing field lists.
- [ ] Convert each `dbName` to `tagName` using consistent snake_case → camelCase: `_([a-z])` → uppercase letter. Verify manually for multi-segment names (e.g. `per_provider_line_items` → `perProviderLineItems`).
- [ ] Mark `isLoop: true` for `per_provider_line_items` (the specials/provider line-items array). All other fields: `isLoop: false`.
- [ ] Mark `required: false` for fields where `required` in `TemplateSlot` may be `false` (e.g. optional fields like `future_treatment`, `lien_handling_terms`). Default to `required: true` for all others.
- [ ] Export helpers:
  ```ts
  export function dbNameToTagName(dbName: string): string | undefined {
    return FIELD_SCHEMA.find(f => f.dbName === dbName)?.tagName;
  }
  export function tagNameToDbName(tagName: string): string | undefined {
    return FIELD_SCHEMA.find(f => f.tagName === tagName)?.dbName;
  }
  ```

### 3. Update `generation-data-builder.ts` to use `FIELD_SCHEMA`  <!-- agent: general-purpose -->

- [ ] Remove the inline `toCamel` regex from `generation-data-builder.ts` (TASK-036 file).
- [ ] Import `dbNameToTagName` from `./field-schema`.
- [ ] In `buildDataObject`, replace the regex call with `dbNameToTagName(row.fieldName) ?? row.fieldName` for fields with no explicit schema entry.

### 4. Re-export from `packages/api/src/lib/index.ts`  <!-- agent: general-purpose -->

- [ ] Add: `export { FIELD_SCHEMA, dbNameToTagName, tagNameToDbName, type FieldDef } from './field-schema';`

### 5. Typecheck  <!-- agent: general-purpose -->

- [ ] Run `pnpm typecheck` from the repo root.
- [ ] Fix any type errors before marking done.

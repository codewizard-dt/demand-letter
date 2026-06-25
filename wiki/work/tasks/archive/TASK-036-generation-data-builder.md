---
id: TASK-036
title: "Generation data builder: assemble docxtemplater data object from extracted_fields"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: []
uat: "[[UAT-036]]"
tags: [generation, docxtemplater, extraction, data-assembly]
---

# TASK-036 — Generation Data Builder

## Objective

Create `packages/api/src/lib/generation-data-builder.ts` with a `buildDataObject(jobId)` function that queries all `extracted_fields` rows for a job, applies attorney-judgment overrides (rows where `source === "attorney-judgment"`), converts snake_case field names to camelCase docxtemplater tag keys, and returns a flat `Record<string, string>` ready for template variable substitution. Fields where the extracted value is null and not accepted-missing are excluded (the sufficiency gate handles blocking — this builder just omits them).

## Approach

The builder is a pure data assembly step: read from the DB, transform field names, priority-select values, return a plain object. Field name conversion uses a simple snake_case → camelCase regex (`_([a-z])` → uppercase). This will be superseded by the centralized `field-schema.ts` mapping (TASK-038), but implementing it here avoids a blocking dependency. Attorney-judgment rows win over extracted rows for the same field. Fields with `isNull === true` and `acceptMissing === false` are omitted (not set to empty string) so docxtemplater's `nullGetter` can enforce strictness downstream.

## Steps

### 1. Create `packages/api/src/lib/generation-data-builder.ts`  <!-- agent: general-purpose -->

- [x] Create the file with a single exported async function:
  ```ts
  import { prisma } from '@demand-letter/db';

  export type GenerationData = Record<string, string>;

  export async function buildDataObject(jobId: string): Promise<GenerationData> { ... }
  ```
- [ ] Inside `buildDataObject`:
  - Query all `ExtractedField` rows for the job:
    ```ts
    const rows = await prisma.extractedField.findMany({
      where: { jobId },
      select: { fieldName: true, value: true, isNull: true, source: true, acceptMissing: true },
    });
    ```
  - Build a `Map<string, { value: string | null; source: string | null; isNull: boolean; acceptMissing: boolean }>` keyed on `fieldName`. If two rows share the same `fieldName` (shouldn't happen due to `@@unique`), last write wins.
  - Convert each `fieldName` from snake_case to camelCase using:
    ```ts
    function toCamel(s: string): string {
      return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    }
    ```
  - Build result object: for each row, include the field in the output only if:
    - `isNull === false` and `value !== null` — use `value` as the string
    - OR `acceptMissing === true` — use `""` as the placeholder (field is present but empty; sufficiency gate already passed)
    - Skip entirely if `isNull === true && acceptMissing === false`
  - Attorney-judgment priority: since rows are unique per `(jobId, fieldName)` in the DB, the `source` field on the row already reflects attorney overrides — no separate priority merge needed.
  - Return the assembled `Record<string, string>`.
- [x] Throw `Error('No extracted fields found for job ${jobId}')` if `rows.length === 0`.

### 2. Re-export from `packages/api/src/lib/index.ts`  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/lib/index.ts`.
- [x] Add: `export { buildDataObject, type GenerationData } from './generation-data-builder';`

### 3. Typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` (or `tsc --noEmit`) from the repo root.
- [x] Fix any type errors before marking done.

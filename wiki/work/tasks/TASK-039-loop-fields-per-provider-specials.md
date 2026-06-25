---
id: TASK-039
title: "Loop fields: handle {#specials}…{/specials} per-provider line items in data object"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-036, TASK-038]
blocks: []
parallel_safe_with: [TASK-037]
uat: ""
tags: [generation, docxtemplater, loop-fields, specials]
---

# TASK-039 — Loop Fields: Per-Provider Specials Table

## Objective

Extend `buildDataObject` in `packages/api/src/lib/generation-data-builder.ts` to handle the `per_provider_line_items` loop field. The docxtemplater template uses `{#specials}…{/specials}` loop syntax; the data object must carry an array of `{ provider: string; amount: string; date: string }` objects under the key `specials`. This task parses the JSON-encoded `per_provider_line_items` extracted field value into that array and merges it into the data object.

## Approach

The `extracted_fields` table stores `per_provider_line_items.value` as a JSON string (e.g. `[{"provider":"UCSF","amount":"$4,200","date":"2024-03-15"}]`). The data builder must detect the `isLoop: true` flag from `FIELD_SCHEMA` (TASK-038), parse the JSON string, and write the parsed array under the `specials` key (not under `perProviderLineItems`). If the JSON is malformed or empty, write an empty array `[]` under `specials` — never throw.

The docxtemplater loop tag is `specials` (not the camelCase of the DB field name). This is the one case where the tag name diverges from the camelCase formula; it must be hardcoded in the schema entry (`tagName: "specials"` in `field-schema.ts`).

## Steps

### 1. Verify `field-schema.ts` loop field entry  <!-- agent: general-purpose -->

- [ ] Read `packages/api/src/lib/field-schema.ts` (created by TASK-038).
- [ ] Confirm `per_provider_line_items` has `isLoop: true` and `tagName: "specials"`.
- [ ] If not, update the entry in `field-schema.ts`.

### 2. Update `buildDataObject` in `generation-data-builder.ts`  <!-- agent: general-purpose -->

- [ ] Import `FIELD_SCHEMA` from `./field-schema`.
- [ ] After building the flat scalar data object, process loop fields:
  ```ts
  // Separate loop fields from scalar fields
  const loopFieldNames = new Set(
    FIELD_SCHEMA.filter(f => f.isLoop).map(f => f.dbName)
  );

  for (const row of rows) {
    const def = FIELD_SCHEMA.find(f => f.dbName === row.fieldName);
    if (!def?.isLoop) continue;
    if (!row.value) {
      data[def.tagName] = [];
      continue;
    }
    try {
      data[def.tagName] = JSON.parse(row.value);
    } catch {
      data[def.tagName] = [];
    }
  }
  ```
- [ ] Ensure scalar loop-field entries are NOT included in the flat scalar section — use the `isLoop` flag to skip them there.
- [ ] Update the return type from `Record<string, string>` to `Record<string, string | Array<Record<string, string>>>` (or a more specific union type) if needed.

### 3. Typecheck  <!-- agent: general-purpose -->

- [ ] Run `pnpm typecheck` from the repo root.
- [ ] Fix any type errors before marking done.

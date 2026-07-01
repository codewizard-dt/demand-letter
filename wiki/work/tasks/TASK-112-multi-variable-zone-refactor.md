---
id: TASK-112
title: "Refactor Zone model: elevate templateText to primary source of truth for multi-variable zones"
status: in-progress
created: 2026-06-30
updated: 2026-06-30
depends_on: []
blocks: []
parallel_safe_with: [TASK-111]
uat: "[[UAT-112]]"
tags: [template, zones, refactor]
---

# TASK-112 — Refactor Zone model: elevate templateText to primary source of truth for multi-variable zones

## Objective

The current `Zone` model maps one zone to one field name (`suggestedFieldName`). Real demand letter paragraphs can contain multiple variables (e.g. a single paragraph referencing `{incident_date}`, `{incident_location}`, and `{claimant_name}`), and the same variable can appear in multiple zones. The `templateText` column already exists on `Zone` and the DOCX injector already handles multi-variable template strings — the generation loop, classifier prompt, and frontend just need to catch up. No DB migration is required.

Research backing: `raw/research/multi-variable-zone-refactor/index.md`

## Approach

`Zone.templateText` is elevated from "optional label-text override" to the primary source of truth for every `variable_populated` zone. It holds the full paragraph template string with every variable slot expressed as `{field_name}`. `suggestedFieldName` is kept as a **derived/cached** field equal to the first `{field}` match in `templateText` — needed for the load-bearing `medicalNarrative` lookup and fast DB queries, but no longer the rendering source of truth.

The deduplication logic in the injector and the `applyDistinctDuplicateSuffixes` rename pass in the classifier are both removed — they were workarounds for the one-to-one model.

## Steps

### 1. Add `renderZoneContent` helper and fix all generation sites  <!-- agent: general-purpose -->

**File:** `app/server/src/routes/rest.ts`

The four `String.replace(literal, value)` calls each replace only the first occurrence of one field name. Replace them all with a shared helper.

- [x] Add a module-level helper at the top of `routes/rest.ts` (after imports): <!-- Completed: 2026-06-30 -->

```ts
function renderZoneContent(
  templateText: string | null,
  suggestedFieldName: string | null,
  data: Record<string, unknown>,
): string {
  const tmpl = templateText ?? (suggestedFieldName ? `{${suggestedFieldName}}` : '');
  if (!tmpl) return '';
  return tmpl.replace(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (_, field: string) => {
    const val = data[field] ?? data[dbNameToTagName(field) ?? ''] ?? '';
    return typeof val === 'string' ? val : String(val);
  });
}
```

- [x] Replace **line ~832** (Step 2 non-narrative variable zones):
  - Old: `const content = z.templateText ? z.templateText.replace(\`{${z.suggestedFieldName}}\`, value) : value;`
  - New: `const content = renderZoneContent(z.templateText, z.suggestedFieldName, data);`
  - Remove the `const value = ...` line that precedes it; the helper reads from `data` directly.
  - Update the filter condition: remove `typeof (data as Record<string, unknown>)[z.suggestedFieldName] === 'string'` — instead emit for any `variable_populated` zone that is not the narrative zone and has `templateText` or `suggestedFieldName`.

- [x] Replace **line ~856** (Step 3 narrative zone final emit):
  - Old: `const content = narrativeZone.templateText ? narrativeZone.templateText.replace(\`{${narrativeZone.suggestedFieldName}}\`, narrativeText) : narrativeText;`
  - New: call `renderZoneContent(narrativeZone.templateText, narrativeZone.suggestedFieldName, data)` after `data.medicalNarrative = narrativeText` is set.

- [x] Replace **line ~901** (Step 4 missing slots):
  - Old: `const content = matchingZone.templateText ? matchingZone.templateText.replace(\`{${slotName}}\`, value) : value;`
  - New: `const content = renderZoneContent(matchingZone.templateText, matchingZone.suggestedFieldName, data);`

- [x] Replace **line ~970** (completion-replay stream in the `GET /generate/stream` already-complete branch):
  - Old: `content = zone.templateText ? zone.templateText.replace(\`{${zone.suggestedFieldName}}\`, value) : value;`
  - New: `content = renderZoneContent(zone.templateText, zone.suggestedFieldName, data);`

- [x] Update the narrative zone lookup to also check `templateText` (belt-and-suspenders):
  ```ts
  const narrativeZone = zones.find((z) =>
    z.suggestedFieldName === 'medicalNarrative' ||
    z.templateText?.includes('{medicalNarrative}'),
  );
  ```

---

### 2. Update the LLM classifier prompt to produce multi-variable templateText  <!-- agent: general-purpose -->

**File:** `app/server/src/lib/zone-classifier.ts`

- [x] In `classifyZones`, update the system prompt string: <!-- Completed: 2026-06-30 -->
  - Change from: `"For variable zones, suggest a field name … set templateText to the exact zone text with only the variable value replaced by {field_name}; for a pure variable zone, set templateText to null."`
  - Change to: `"For variable zones, set templateText to the full zone text with EVERY variable value replaced by the appropriate {field_name} placeholder. A single zone may contain multiple {field_name} placeholders. Set suggestedFieldName to the first (or primary) field name used. For a zone that is a single pure variable with no surrounding text, set templateText to null and suggestedFieldName to the field name."`
  - Keep the `suggestedFieldName` in the JSON response for backward compat but clarify it is the primary/first field.

- [x] In `normalizeClassification`: <!-- Completed: 2026-06-30 -->
  - After accepting `templateText`, extract ALL field names from it using `/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g`.
  - Validate each against `CANONICAL_FIELD_SET` or `isSystemTemplateFieldName`. Strip any unknown field names by replacing `{unknown_field}` with the literal text (revert that portion to plain text).
  - If the cleaned `templateText` has no `{field}` tags remaining AND `suggestedFieldName` is also invalid, fall back to `boilerplate_verbatim`.
  - Derive `suggestedFieldName` as the first extracted canonical field from the cleaned `templateText` (or keep the LLM's `suggestedFieldName` if it is canonical and present in `templateText`).

- [x] In `normalizeTemplateText` (the inner helper): <!-- Completed: 2026-06-30 -->
  - Current check: `if (trimmed?.includes(\`{${fieldName}}\`)) return trimmed;`
  - Keep this check; it still works. The multi-field case is handled upstream in `normalizeClassification`.

---

### 3. Remove `applyDistinctDuplicateSuffixes`  <!-- agent: general-purpose -->

**File:** `app/server/src/lib/zone-classifier.ts`

The suffix-dedup pass renames `{claimant_name}` → `{claimant_name_1}` / `{claimant_name_2}` when the same field appears in adjacent zones. This was a workaround for the one-to-one model. In the new model two zones sharing a field is intentional — both render the same value.

- [x] Delete the `applyDistinctDuplicateSuffixes` function body and its `export`/declaration. <!-- Completed: 2026-06-30 -->
- [x] Delete the `variableValueForDuplicateCheck`, `normalizeDuplicateValue`, and `escapeRegExp` helper functions that exist only to support it.
- [x] In `classifyZones`, remove the `applyDistinctDuplicateSuffixes(zones, ...)` wrapping call — return the mapped classifications directly.
- [x] Remove the `isSuffixedTemplateSlotName`, `baseTemplateSlotName`, `suffixedTemplateSlotName`, `templateSlotFieldCandidates` functions from `app/server/src/lib/template-slot-names.ts` **only if** they have no remaining callers after the above removal. Use `mcp__serena__find_referencing_symbols` to confirm before deleting.

---

### 4. Remove injector deduplication  <!-- agent: general-purpose -->

**File:** `app/server/src/lib/docx-injector.ts::injectDelimiters`

- [x] Remove the `clearSet: Set<number>` and `lastSeenAt: Map<string, number>` variables and all code that populates them (the `for (const zone of sorted)` loop that builds `clearSet`/`confirmedSet`). <!-- Completed: 2026-06-30 -->
- [x] Replace with a simple map build:
  ```ts
  const confirmedSet = new Map<number, { fieldName: string; templateText?: string | null }>();
  for (const zone of confirmedZones) {
    confirmedSet.set(zone.zoneIndex, { fieldName: zone.suggestedFieldName, templateText: zone.templateText });
  }
  ```
- [x] Remove `clearSet` from the `injectPart` and `traverseAndInject` signatures and all call sites.
- [x] In `traverseAndInject`, remove the `if (clearSet.has(idx))` branch that strips all `w:r` children.
- [x] Update the inject filter in `routes/rest.ts` (line ~460) and `handlers/post-jobs-templates-inject.ts` (line ~34):
  - Old filter: `z.confirmed && z.type === ZoneType.variable_populated && z.suggestedFieldName`
  - New filter: `z.confirmed && z.type === ZoneType.variable_populated && (z.templateText || z.suggestedFieldName)`

---

### 5. Lazy migration in the patch zone handler  <!-- agent: general-purpose -->

**File:** `app/server/src/handlers/patch-jobs-template-zones.ts`

When an attorney saves a `variable_populated` zone that arrives with `templateText = null` (old-format zone), auto-promote `templateText` to `{suggestedFieldName}` so the zone is immediately usable by the multi-variable renderer.

- [x] In the `prisma.zone.update` data object, add: <!-- Completed: 2026-06-30 -->
  ```ts
  templateText: z.templateText !== undefined
    ? (z.templateText ?? (
        z.type === 'variable_populated' && z.suggestedFieldName
          ? `{${z.suggestedFieldName}}`
          : null
      ))
    : undefined,
  ```
  This promotes `null → '{field}'` for variable zones and leaves boilerplate zones as `null`.

- [x] Apply the same promotion in `app/server/src/routes/rest.ts` PATCH zones handler (around line ~378) where it calls `prisma.zone.update`.

---

### 6. Update frontend ZoneConfigCard  <!-- agent: general-purpose -->

**File:** `app/frontend/src/components/ZoneConfigCard.tsx`

- [x] Make the `templateText` textarea the **primary** editable field for `variable_populated` zones. Show it prominently (move it above or replace the current secondary position). <!-- Completed: 2026-06-30 -->
- [x] Add a read-only chip/tag display below the textarea listing all `{field_name}` tokens extracted from `templateText` via `/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g`. Label it "Variables detected".
- [x] Keep the field name text input as a quick-insert shortcut: typing/selecting a name and pressing a button inserts `{name}` at the textarea cursor. Update `onChange` so that editing the field name input also updates `templateText` by replacing the first `{old_field}` with `{new_field}` (existing behavior already does the `{}` → `{field}` replacement; keep that).
- [x] Update `onUpdateZone` calls: when a user edits `templateText` directly, derive `suggestedFieldName` as the first `{field}` match and include it in the patch.
- [x] **`app/frontend/src/components/ZonePreviewCard.tsx`** and **`ZoneOutputCard.tsx`**: update the `variableName` prop to show all detected field names joined with ` · ` rather than the single `suggestedFieldName`.

---

### 7. Update tests and evals  <!-- agent: general-purpose -->

**Files:**
- `app/server/src/lib/zone-classifier.test.ts`
- `app/server/src/lib/docx-system-fields.test.ts`
- `evals/golden/gs-002.yaml`, `gs-004.yaml`, `gs-005.yaml`, `gs-006.yaml`, `gs-007.yaml`, `gs-008.yaml`, `gs-009.yaml`, `gs-010.yaml`, `gs-012.yaml`, `gs-015.yaml`

- [x] `zone-classifier.test.ts`: <!-- Completed: 2026-06-30 -->
  - Remove all test cases that assert suffix-dedup output (e.g. `claimant_name_1`, `insurer_address_2`).
  - Add test case: zone with text containing two variable values → `templateText` contains two `{field}` placeholders, `suggestedFieldName` = first field.
  - Update existing multi-zone tests to assert that the same field name in two zones no longer gets renamed.

- [x] `docx-system-fields.test.ts`: <!-- Completed: 2026-06-30 -->
  - The `clearSet` tests (testing that consecutive zones with the same field get cleared) should be removed or updated — consecutive zones now each get their `templateText` injected independently.

- [x] `evals/golden/*.yaml`: <!-- Completed: 2026-06-30 — no suffixed field assertions found; no changes needed -->
  - For eval cases that assert `"suggestedFieldName": "field_name"`, add (or replace with) an assertion on `templateText` containing `{field_name}`.
  - For zone classifier evals that test multi-word text zones, assert the LLM produces a `templateText` with the full template string.

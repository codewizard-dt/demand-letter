---
topic: "Refactor template zones to support multiple variables per zone and the same variable in multiple zones"
slug: multi-variable-zone-refactor
researched: 2026-06-30
sources: [./sources.md]
---

# Research: Multi-Variable Zone Refactor

> The current Zone model is fundamentally one-to-one (one zone → one field name). The real template structure is many-to-many: a single paragraph can contain multiple `{field}` placeholders, and the same field name can appear in many paragraphs. The fix is to elevate `templateText` from "optional override" to "primary source of truth" for every variable zone — the injection machinery already handles multi-variable template strings; the data model, LLM prompt, and generation loop just need to catch up.

---

## Research Questions

1. What is the full extent of `suggestedFieldName` usage across the codebase — what breaks if it is demoted to a derived/cached value?
2. How does the zone classifier currently assign field names, and what does a multi-variable prompt look like?
3. How does the generation stream (`runGenerationJob`) consume zone data, and how must it change?
4. What does the deduplication logic in `injectDelimiters` do, and does it survive a multi-variable world?
5. What migration is needed — DB schema, API contract, frontend, tests?

---

## Current State (Codebase)

### Zone DB model (`app/db/prisma/schema.prisma::Zone`)

```
model Zone {
  suggestedFieldName String?   ← ONE field per zone
  templateText       String?   ← optional mixed-text override (e.g. "Sent Via: {delivery_method}")
  ...
}
```

`Zone.templateText` was added as a workaround for zones that mix boilerplate label text with one variable value (memory: `architecture/mixed-zone-template-text`). It is nullable; when null the zone is treated as a pure `{suggestedFieldName}` placeholder.

### Injection pipeline (`app/server/src/lib/docx-injector.ts::injectDelimiters`)

`injectDelimiters` receives `Array<{ zoneIndex, suggestedFieldName, templateText? }>`. Its inner loop:

1. Sorts zones by index.
2. Builds a `confirmedSet: Map<zoneIndex, { fieldName, templateText }>`.
3. Runs a **clearSet deduplication**: if the same `suggestedFieldName` appeared at a nearby zone index (≤3 paragraphs ago) the later occurrence is cleared (all runs removed) to prevent back-to-back repetition of the same value in the output.
4. Calls `traverseAndInject`, which for each zone in `confirmedSet` replaces all text runs with `createTemplateRuns(templateText ?? \`{fieldName}\`)`.

`createTemplateRuns` **already handles multi-variable strings** [S1]: it tokenises by `/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g` and emits a literal run then a `{field}` tag-run for each match.

### Slot enumeration (`app/server/src/lib/docx-inspect.ts::enumerateSlots`)

Scans all XML files in the DOCX zip for `{field}` patterns and returns a deduplicated list of slot names. This already works correctly for multi-variable templateText — no changes needed [S2].

### Zone classifier (`app/server/src/lib/zone-classifier.ts::classifyZones`)

LLM system prompt instructs: `"For variable zones, suggest a field name from this canonical schema … set templateText to the exact zone text with only the variable value replaced by {field_name}; for a pure variable zone, set templateText to null"`.

The LLM already has the concept of `templateText`, but the prompt only asks for ONE `suggestedFieldName`. A zone like `"On [date] at [location], [name] was injured"` would get `suggestedFieldName: "incident_date"` and `templateText: "On {incident_date} at [location], [name] was injured"` — only the first variable is substituted [S3].

### Generation loop (`app/server/src/routes/rest.ts::runGenerationJob`)

For each `variable_populated` zone in Step 2:

```ts
const value = (data as Record<string, unknown>)[z.suggestedFieldName] as string;
const content = z.templateText
  ? z.templateText.replace(`{${z.suggestedFieldName}}`, value)  // ← only replaces ONE field
  : value;
emit({ type: 'zone', zoneIndex: z.zoneIndex, content });
```

`String.replace` with a string first-argument replaces only the **first occurrence** of the literal substring. In a multi-variable `templateText` any other `{field}` placeholders are emitted verbatim — the generated document shows raw `{incident_location}` text [S4].

### Frontend (`app/frontend/src/components/ZoneConfigCard.tsx`)

`ZoneConfigCard` has a single "field name" text input (`value={suggestedFieldName}`) and a second "template text" monospace input. The field name drives the `{field}` placeholder in the template text via autocomplete (`text.replace(\`{}\`, \`{${suggestedFieldName}}\`)`). There is no affordance for adding a second variable to the same zone [S5].

The narrative zone is found by `z.suggestedFieldName === 'medicalNarrative'` in both `routes/rest.ts` and `GeneratePage.tsx`. This is a load-bearing lookup [S6].

---

## Key Findings

**F1 — `templateText` injection already handles multi-variable strings.** `createTemplateRuns` tokenises any `{field}` pattern correctly. The injection side requires no change other than removing the `suggestedFieldName`-keyed deduplication [S1].

**F2 — `enumerateSlots` already handles multi-variable templateText.** Slot names come from a regex scan of the tagged DOCX XML, not from `suggestedFieldName`. No change needed [S2].

**F3 — The LLM prompt knows about `templateText` but is capped at one field.** The system prompt already mentions the concept; the fix is to extend it to replace ALL variable values in the zone text, not just the "primary" one [S3].

**F4 — Generation `replace` is broken for multi-variable zones.** `String.prototype.replace(string, replacement)` replaces only the first occurrence. A regex with `/g` over all field names in `data` is the correct fix [S4].

**F5 — The clearSet deduplication is a compatibility shim for the one-to-one model.** It was introduced because injecting `{claimant_name}` into two consecutive paragraphs would produce the same value twice. With `templateText` as primary truth, each zone is independently specified — no reason to clear zones that happen to share a field name. The deduplication should be removed or replaced with explicit "shared variable" semantics [S1].

**F6 — `suggestedFieldName` has 7 distinct consumers that must migrate.** The field is read in: `docx-injector.ts`, `routes/rest.ts` (2 sites), `handlers/post-jobs-templates-inject.ts`, `zone-classifier.ts`, `template-classification-job.ts`, `GeneratePage.tsx`, and `ZoneConfigCard.tsx`. A backward-compatible migration is possible: keep `suggestedFieldName` as a **derived/cached** value equal to the first `{field}` name found in `templateText` (or null for boilerplate) [S6].

**F7 — No DB migration is needed.** `Zone.templateText` already exists. The semantic change (from "optional override" to "primary source of truth for variable zones") requires only application-layer changes [S7].

---

## Constraints

- Boilerplate zones must never route through the LLM for content generation — the `type: boilerplate_verbatim` invariant is preserved regardless of this change.
- The narrative zone lookup (`suggestedFieldName === 'medicalNarrative'`) is load-bearing in two files; it must be preserved or replaced with an explicit zone type/flag.
- Existing confirmed zone rows in the DB have `suggestedFieldName` set and `templateText` null for pure-variable zones. Migration must handle these rows gracefully (treat `null templateText` as `{suggestedFieldName}` for backward compat during the cutover).
- The evals in `evals/golden/` test for `suggestedFieldName` in the classifier output — those evals must be updated.

---

## Solution Comparison

| Criteria | Option A: Junction table (`ZoneVariable`) | Option B: `templateText` as primary (recommended) | Option C: Array field on Zone |
|----------|------|------|------|
| **Approach** | New `ZoneVariable(zoneId, fieldName)` table; N rows per zone | Elevate `templateText String?` to required for variable zones; parse field names from pattern | Add `fieldNames String[]` (Postgres array) to Zone |
| **DB migration** | Yes — new table + FK | None | Yes — new column |
| **Injection change** | Reconstruct templateText from field list at inject time | Pass templateText directly (already done) | Reconstruct templateText from field list |
| **LLM prompt** | Ask for list of field names | Ask for full mixed templateText string (small prompt change) | Ask for list of field names |
| **Generation** | Join and reconstruct per zone | Replace all `{field}` matches via regex over `data` | Same as A |
| **UI** | Multi-select field picker | Single editable templateText string | Multi-select field picker |
| **Backward compat** | New table; old suggestedFieldName still works | `null templateText` falls back to `{suggestedFieldName}` during cutover | Additive column |
| **Complexity** | High | Low | Medium |
| **Fit with existing code** | Poor — injector already uses templateText; two parallel systems | Excellent — the injector already does this; only semantics change | Medium |

---

## Recommendation

**Adopt Option B: elevate `templateText` to primary source of truth.**

### Rationale

The injection machinery, slot enumeration, and the LLM prompt concept all already speak `templateText`. No new DB migration is needed. The change is a semantic promotion of an existing field, not a new architectural concept.

### Implementation outline

**Phase 1 — LLM classifier prompt (low risk)**

In `app/server/src/lib/zone-classifier.ts::classifyZones`, update the system prompt to:
- Replace all variable values in a zone with `{field_name}` placeholders (not just the first)
- Example: `"On {incident_date} at {incident_location}, {claimant_name} was injured"` → `templateText` contains all three placeholders
- Derive `suggestedFieldName` as the first `{field}` match in `templateText` (for backward compat)
- Update evals in `evals/golden/` to test for multi-variable `templateText`

**Phase 2 — Generation loop fix (medium risk)**

In `app/server/src/routes/rest.ts::runGenerationJob` Steps 2 and 4:

```ts
// Replace the single-field replace:
z.templateText.replace(`{${z.suggestedFieldName}}`, value)

// With a full regex replace over all fields in data:
z.templateText.replace(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (_, fieldName) => {
  const val = (data as Record<string, unknown>)[fieldName]
    ?? (data as Record<string, unknown>)[dbNameToTagName(fieldName) ?? '']
    ?? '';
  return typeof val === 'string' ? val : String(val);
})
```

This is safe even for zones that currently have `templateText = null` — those continue to emit `value` directly.

**Phase 3 — Injector deduplication (low risk)**

In `app/server/src/lib/docx-injector.ts::injectDelimiters`:
- Remove the `clearSet` / `lastSeenAt` deduplication logic.
- Every confirmed variable zone gets its `templateText` (or `{fieldName}` if null) injected verbatim.
- If the same `{field}` tag appears in multiple zones, it is correct: docxtemplater fills it in each location.

**Phase 4 — UI update (medium risk)**

In `app/frontend/src/components/ZoneConfigCard.tsx`:
- The "template text" input becomes the primary editable field (already exists but is secondary).
- The "field name" input becomes a read-only display of field names detected in `templateText` (comma-separated).
- The field name input can still exist as a quick-fill shortcut that inserts `{field_name}` into `templateText`.

**Phase 5 — Backward compatibility cutover**

In `app/server/src/handlers/patch-jobs-template-zones.ts`, when saving a zone with `templateText = null` and `suggestedFieldName` set, auto-promote: `templateText = \`{${suggestedFieldName}}\``. This ensures old zone rows are migrated lazily on next save.

**Phase 6 — Narrative zone lookup**

Replace `z.suggestedFieldName === 'medicalNarrative'` with a more robust check:
```ts
const narrativeZone = zones.find(z =>
  z.suggestedFieldName === 'medicalNarrative' ||
  z.templateText?.includes('{medicalNarrative}')
);
```
This works during cutover and after.

### Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| LLM hallucinates field names not in the canonical schema | The normalisation in `zone-classifier.ts::normalizeClassification` already validates field names; any unknown field name causes the zone to fall back to `boilerplate_verbatim`. Extend this to validate all field names found in `templateText`. |
| Old confirmed zones in DB have `templateText = null` | Keep the fallback: `templateText ?? \`{${suggestedFieldName}}\`` everywhere the field is consumed. Remove after all rows are migrated. |
| Removing clearSet causes duplicate values in adjacent paragraphs | This was a workaround for a 1:1 model quirk. With proper `templateText`, two adjacent zones that both use `{claimant_name}` is intentional — both should render. |
| Eval suite uses `suggestedFieldName` assertions | Update evals to assert on `templateText` containing the expected `{field_name}` pattern AND `suggestedFieldName` being the first matched field. |

---

## Next Steps

- **To proceed**: `/task-add Refactor Zone model: elevate templateText to primary source of truth for multi-variable zones` — covers all 6 phases above
- **Prerequisite**: Decide whether to keep `suggestedFieldName` permanently as a cached/derived field or deprecate it after cutover. Recommend keeping it for the narrative zone lookup and fast DB queries.
- **Consider**: A one-time migration script that reads each confirmed `variable_populated` zone with `templateText = null` and writes `templateText = {suggestedFieldName}` — eliminates the null-fallback code path immediately.

---
topic: "Refactor template zones to support multiple variables per zone and the same variable in multiple zones"
slug: multi-variable-zone-refactor
researched: 2026-06-30
---

# Primary Sources — Multi-Variable Zone Refactor

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `app/server/src/lib/docx-injector.ts::createTemplateRuns` | 2026-06-30 | Confirmed that the injection function already tokenises multi-variable templateText strings by `{field}` regex; no injection changes needed for the multi-variable case |
| S2 | codebase | `app/server/src/lib/docx-inspect.ts::enumerateSlots` | 2026-06-30 | Confirmed slot enumeration scans DOCX XML for `{field}` patterns — already handles multi-variable templateText; no change needed |
| S3 | codebase | `app/server/src/lib/zone-classifier.ts::classifyZones` | 2026-06-30 | LLM system prompt already defines `templateText` concept but only asks for one `suggestedFieldName`; the fix is a prompt extension to replace ALL variable values |
| S4 | codebase | `app/server/src/routes/rest.ts::runGenerationJob` | 2026-06-30 | Generation uses `String.prototype.replace(string, string)` which replaces only the first occurrence of one field name; multi-variable templateText requires a `/g` regex replace across all fields in `data` |
| S5 | codebase | `app/frontend/src/components/ZoneConfigCard.tsx` | 2026-06-30 | UI has a single "field name" input driving templateText autocomplete; no affordance for multiple variables per zone |
| S6 | codebase | `app/server/src/routes/rest.ts` line 841, `app/frontend/src/pages/GeneratePage.tsx` line 142 | 2026-06-30 | `suggestedFieldName === 'medicalNarrative'` is a load-bearing lookup in two files; must be preserved or replaced with `templateText?.includes('{medicalNarrative}')` check |
| S7 | codebase | `app/db/prisma/schema.prisma::Zone` | 2026-06-30 | `templateText String?` already exists on the Zone model; no DB migration is required — only the semantics change (from optional override to primary source of truth) |

## Excerpts

### S1 — `createTemplateRuns` in `docx-injector.ts`

```typescript
function createTemplateRuns(templateText: string, runProperties?): Record<string, unknown>[] {
  const tagPattern = /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g;
  let cursor = 0;
  for (const match of normalizedTemplateText.matchAll(tagPattern)) {
    // emits a literal run, then a field tag run, for each {field}
    runs.push(createTagRun(normalizedTemplateText.slice(cursor, matchIndex), runProperties));
    runs.push(...createFieldRun(fieldName, runProperties));
    cursor = matchIndex + match[0].length;
  }
  ...
}
```

Handles any number of `{field}` placeholders in a single call.

### S4 — Generation loop in `routes/rest.ts` (lines 828–833)

```typescript
const value = (data as Record<string, unknown>)[z.suggestedFieldName] as string;
const content = z.templateText
  ? z.templateText.replace(`{${z.suggestedFieldName}}`, value)
  : value;
emit({ type: 'zone', zoneIndex: z.zoneIndex, content });
```

`String.replace(string, replacement)` replaces only the first occurrence. If `templateText` is `"On {incident_date} at {incident_location}"` and `suggestedFieldName` is `"incident_date"`, the output is `"On 2024-01-15 at {incident_location}"` — the second field is left as a raw placeholder.

### S6 — Narrative zone lookup (routes/rest.ts line 841)

```typescript
const narrativeZone = zones.find((z) => z.suggestedFieldName === 'medicalNarrative');
```

Same pattern in `GeneratePage.tsx` line 142. This is the only place in generation that routes to the streaming narrative path; it must not be broken by the refactor.

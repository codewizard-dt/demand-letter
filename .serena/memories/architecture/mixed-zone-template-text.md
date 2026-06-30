# Mixed Zones: templateText Field (added 2026-06-30)

## Problem
Some zones contain both boilerplate text and a variable value (e.g., "Sent Via E-Mail Only:collins.elaine@ace.aaa.com"). Classified as `variable_populated`, but the injector was replacing the entire paragraph with `{delivery_method}`, losing the prefix.

## Solution
Added `templateText String?` to the `Zone` DB model (migration: `20260630000000_add_zone_template_text`).

When set, stores the full paragraph template with the variable embedded:
`"Sent Via E-Mail Only:{delivery_method}"`

When null, the zone is a pure variable and `{fieldName}` is used alone (existing behavior unchanged).

## Data flow

- **DOCX injector** (`docx-injector.ts`): `confirmedSet` now maps `zoneIndex → { fieldName, templateText }`. Run text = `templateText ?? \`{fieldName}\``
- **REST PATCH zones**: persists `templateText` from request body
- **Inject endpoint**: passes `templateText` from DB into `injectDelimiters()`
- **Generate stream** (`runGenerationJob` + replay): interpolates `templateText.replace(\`{${fieldName}}\`, value)` when emitting zone content
- **AnnotatePage UI**: second monospace input below field name input; placeholder shows `{field_name} or "Prefix: {field_name}"`. Leave blank for pure variable.
- **Frontend Zone type** (`api.ts`): `templateText?: string | null` added

## Related
- `mem:architecture/template-zone-detection` — overall zone classification strategy

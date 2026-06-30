# Zone Part & Variant Tracking (added 2026-06-29)

## What was added

The `Zone` model now has two explicit columns:
- `part: ZonePart? (header | body | footer)` — which DOCX XML part the zone came from
- `stationaryVariant: String?` — for header/footer zones: 'default' | 'first' | 'even'

## Why

Header and footer zones need to be injected into EVERY page of the generated DOCX (not just body content). Some templates have a distinct first-page header vs a default repeating header. These need to be tracked in the DB so generation can correctly route content to header/footer XML vs body XML.

## Data flow

1. `extractParagraphZones()` in `docx-zone-extractor.ts` extracts zones from header XML, body, footer XML in order
2. `referencedPartPaths()` returns `{ path, variant }[]` — parses `w:type` from `<w:headerReference>` / `<w:footerReference>` elements
3. `extractPartZones()` accepts optional `variant` and stores it in `runPath.source.variant`
4. Both zone creation sites (`routes/rest.ts` and `post-jobs-templates-segment.ts`) map `part` and `stationaryVariant` from `runPath.source` into DB columns
5. Frontend `Zone` type includes `part?: 'header' | 'body' | 'footer'` and `stationaryVariant?: string`

## AnnotatePage UI

Header/footer zones show a badge: "Header (all pages)", "Header (first page)", "Footer (all pages)", etc.

## Related

- `mem:architecture/template-zone-detection` — overall zone classification strategy
- Migration: `app/db/prisma/migrations/20260629010000_add_zone_part_variant/`

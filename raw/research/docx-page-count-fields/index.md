---
topic: "Handle DOCX page count as a special template variable"
slug: docx-page-count-fields
researched: 2026-06-30
sources: [./sources.md]
---

# Research: DOCX Page Count Fields

> Page numbering should be represented as reserved template variables in the app but emitted as native Word fields in the DOCX. The implementation keeps `pageNumber` and `pageCount` inside the existing `variable_populated` zone flow, then converts them to `PAGE` and `NUMPAGES` OOXML field codes during delimiter injection.

## Research Questions

- Should page count be a normal extracted data variable or a special export-time field?
- Where should reserved page variables be converted to Word semantics?
- How should template slot enumeration avoid requiring page fields as case data?
- Can this fit the current zone model without a database migration?

## Current State (Codebase)

The template pipeline stores zones as either `boilerplate_verbatim` or `variable_populated`, with `suggestedFieldName` and optional `templateText` on `Zone`. This makes a new persisted zone type unnecessary for pagination fields [S1].

`injectDelimiters` is the boundary where confirmed variable zones are converted into DOCX markup. It already walks headers, body, and footers in document order, making it the correct point to special-case header page-number zones [S2].

`enumerateSlots` scans `{tag}` placeholders in XML and feeds template slots. Reserved page tags must be excluded there because `pageNumber` and `pageCount` are calculated by Word, not populated from extracted fields [S3].

## Key Findings

- Word page values are field codes, not static text. `PAGE` represents the current page and `NUMPAGES` represents total document pages [S5].
- WordprocessingML field codes are represented with `w:fldChar` and `w:instrText`, optionally with a cached result between `separate` and `end` [S4].
- Docxtemplater is still the right renderer for normal `{tag}` data; it compiles templates and renders placeholders from a data object [S6].
- The safest app model is a small reserved system-field layer: keep UI/API behavior variable-like, but convert reserved names to OOXML fields before Docxtemplater sees them.

## Constraints

- Do not add a `ZoneType` enum value unless the product needs more than pagination fields; the existing schema can represent this.
- Do not add `pageNumber` or `pageCount` to extracted fields or the sufficiency gate.
- Preserve normal placeholders and mixed template text, including strings like `Page {pageNumber} of {pageCount}`.
- The final displayed page count depends on Word layout, so the app should not precompute it.

## Recommendation

Use reserved names `pageNumber` and `pageCount` as system template fields. During template annotation, page text like `Page 2 of 9` should normalize to mixed template text `Page {pageNumber} of {pageCount}`. During DOCX injection, normal tags remain `{fieldName}`, while the reserved names become `PAGE` and `NUMPAGES` Word fields. Slot enumeration should skip the reserved names.

## Next Steps

Use the `wiki-ingest` skill on `raw/research/docx-page-count-fields/index.md` to synthesize this research into the knowledge base.

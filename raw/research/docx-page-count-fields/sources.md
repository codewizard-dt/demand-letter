---
topic: "Handle DOCX page count as a special template variable"
slug: docx-page-count-fields
researched: 2026-06-30
---

# Primary Sources — DOCX Page Count Fields

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `app/db/prisma/schema.prisma::Zone/ZoneType` | 2026-06-30 | Zone persistence supports `boilerplate_verbatim`, `variable_populated`, `suggestedFieldName`, and `templateText`, enough to model reserved system fields without a migration. |
| S2 | codebase | `app/server/src/lib/docx-injector.ts::injectDelimiters` | 2026-06-30 | Confirmed variable zones are injected into headers, body, and footers in paragraph order. |
| S3 | codebase | `app/server/src/lib/docx-inspect.ts::enumerateSlots` | 2026-06-30 | Template slots are discovered by scanning DOCX XML for `{tag}` placeholders. |
| S4 | web | https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.fieldcode | 2026-06-30 | WordprocessingML complex fields use `w:fldChar` and `w:instrText`. |
| S5 | web | https://www.techrepublic.com/article/use-page-numbering-word/ | 2026-06-30 | `NUMPAGES` displays total document pages; page-numbering fields are Word field codes. |
| S6 | context7 | `/websites/docxtemplater` — "Docxtemplater rendering DOCX templates with {tag} placeholders..." | 2026-06-30 | Docxtemplater compiles templates and renders placeholders from a data object; `linebreaks` and `paragraphLoop` are normal rendering options. |

## Excerpts

### S4 — FieldCode Class

https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.fieldcode

> `<w:fldChar w:fldCharType="begin" />`

> `<w:instrText>FORMCHECKBOX</w:instrText>`

### S5 — Page-numbering fields in Word

https://www.techrepublic.com/article/use-page-numbering-word/

> `{ NumPages } displays the same number`

> `the total number of pages in the document`

### S6 — Docxtemplater rendering

Context7 documentation for `/websites/docxtemplater`

> `compilation checks the template for errors`

> `rendering populates placeholders with data`

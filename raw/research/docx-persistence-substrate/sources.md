---
topic: "persistence substrate for a docx demand-letter template: Word content controls (SDTs) vs delimiter/placeholder tags (docxtemplater/docxtpl). TS/React/Node/AWS stack — library maturity, conditional/repeating handling, round-trip fidelity, authoring UX, round-trip with DEC-0001 pipeline."
slug: docx-persistence-substrate
researched: 2026-06-22
---

# Primary Sources — Docx Persistence Substrate

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | context7 | `/open-xml-templating/docxtemplater` — "conditional sections, loops over table rows, error handling for missing/unclosed tags, nullGetter" | 2026-06-22 | Native loops `{#array}{/array}`, conditionals `{#}`/`{^}`, `nullGetter` for missing values, structured multi-error catch with tag id/xtag |
| S2 | web | https://docxtemplater.com/ | 2026-06-22 | docxtemplater runs in Node.js and browser, tested Node 12–24; OSS core (text, loops, conditions) with optional paid modules; lightweight nodejs dependency |
| S3 | web | https://docx.js.org/ | 2026-06-22 | `docx` (dolanmiu) is a TS/JS library for *generating* docx with zero runtime deps; declarative authoring, not an arbitrary-template fill engine |
| S4 | web | https://github.com/alonrbar/easy-template-x | 2026-06-22 | easy-template-x: `{tags}`+`{#loop}` for non-technical editors; data-binding extension updates custom XML parts inside Word docs |
| S5 | web | https://products.aspose.com/words/nodejs-net/edit/docx/ | 2026-06-22 | Aspose.Words for Node.js via .NET edits docx incl. fields/SDTs — but is a commercial, .NET-bridged dependency |
| S6 | web | https://docxtemplater.com/docs/errors/ + https://docxtemplater.com/faq/ | 2026-06-22 | Error schema (unopened_tag, unclosed_tag, duplicate_open/close, multi_error) prevents corrupt output; InspectModule lists all placeholders before render; nullGetter can keep `{name}` if value missing |
| S7 | web | https://github.com/open-xml-templating/docxtemplater/issues/606 | 2026-06-22 | Real-world split-run/escaping pitfall: `<<`/`>>` and tags can break when not cleanly placed in the XML; hand-edited templates are the fragile case |
| S8 | web | https://learn.microsoft.com/en-us/office/dev/add-ins/word/create-better-add-ins-for-word-with-office-open-xml | 2026-06-22 | SDTs are native OOXML objects; inserting via OOXML preserves exact formatting (carried from prior template-zone-detection research) |

## Excerpts

### S1 — docxtemplater loops, conditions, nullGetter (Context7)
`/open-xml-templating/docxtemplater`
> "Use {#condition}...{/condition} for truthy and {^condition}...{/condition} for falsy values to conditionally show or hide content."
> "Use {#array}...{/array} syntax to repeat template sections for each item in an array."
> "The `nullGetter` option allows customization of how undefined or null values are handled during the rendering process." Multi-error catch exposes `e.properties.errors` with `id`, `xtag`, `explanation`.

### S2 — docxtemplater home
https://docxtemplater.com/
> "Docxtemplater is a JavaScript library that generates Word (.docx), PowerPoint (.pptx), Excel (.xlsx) and OpenDocument (.odt) documents from templates filled with structured data such as JSON. Core features include text replacement, loops, and conditions ... It runs in Node.js and in the browser."
> "Docxtemplater is tested with all active Node.js versions 12 through 24, and in all common browsers."

### S3 — docx.js
https://docx.js.org/
> "docx is a TypeScript/JavaScript library for generating Word documents (.docx files) programmatically ... Works in Node.js, browsers, and serverless environments · No Dependencies."

### S4 — easy-template-x
https://github.com/alonrbar/easy-template-x
> "it keeps the template syntax as simple as possible, limiting the required knowledge to {tags} and {#loop tags}{/loop tags} alone."
> "Data Binding Extension - The easy-template-x-data-binding extension supports updating custom XML parts inside Word documents."

### S5 — Aspose.Words for Node.js via .NET
https://products.aspose.com/words/nodejs-net/edit/docx/
> "We host our Node.js via .Net packages in NPM repositories." "Modify existing DOCX elements: tables, lists, charts, images, links, fields, etc." (commercial, .NET-bridged)

### S6 — docxtemplater error handling + FAQ (InspectModule)
https://docxtemplater.com/docs/errors/ , https://docxtemplater.com/faq/
> "Error : unopened_tag ... Error : unclosed_tag ... Error : multi_error" — "This error prevents the docx document to become corrupt."
> "To be able to construct a form dynamically or to validate the document beforehand, it can be useful to get access to all placeholders defined in a given template. Before rendering a document, Docxtemplater parses the Word document into a compiled form." (InspectModule)
> "It is possible to customize the value that will be shown for {name} by using the nullGetter option ... it will keep the placeholder {name} if the value does not exist."

### S7 — docxtemplater issue #606 (split-run/escaping pitfall)
https://github.com/open-xml-templating/docxtemplater/issues/606
> "The rendering of << and >> works perfectly fine if you run Docxtemplater directly on the template -- because the original Word xml has all of them escaped." (i.e. hand-edited/preprocessed templates are where tag corruption arises)

### S8 — Microsoft Learn, OOXML/SDTs
https://learn.microsoft.com/en-us/office/dev/add-ins/word/create-better-add-ins-for-word-with-office-open-xml
> "Office Open XML is the native file format for Word documents (.docx), which means you can insert virtually any content type with the exact formatting users can apply manually."

---
id: docxtemplater
title: docxtemplater
aliases: [docxtpl, docx templating]
updated: 2026-06-22
sources:
  - ../../../raw/research/template-zone-detection/index.md
  - ../../../raw/research/docx-persistence-substrate/index.md
tags: [tool, docx, ooxml, templating, javascript]
---

# docxtemplater

relates_to::[[../../concepts/docx-zone-detection-pipeline.md]] | relates_to::[[../../concepts/template-driven-generation.md]] | derived_from::[[../../sources/template-zone-detection.md]]

## What It Is

**docxtemplater** is an open-source JavaScript library that generates `.docx` (and `.pptx`/`.xlsx`) documents by replacing **delimiter-tagged placeholders** in a template with provided data. It loads the template via PizZip (the OOXML zip) and substitutes tags **inside the OOXML**, so all surrounding formatting, styles, and layout are preserved exactly — only the tag text changes. Default delimiters are `{` and `}`, configurable (e.g. `<<…>>`, ERB-style) to avoid collisions with template prose. It supports loops (`{#array}…{/array}`) and conditionals.

The Python equivalent is **docxtpl** (Jinja2 syntax, `{{ field }}` and `{%p if %}…{%p endif %}`), which is used in production legal-document systems including **Docassemble** and **Suffolk LIT Lab's Document Assembly Line**.

## Capabilities Relevant to the Fill Engine

| Capability | Detail |
|------------|--------|
| **Loops** | `{#specials}{provider} {amount}{/specials}` repeats rows — used for the itemised specials table |
| **Conditionals** | `{#hasLiens}…{/hasLiens}` (truthy) and `{^hasLiens}…{/hasLiens}` (falsy) — used for optional §7 clauses |
| **`InspectModule`** | Enumerates **every placeholder in a template before rendering** — doubles as the slot-list for the input-contract sufficiency gate |
| **`nullGetter`** | Customises missing-value handling — can fail closed or keep `{name}`/render `[Missing: x]` instead of silently emptying |
| **Structured error schema** | `unopened_tag`, `unclosed_tag`, `duplicate_open_tag`, `multi_error`, … thrown **before** output, preventing a corrupt `.docx` |
| **Platform** | Runs in Node.js (tested v12–24) and the browser; React/Angular/Vue/Next.js integration guides |

The OSS core covers text, loops, and conditions; advanced features (HTML/image insertion) sit behind paid modules.

## Relevance to This Project

docxtemplater is the **chosen persistence substrate** for the [[../../concepts/docx-zone-detection-pipeline.md|zone-detection pipeline]] — accepted as implements::[[../../work/decisions/archive/DEC-0002-docx-persistence-substrate.md|DEC-0002#D1]] (the choice DEC-0001 deferred). Once a template's variable zones are confirmed, the annotation UI inserts **clean single-run delimiter tags** onto them (boilerplate untouched); `InspectModule` enumerates the slots into the sufficiency gate; `render(data)` fills deterministically with `nullGetter` failing closed; boilerplate stays byte-exact because it is never inside a tag. It was chosen over Word content controls/SDTs, whose programmatic fill in Node needs Aspose (commercial, .NET-bridged) or hand-rolled OOXML. derived_from::[[../../sources/docx-persistence-substrate.md]]

Two practical caveats: **tightly-formatted documents must be tested with both short and long substituted values** (content length can disrupt layout); and the classic **split-run/"unopened tag" corruption** arises only when tags are hand-typed in Word — avoided here because the annotation UI writes tags programmatically.

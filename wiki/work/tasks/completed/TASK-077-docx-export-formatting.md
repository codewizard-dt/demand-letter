---
id: TASK-077
title: "DOCX export preserves bold, italic, table structure, and paragraph styles from original template"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-076]
blocks: [TASK-079]
parallel_safe_with: [TASK-078]
uat: "[[UAT-077]]"
tags: [docx, word-export, formatting, tables, styles, backend]
---

# TASK-077 — DOCX Export Formatting Fidelity

## Objective

Ensure the exported `.docx` file from TASK-076 faithfully preserves the visual formatting of the demand letter: bold and italic text runs, the specials table (provider rows with amounts), and named paragraph styles (Heading 1, Normal, Boilerplate) that match the original DOCX template. This task audits and extends the `prosemirror-to-docx.ts` converter.

## Approach

Read the original DOCX template to understand the named styles in use. Extend the ProseMirror→DOCX converter to emit `docx` `ParagraphStyle` references matching the template's named styles, and to correctly handle the specials table (TipTap table nodes → `docx` Table with correct column widths and shading).

## Steps

### 1. Audit current formatting output  <!-- agent: general-purpose -->

- [x] Read `packages/api/src/lib/prosemirror-to-docx.ts` (created in TASK-076) <!-- Completed: 2026-06-25 -->
- [x] Confirm bold and italic marks are mapped to `TextRun` options `bold: true` / `italics: true` <!-- Completed: 2026-06-25 -->
- [x] Confirm table nodes produce `Table` → `TableRow` → `TableCell` structure with at least 2 columns <!-- Completed: 2026-06-25 -->
- [x] Identify any formatting gaps (e.g. missing heading styles, missing cell shading) <!-- Completed: 2026-06-25 — gaps: no table width/borders, no cell shading, no tableHeader support, no paragraph styles -->

### 2. Add named paragraph styles  <!-- agent: general-purpose -->

- [x] In `prosemirror-to-docx.ts`, for each `paragraph` node, check for a `textStyle` or `heading` mark/attribute and map to named docx styles: <!-- Completed: 2026-06-25 -->
  - Heading level 1 → `{ style: 'Heading1' }` on the `Paragraph`
  - Heading level 2 → `{ style: 'Heading2' }`
  - Normal paragraph → `{ style: 'Normal' }`
  - Boilerplate zone paragraph → add `{ shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' } }` to the `Paragraph`

### 3. Preserve specials table structure  <!-- agent: general-purpose -->

- [x] For `table` nodes in the ProseMirror doc, generate a `docx.Table` with: <!-- Completed: 2026-06-25 -->
  - `width: { size: 100, type: WidthType.PERCENTAGE }`
  - Column widths proportional to original template (inspect `packages/api/src/lib/template.docx` or the existing template rendering logic for column counts)
  - Header row: `TableRow` with `tableHeader: true`, bold `TextRun`s
  - Body rows: standard `TableRow`
  - Cell borders matching the template (thin black border)

### 4. Smoke-test formatting  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0 <!-- Completed: 2026-06-25 -->
- [x] `pnpm --filter @demand-letter/api build` exits 0 (artifact emitted) <!-- Completed: 2026-06-25 -->

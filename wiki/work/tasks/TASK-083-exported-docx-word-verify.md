---
id: TASK-083
title: "Verify exported DOCX opens in Microsoft Word with correct formatting and no corruption"
status: todo
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-076, TASK-078]
blocks: []
parallel_safe_with: []
uat: ""
tags: [docx, word-export, verification, microsoft-word, formatting]
---

# TASK-083 — Exported DOCX Opens in Word Without Corruption

## Objective

Final verification that the DOCX file exported via `GET /jobs/:id/export/docx` opens in Microsoft Word without repair prompts, corruption warnings, or layout issues. Confirms the `docx` package output is valid OOXML and that the document structure (sections, headers, paragraphs, tables) renders correctly in Word.

## Approach

Static validation checks the OOXML archive structure using `unzip`. Manual validation opens the file in Word and inspects visually. This is the acceptance gate for the Word export feature.

## Steps

### 1. Static: OOXML archive validation  <!-- agent: general-purpose -->

- [ ] Download the exported DOCX from `GET /jobs/:id/export/docx` (use the Pat Donahue job or any completed job)
- [ ] Verify it is a valid ZIP archive: `unzip -t /tmp/demand-letter.docx` exits 0
- [ ] Verify required OOXML parts are present:
  ```bash
  unzip -l /tmp/demand-letter.docx | grep -E "word/document.xml|word/styles.xml|\[Content_Types\].xml|_rels/.rels"
  ```
  Expect all four paths to be present

### 2. Static: XML well-formedness  <!-- agent: general-purpose -->

- [ ] Extract `word/document.xml` and validate it is well-formed XML:
  ```bash
  unzip -p /tmp/demand-letter.docx word/document.xml | xmllint --noout - && echo "Valid XML"
  ```
  Expect exit 0 and "Valid XML" output

### 3. Manual: open in Microsoft Word  <!-- agent: general-purpose -->

- [ ] Open `/tmp/demand-letter.docx` in Microsoft Word 2019+ or Microsoft 365
- [ ] Confirm: no "repair" or "corrupted file" dialog appears on open
- [ ] Confirm: document renders with readable text (not garbled characters)
- [ ] Confirm: paragraph spacing and indentation match the original template
- [ ] Confirm: specials table rows and columns are intact and aligned
- [ ] Confirm: bold and italic text is rendered with correct weight/style
- [ ] Confirm: boilerplate §7 section appears with grey shading (or is clearly distinct from variable zones)

### 4. Typecheck  <!-- agent: general-purpose -->

- [ ] `pnpm --filter @demand-letter/api typecheck` exits 0
- [ ] `pnpm --filter @demand-letter/web typecheck` exits 0

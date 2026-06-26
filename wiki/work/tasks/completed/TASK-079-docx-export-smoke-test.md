---
id: TASK-079
title: "Smoke test: export Pat Donahue letter to Word, verify structure matches original template"
status: in-progress
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-076, TASK-077, TASK-078]
blocks: []
parallel_safe_with: []
uat: "[[UAT-079]]"
tags: [docx, word-export, smoke-test, verification, pat-donahue]
---

# TASK-079 — DOCX Export Smoke Test: Pat Donahue Letter

## Objective

End-to-end smoke test of the Word export pipeline: open the Pat Donahue job in the collaborative editor, click "Export to Word", download the `.docx`, open it in Microsoft Word, and verify the structure matches the original demand letter template (headings, specials table, boilerplate §7 section, paragraph styles).

## Approach

This is a primarily manual verification task. The automated portion verifies the API response shape and that the binary is a valid OOXML archive. The human portion verifies visual fidelity in Microsoft Word.

## Steps

### 1. Automated: verify export endpoint returns valid DOCX binary  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Using `curl` with a valid auth token against the local SAM or deployed endpoint:
  ```bash
  curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_BASE/jobs/$PAT_DONAHUE_JOB_ID/export/docx" \
    -o /tmp/demand-letter-export.docx
  ```
- [DEFERRED-TO-UAT] Verify the response is a valid ZIP (OOXML) archive:
  ```bash
  unzip -l /tmp/demand-letter-export.docx | grep word/document.xml
  ```
  Expect `word/document.xml` to be present in the listing
<!-- Updated: 2026-06-25 -->

### 2. Automated: verify document.xml contains expected content  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Extract and grep the document XML:
  ```bash
  unzip -p /tmp/demand-letter-export.docx word/document.xml | grep -i "Donahue"
  ```
  Expect at least one match for the patient name

- [DEFERRED-TO-UAT] Verify the specials table is present:
  ```bash
  unzip -p /tmp/demand-letter-export.docx word/document.xml | grep -c "<w:tbl>"
  ```
  Expect count ≥ 1
<!-- Updated: 2026-06-25 -->

### 3. Manual: open in Microsoft Word and verify visual fidelity  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Open `/tmp/demand-letter-export.docx` in Microsoft Word (or LibreOffice Writer)
- [DEFERRED-TO-UAT] Verify: document title / heading matches the original template format
- [DEFERRED-TO-UAT] Verify: specials table has correct column headers and provider rows
- [DEFERRED-TO-UAT] Verify: boilerplate §7 section appears with grey shading
- [DEFERRED-TO-UAT] Verify: no corruption warnings or "repair mode" dialog on open
- [DEFERRED-TO-UAT] Verify: bold and italic text preserved in narrative sections
<!-- Updated: 2026-06-25 -->

### 4. Typecheck and build  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0 <!-- Completed: 2026-06-25 -->
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 -->

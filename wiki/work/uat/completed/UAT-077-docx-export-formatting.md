---
id: UAT-077
title: "UAT: DOCX export preserves bold, italic, table structure, and paragraph styles from original template"
status: pending
task: TASK-077
created: 2026-06-25
updated: 2026-06-25
---

# UAT-077 — UAT: DOCX Export Formatting Fidelity

implements::[[TASK-077]]

> **Source task**: [[TASK-077]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] API server running locally: `sam local start-api` (default port 3000)
- [ ] A job exists in the database. Export its ID: `export UAT_JOB_ID=<job-id>`
- [ ] `jq` installed for JSON responses; `unzip` available for DOCX XML inspection

---

## Test Cases

### UAT-API-001: Heading level-1 node maps to Heading1 paragraph style in exported DOCX

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that a ProseMirror `heading` node with `attrs.level: 1` is converted to a `docx` Paragraph with `style: "Heading1"` and the API returns HTTP 200 with a valid DOCX binary. The style name is visible in `word/document.xml` inside the ZIP archive.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set to an existing job ID.
  2. Run the curl command below to download the DOCX to `/tmp/uat-077-h1.docx`.
  3. Confirm the curl exits with status code `200`.
  4. Inspect the DOCX XML: `unzip -p /tmp/uat-077-h1.docx word/document.xml | grep -c 'Heading1'` — the count must be ≥ 1.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Introduction"}]}]}}' -o /tmp/uat-077-h1.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. File `/tmp/uat-077-h1.docx` is non-empty. Running `unzip -p /tmp/uat-077-h1.docx word/document.xml | grep -c 'Heading1'` prints `1` or higher.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-002: Heading level-2 node maps to Heading2 paragraph style in exported DOCX

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that a ProseMirror `heading` node with `attrs.level: 2` is converted to `style: "Heading2"` and the API returns HTTP 200.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to download the DOCX to `/tmp/uat-077-h2.docx`.
  3. Confirm output is `200`.
  4. Inspect: `unzip -p /tmp/uat-077-h2.docx word/document.xml | grep -c 'Heading2'` — must be ≥ 1.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Background"}]}]}}' -o /tmp/uat-077-h2.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. Running `unzip -p /tmp/uat-077-h2.docx word/document.xml | grep -c 'Heading2'` prints `1` or higher.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-003: Normal paragraph node carries `style: "Normal"` in exported DOCX

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that every `paragraph` node in the ProseMirror doc is emitted as a `docx` Paragraph with `style: "Normal"`. This is distinct from the empty default style and is required for template fidelity.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to download the DOCX to `/tmp/uat-077-normal.docx`.
  3. Confirm output is `200`.
  4. Inspect: `unzip -p /tmp/uat-077-normal.docx word/document.xml | grep -c 'Normal'` — must be ≥ 1.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a standard paragraph."}]}]}}' -o /tmp/uat-077-normal.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. Running `unzip -p /tmp/uat-077-normal.docx word/document.xml | grep -c 'Normal'` prints `1` or higher.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-004: Paragraph with `boilerplateZone` attribute receives paragraph-level shading (fill F3F4F6)

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies the paragraph-level shading path: when a `paragraph` node carries `attrs.boilerplateZone: true`, the converter adds `<w:shd w:fill="F3F4F6"/>` in the paragraph's `<w:pPr>` block. This is distinct from the text-run–level `D9D9D9` shading applied by the `boilerplateZone` *mark* (tested in UAT-076).
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to download to `/tmp/uat-077-bz-para.docx`.
  3. Confirm output is `200`.
  4. Inspect: `unzip -p /tmp/uat-077-bz-para.docx word/document.xml | grep -c 'F3F4F6'` — must be ≥ 1.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"paragraph","attrs":{"boilerplateZone":true},"content":[{"type":"text","text":"Standard boilerplate clause."}]}]}}' -o /tmp/uat-077-bz-para.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. Running `unzip -p /tmp/uat-077-bz-para.docx word/document.xml | grep -c 'F3F4F6'` prints `1` or higher.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-API-005: Table with `tableHeader` cell type produces a header row (`tblHeader`) in exported DOCX

- **Endpoint**: `POST /jobs/{id}/export/docx`
- **Description**: Verifies that a `tableRow` whose cells are typed `tableHeader` (rather than `tableCell`) is marked with `tableHeader: true` in the `docx` TableRow, which results in `<w:tblHeader/>` in the serialised XML. This is the provider-amount specials table header row requirement from TASK-077.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to download to `/tmp/uat-077-tbl-hdr.docx`.
  3. Confirm output is `200`.
  4. Inspect: `unzip -p /tmp/uat-077-tbl-hdr.docx word/document.xml | grep -c 'tblHeader'` — must be ≥ 1.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Provider"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Amount"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Dr Smith"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"$1,200.00"}]}]}]}]}]}}' -o /tmp/uat-077-tbl-hdr.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. Running `unzip -p /tmp/uat-077-tbl-hdr.docx word/document.xml | grep -c 'tblHeader'` prints `1` or higher.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: 2-column table distributes column widths as floor(9638 / 2) = 4819 twips each

- **Scenario**: The column-width algorithm in `tableNodeToDocx` distributes 9638 twips (standard letter page minus margins) evenly across all columns. For a 2-column table this must yield 4819 twips per column, encoded as `<w:gridCol w:w="4819"/>` in the DOCX XML.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to download to `/tmp/uat-077-colwidth.docx`.
  3. Confirm status `200`.
  4. Inspect: `unzip -p /tmp/uat-077-colwidth.docx word/document.xml | grep -c '4819'` — must be ≥ 2 (one entry per column).
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Left"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Right"}]}]}]}]}]}}' -o /tmp/uat-077-colwidth.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. Running `unzip -p /tmp/uat-077-colwidth.docx word/document.xml | grep -c '4819'` prints `2` or higher (two `gridCol` entries each with `w:w="4819"`).
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Table cells carry thin black SINGLE borders on all four sides

- **Scenario**: `tableCellNodeToDocx` adds `BorderStyle.SINGLE`, size 4, color `000000` to all four sides of every `TableCell`. The DOCX XML must contain `<w:tcBorders>` blocks with `w:val="single"` and `w:color="000000"`.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set.
  2. Run the curl command below to download to `/tmp/uat-077-borders.docx`.
  3. Confirm status `200`.
  4. Inspect: `unzip -p /tmp/uat-077-borders.docx word/document.xml | grep -c 'tcBorders'` — must be ≥ 1.
  5. Also confirm: `unzip -p /tmp/uat-077-borders.docx word/document.xml | grep -c '000000'` — must be ≥ 1.
- **Command**:
  ```bash
  curl -sS -X POST "http://localhost:3000/jobs/${UAT_JOB_ID}/export/docx" -H 'Content-Type: application/json' -d '{"doc":{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Cell"}]}]}]}]}]}}' -o /tmp/uat-077-borders.docx -w '%{http_code}'
  ```
- **Expected Result**: Output `200`. Running `unzip -p /tmp/uat-077-borders.docx word/document.xml | grep -c 'tcBorders'` prints `1` or higher. Running `unzip -p /tmp/uat-077-borders.docx word/document.xml | grep -c '000000'` prints `1` or higher.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID not set in environment] <!-- 2026-06-25 -->

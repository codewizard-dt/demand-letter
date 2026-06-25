---
id: UAT-025
title: "UAT: Template Ingestion Service — Parse DOCX to OOXML Zone Spans"
status: passed
task: TASK-025
created: 2026-06-24
updated: 2026-06-24
---

# UAT-025 — UAT: Template Ingestion Service — Parse DOCX to OOXML Zone Spans

implements::[[TASK-025]]

> **Source task**: [[TASK-025]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Monorepo dependencies installed: `pnpm install` from repo root
- [ ] API package built: `pnpm --filter @demand-letter/api build` exits 0 (creates `packages/api/dist/`)
- [ ] `packages/api/node_modules/pizzip` present (confirms `pizzip` dependency installed)

---

## Test Cases

> **How these tests work**: Each test constructs a minimal DOCX ZIP buffer in-process using
> `pizzip` (already a project dependency), then calls the compiled `parseDocxToZones` from
> `packages/api/dist/lib/docx-parser.js`. The commands are self-contained Node.js one-liners
> that print `PASS` on success or throw/print `FAIL` with a reason.

---

### UAT-BUILD-001: Build and Typecheck Gate

- **Description**: Verify the api package compiles with zero TypeScript errors and produces `dist/lib/docx-parser.js` and `dist/lib/docx-types.js`.
- **Steps**:
  1. From the monorepo root, run the build command below.
  2. Confirm the command exits 0 and no errors are printed.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api build && pnpm --filter @demand-letter/api typecheck && echo "BUILD_TYPECHECK: PASS"
  ```
- **Expected Result**: Command exits 0, last line is `BUILD_TYPECHECK: PASS`. No TypeScript errors in output.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-001: Happy Path — Single Paragraph with Formatted Runs

- **Description**: Verify that a DOCX buffer containing one paragraph with two runs (one bold+font, one italic+fontSize) returns a correctly shaped `OoxmlZone[]` array with accurate field values per the `OoxmlZone` and `OoxmlRun` interfaces.
- **Steps**:
  1. Ensure `packages/api/dist/lib/docx-parser.js` exists (run UAT-BUILD-001 first).
  2. Run the command below from the monorepo root.
  3. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:pPr><w:pStyle w:val=\"Heading1\"/></w:pPr><w:r><w:rPr><w:b/><w:rFonts w:ascii=\"Times New Roman\"/></w:rPr><w:t>Hello</w:t></w:r><w:r><w:rPr><w:i/><w:sz w:val=\"28\"/></w:rPr><w:t>World</w:t></w:r></w:p></w:body></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  const zones = parseDocxToZones(buf);
  const z = zones[0];
  const r0 = z.runs[0];
  const r1 = z.runs[1];
  const ok =
    zones.length === 1 &&
    z.zoneIndex === 0 &&
    z.paragraphStyle === 'Heading1' &&
    z.textContent === 'HelloWorld' &&
    z.runs.length === 2 &&
    r0.runIndex === 0 && r0.text === 'Hello' && r0.bold === true && r0.italic === false && r0.font === 'Times New Roman' && r0.fontSize === undefined &&
    r1.runIndex === 1 && r1.text === 'World' && r1.bold === false && r1.italic === true && r1.font === undefined && r1.fontSize === 14;
  console.log(ok ? 'PASS' : ('FAIL: ' + JSON.stringify({zones}, null, 2)));
  "
  ```
- **Expected Result**: Prints `PASS`. Zone 0 has `paragraphStyle: 'Heading1'`, `textContent: 'HelloWorld'`, two runs where run 0 is bold with font `Times New Roman` and run 1 is italic with fontSize 14 (28 half-points ÷ 2).
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-002: Multiple Paragraphs Returned in Document Order

- **Description**: Verify that a DOCX with three paragraphs produces three zones with `zoneIndex` 0, 1, 2 in document order and correct `textContent` per paragraph.
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>First</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p><w:p><w:r><w:t>Third</w:t></w:r></w:p></w:body></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  const zones = parseDocxToZones(buf);
  const ok =
    zones.length === 3 &&
    zones[0].zoneIndex === 0 && zones[0].textContent === 'First' &&
    zones[1].zoneIndex === 1 && zones[1].textContent === 'Second' &&
    zones[2].zoneIndex === 2 && zones[2].textContent === 'Third';
  console.log(ok ? 'PASS' : ('FAIL: ' + JSON.stringify(zones.map(z => ({zoneIndex:z.zoneIndex, textContent:z.textContent})))));
  "
  ```
- **Expected Result**: Prints `PASS`. Three zones in order with `textContent` `First`, `Second`, `Third`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-003: Paragraph Without Style Has Undefined paragraphStyle

- **Description**: Verify that a paragraph with no `<w:pStyle>` element returns `paragraphStyle: undefined` (not null, not empty string).
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Plain</w:t></w:r></w:p></w:body></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  const zones = parseDocxToZones(buf);
  const ok = zones.length === 1 && zones[0].paragraphStyle === undefined;
  console.log(ok ? 'PASS' : ('FAIL: paragraphStyle=' + JSON.stringify(zones[0].paragraphStyle)));
  "
  ```
- **Expected Result**: Prints `PASS`. `zones[0].paragraphStyle` is `undefined`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-004: Run Without Formatting Has False Bold/Italic and Undefined Font/FontSize

- **Description**: Verify that a run with no `<w:rPr>` element returns `bold: false`, `italic: false`, `font: undefined`, `fontSize: undefined`. This tests the type contract for plain runs.
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Raw</w:t></w:r></w:p></w:body></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  const zones = parseDocxToZones(buf);
  const r = zones[0].runs[0];
  const ok = r.text === 'Raw' && r.bold === false && r.italic === false && r.font === undefined && r.fontSize === undefined;
  console.log(ok ? 'PASS' : ('FAIL: ' + JSON.stringify(r)));
  "
  ```
- **Expected Result**: Prints `PASS`. Run 0 has `bold: false`, `italic: false`, `font: undefined`, `fontSize: undefined`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-005: Paragraph with No Runs Returns Empty Runs Array

- **Description**: Verify that a paragraph containing no `<w:r>` children (e.g. a blank line or spacing paragraph) produces a zone with `runs: []` and `textContent: ''`.
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:pPr><w:pStyle w:val=\"Normal\"/></w:pPr></w:p></w:body></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  const zones = parseDocxToZones(buf);
  const z = zones[0];
  const ok = zones.length === 1 && Array.isArray(z.runs) && z.runs.length === 0 && z.textContent === '';
  console.log(ok ? 'PASS' : ('FAIL: ' + JSON.stringify(z)));
  "
  ```
- **Expected Result**: Prints `PASS`. `zones[0].runs` is `[]`, `zones[0].textContent` is `''`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Missing word/document.xml Throws Correct Error

- **Description**: Verify that passing a ZIP buffer that does not contain `word/document.xml` causes `parseDocxToZones` to throw `Error: word/document.xml not found in DOCX` (not silently return empty or throw a different error).
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const zip = new PizZip();
  zip.file('not-document.xml', '<root/>');
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  try {
    parseDocxToZones(buf);
    console.log('FAIL: no error thrown');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(msg === 'word/document.xml not found in DOCX' ? 'PASS' : ('FAIL: got message: ' + msg));
  }
  "
  ```
- **Expected Result**: Prints `PASS`. Error message is exactly `word/document.xml not found in DOCX`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-002: document.xml Missing w:body Throws Correct Error

- **Description**: Verify that a `word/document.xml` without a `<w:body>` element causes `parseDocxToZones` to throw `Error: No w:body element in document.xml`.
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  try {
    parseDocxToZones(buf);
    console.log('FAIL: no error thrown');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(msg === 'No w:body element in document.xml' ? 'PASS' : ('FAIL: got message: ' + msg));
  }
  "
  ```
- **Expected Result**: Prints `PASS`. Error message is exactly `No w:body element in document.xml`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-006: fontSize Conversion — Half-Points to Points

- **Description**: Verify that `<w:sz w:val="24">` (24 half-points) is converted to `fontSize: 12` (points) per the `OoxmlRun` contract (`<w:sz w:val="N"> / 2`).
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const PizZip = require('./packages/api/node_modules/pizzip');
  const { parseDocxToZones } = require('./packages/api/dist/lib/docx-parser');
  const xml = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:rPr><w:sz w:val=\"24\"/></w:rPr><w:t>Size</w:t></w:r></w:p></w:body></w:document>';
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  const buf = Buffer.from(zip.generate({ type: 'nodebuffer' }));
  const zones = parseDocxToZones(buf);
  const fontSize = zones[0].runs[0].fontSize;
  console.log(fontSize === 12 ? 'PASS' : ('FAIL: fontSize=' + fontSize));
  "
  ```
- **Expected Result**: Prints `PASS`. `zones[0].runs[0].fontSize` equals `12`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCRIPT-007: Lib Barrel Exports parseDocxToZones and Types

- **Description**: Verify that `packages/api/dist/lib/index.js` re-exports `parseDocxToZones` as a function (confirming the barrel wiring from Step 4 of the task).
- **Steps**:
  1. Run the command below from the monorepo root.
  2. Confirm output is `PASS`.
- **Command**:
  ```bash
  node -e "
  const lib = require('./packages/api/dist/lib/index');
  const ok = typeof lib.parseDocxToZones === 'function';
  console.log(ok ? 'PASS' : ('FAIL: parseDocxToZones type=' + typeof lib.parseDocxToZones));
  "
  ```
- **Expected Result**: Prints `PASS`. `lib.parseDocxToZones` is a function.
- [x] Pass <!-- 2026-06-24 -->

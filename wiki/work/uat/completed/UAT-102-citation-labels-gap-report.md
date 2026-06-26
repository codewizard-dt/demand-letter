---
id: UAT-102
title: "UAT: Show meaningful citation labels in Gap Report sidebar"
status: passed
task: TASK-102
created: 2026-06-26
updated: 2026-06-26
---

# UAT-102 — UAT: Show meaningful citation labels in Gap Report sidebar

implements::[[TASK-102]]

> **Source task**: [[TASK-102]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] The full stack is running locally (API + web)
- [ ] At least one job exists that has completed ingestion (blocks stored in DB) and has run extraction (extracted fields with `blockIds` populated)
- [ ] Navigate to the job's gap report at `http://localhost:5173/jobs/{jobId}/gap-report`

---

## Test Cases

### UAT-UI-001: Citation pills show `p.N · TYPE` format
- **Page**: `/jobs/{jobId}/gap-report`
- **Description**: Verifies that the Citation Sources sidebar displays structured location labels (`p.N · TYPE`) instead of raw truncated block UUIDs for fields that have at least one citation block.
- **Steps**:
  1. Open a job's gap report page (`/jobs/{jobId}/gap-report`) where extracted fields have associated `blockIds`.
  2. Locate the **Citation Sources** sidebar on the right side of the page.
  3. Find a field row that has one or more citation pills (small blue buttons beneath the field name).
  4. Read the label on each citation pill.
- **Expected Result**: Each citation pill displays a label in the format `p.N · TYPE` — for example `p.3 · LINE`, `p.1 · WORD`, or `p.2 · PARA`. No pill should show a raw truncated UUID (e.g. `a1b2c3d4…`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Label type abbreviation is exactly 4 uppercase characters (PARA for PARAGRAPH)
- **Page**: `/jobs/{jobId}/gap-report`
- **Description**: Verifies that block types longer than 4 characters are truncated to 4 characters and uppercased. This matters most for `PARAGRAPH` which should appear as `PARA`, not `PARA` (if 4-char) or `PARAGR` (if not truncated).
- **Steps**:
  1. Open a job whose ingested document produces blocks of type `PARAGRAPH` (e.g. a `.docx` uploaded file). The structured parser emits `PARAGRAPH` as the type for docx content.
  2. Navigate to `/jobs/{jobId}/gap-report`.
  3. In the **Citation Sources** sidebar, find a field with a citation pill that references a PARAGRAPH block.
  4. Read the type segment of the pill label (the part after ` · `).
- **Expected Result**: The type segment reads `PARA` (exactly 4 characters, the first 4 of `PARAGRAPH`, uppercased). For `LINE` or `WORD` blocks (both 4 chars), the type segment reads `LINE` or `WORD` respectively.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Clicking a citation pill still scrolls to and highlights the source block
- **Page**: `/jobs/{jobId}/gap-report`
- **Description**: Regression — verifies the click-to-scroll behavior introduced earlier is not broken by the label change.
- **Steps**:
  1. Open the gap report for a job with blocks and citations.
  2. Scroll down to confirm the **Source Document Preview** panel is visible at the bottom.
  3. Click a citation pill in the **Citation Sources** sidebar.
  4. Observe the Source Document Preview panel.
- **Expected Result**: The block corresponding to the clicked citation becomes highlighted (blue border, blue background) and scrolls into view in the Source Document Preview panel. The clicked pill itself also becomes active-styled (dark blue background, white text).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Fields with no citations show em-dash placeholder
- **Page**: `/jobs/{jobId}/gap-report`
- **Description**: Verifies that the "no citations" fallback (`—`) still renders correctly for extracted fields that have an empty `blockIds` array.
- **Steps**:
  1. Open the gap report for a job that has at least one extracted field with `blockIds: []`.
  2. Locate that field row in the **Citation Sources** sidebar.
  3. Observe what appears beneath the field name.
- **Expected Result**: An em-dash (`—`) placeholder appears, not a pill. No broken or empty button elements are rendered.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: Fallback to truncated UUID when block is not found in blocks data
- **Page**: `/jobs/{jobId}/gap-report`
- **Description**: Verifies the fallback label (`xxxxxxxx…` truncated UUID) is shown when a cited block ID is not present in the loaded blocks data. This can happen if a block ID was cited but the block has since been deleted, or if the blocks query returned fewer than the cited block's offset (>500 blocks scenario).
- **Steps**:
  1. Using the API directly, or by temporarily reducing the `limit` parameter, arrange for a block ID that appears in an extracted field's `blockIds` to be absent from the `GET /jobs/{jobId}/blocks` response.
  2. Reload the gap report page.
  3. Observe the citation pill for the affected field.
- **Expected Result**: The pill label shows the first 8 characters of the block UUID followed by `…` (e.g. `a1b2c3d4…`), not an error or blank label.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

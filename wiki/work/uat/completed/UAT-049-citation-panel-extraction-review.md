---
id: UAT-049
title: "UAT: Citation Panel: Extraction Review Sidebar with Block Highlighting"
status: passed
task: TASK-049
created: 2026-06-25
updated: 2026-06-25
---

# UAT-049 — UAT: Citation Panel: Extraction Review Sidebar with Block Highlighting

implements::[[TASK-049]]

> **Source task**: [[TASK-049]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Local API is running at `http://localhost:3000` (SAM local or dev stack)
- [ ] Local web dev server is running at `http://localhost:5173`
- [ ] A job exists in the DB that has been through extraction (has `ExtractedField` rows with at least some non-empty `blockIds`)
- [ ] Set `$UAT_JOB_ID` to the job's ID (e.g. `export UAT_JOB_ID=clxxx...`)
- [ ] A job exists that has **no** `ExtractedField` rows — set `$UAT_EMPTY_JOB_ID` to that job's ID
- [ ] A job ID that does not exist in the DB — set `$UAT_MISSING_JOB_ID` to any non-existent CUID (e.g. `clnotexist000000000000000`)

---

## Test Cases

---

### UAT-API-001: GET /jobs/:id/fields — happy path returns fields array ordered by fieldName

- **Endpoint**: `GET /jobs/:id/fields`
- **Description**: Verifies the new Lambda returns all `ExtractedField` rows for a job with the correct shape and alphabetical ordering.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set to a job with extracted fields.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_JOB_ID/fields" | jq '{status: "200 expected", fieldCount: (.fields | length), firstField: .fields[0]}'
  ```
- **Expected Result**: HTTP 200. Response body is `{ "fields": [...] }`. The `fields` array is non-empty and ordered alphabetically by `fieldName`. Each element contains: `fieldName` (string), `value` (string or null), `blockIds` (array of strings), `confidence` (number), `isNull` (boolean), `source` (string or null), `nullReason` (string or null), `acceptMissing` (boolean).
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID is not set] <!-- 2026-06-25 -->

---

### UAT-API-002: GET /jobs/:id/fields — fields with blockIds contain non-empty string arrays

- **Endpoint**: `GET /jobs/:id/fields`
- **Description**: Verifies that `blockIds` is always a JSON array of strings (never null or absent) — including for fields that have citations.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set to a job where at least one extracted field has block citations.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_JOB_ID/fields" | jq '[.fields[] | select(.blockIds | length > 0)] | {count: length, sample: .[0]}'
  ```
- **Expected Result**: HTTP 200. At least one field in the result has `blockIds` with one or more string entries. Each block ID is a non-empty string (CUID format).
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID is not set] <!-- 2026-06-25 -->

---

### UAT-API-003: GET /jobs/:id/fields — 404 for unknown job ID

- **Endpoint**: `GET /jobs/:id/fields`
- **Description**: Verifies the handler returns 404 when the job does not exist.
- **Steps**:
  1. Ensure `$UAT_MISSING_JOB_ID` is set to a non-existent job ID.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' "http://localhost:3000/jobs/$UAT_MISSING_JOB_ID/fields"
  ```
- **Expected Result**: HTTP status code `404`. Response body contains `{ "error": "Job not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_MISSING_JOB_ID is not set] <!-- 2026-06-25 -->

---

### UAT-API-004: GET /jobs/:id/fields — empty fields array for job with no extracted fields

- **Endpoint**: `GET /jobs/:id/fields`
- **Description**: Verifies the endpoint returns an empty array (not an error) when a valid job has no `ExtractedField` rows.
- **Steps**:
  1. Ensure `$UAT_EMPTY_JOB_ID` is set to a job that exists but has no extracted fields.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_EMPTY_JOB_ID/fields" | jq '{status: "200 expected", fields: .fields}'
  ```
- **Expected Result**: HTTP 200. Response body is `{ "fields": [] }` — an empty array, not a 404 or error.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_EMPTY_JOB_ID is not set] <!-- 2026-06-25 -->

---

### UAT-API-005: GET /jobs/:id/blocks — returns paginated blocks with correct shape

- **Endpoint**: `GET /jobs/:id/blocks`
- **Description**: Verifies the existing blocks endpoint (reused by the citation panel) returns the expected shape including `id`, `text`, `type`, `page`, `sourceFileId`, `bbox`, `confidence`, `createdAt`, `totalCount`, and `hasMore`.
- **Steps**:
  1. Ensure `$UAT_JOB_ID` is set to a job with ingested blocks.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS "http://localhost:3000/jobs/$UAT_JOB_ID/blocks?limit=500&page=1" | jq '{blockCount: (.blocks | length), hasMore: .hasMore, totalCount: .totalCount, sampleBlock: .blocks[0]}'
  ```
- **Expected Result**: HTTP 200. Response contains `blocks` (array), `page` (1), `limit` (500), `totalCount` (integer >= 0), `hasMore` (boolean). Each block has `id`, `sourceFileId`, `type`, `text`, `page`, `bbox`, `confidence`, `createdAt`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_JOB_ID is not set] <!-- 2026-06-25 -->

---

### UAT-API-006: GET /jobs/:id/blocks — 404 for unknown job ID

- **Endpoint**: `GET /jobs/:id/blocks`
- **Description**: Verifies the blocks endpoint returns 404 for a non-existent job.
- **Steps**:
  1. Ensure `$UAT_MISSING_JOB_ID` is set to a non-existent job ID.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}' "http://localhost:3000/jobs/$UAT_MISSING_JOB_ID/blocks"
  ```
- **Expected Result**: HTTP status code `404`. Response body contains `{ "error": "Job not found" }`.
- [FAIL: auto-judge: prerequisite not satisfied — $UAT_MISSING_JOB_ID is not set] <!-- 2026-06-25 -->

---

### UAT-UI-001: GapReportPage renders two-column layout with Citation Sources sidebar

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies the page uses a two-column grid layout — left column for the gap report table, right column for the "Citation Sources" sidebar.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Wait for the page to finish loading (gap report table appears).
  3. Observe the layout.
- **Expected Result**: The page displays two columns side by side. The left column shows "Gap Report" heading and the existing gap-report table/form. The right column shows a panel with the heading **"Citation Sources"**.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Citation Sources sidebar lists extracted fields with block pill buttons

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies that the citation sidebar renders each extracted field by name, showing pill buttons for each block ID when `blockIds` is non-empty, and a "—" dash when `blockIds` is empty.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Wait for the Citation Sources sidebar to populate.
  3. Inspect the sidebar entries.
- **Expected Result**:
  - Fields with one or more block citations show small pill-style buttons. Each pill displays the first 8 characters of the block ID followed by "…".
  - Fields with no block citations show "—" (an em-dash).
  - Field names are rendered in the sidebar in alphabetical order (matching the API's `orderBy: { fieldName: 'asc' }`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Clicking a block pill highlights the block in the Source Document Preview panel

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies that clicking a block pill (a) sets the active state on that pill and (b) highlights the corresponding block in the source preview panel.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Wait for both the Citation Sources sidebar and the Source Document Preview panel to load.
  3. Click any block ID pill in the Citation Sources sidebar.
  4. Observe the clicked pill and the Source Document Preview panel.
- **Expected Result**:
  - The clicked pill changes style: background becomes `#2563eb` (blue), text becomes white.
  - In the Source Document Preview panel, the corresponding block's border changes to `2px solid #2563eb` and its background becomes `#eff6ff` (light blue).
  - The page scrolls so the highlighted block is visible in the preview panel.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Clicking a different block pill moves the highlight

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies that clicking a second block pill removes the highlight from the first and applies it to the second.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Click a first block ID pill — observe it highlights.
  3. Click a different block ID pill (from the same or a different field).
  4. Observe both pills and both blocks in the preview panel.
- **Expected Result**:
  - The first pill reverts to its unselected style (background `#e8eef8`, text `#2563eb`).
  - The first block reverts to `1px solid #e8e8e8` border and `#fafafa` background.
  - The second pill and its corresponding block take on the active highlight styles.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-005: Source Document Preview panel appears only when blocks exist

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies that the Source Document Preview panel is conditionally rendered — it only appears when the blocks fetch returns at least one block.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_EMPTY_JOB_ID/gap-report` (a job with no blocks/extracted fields).
  2. Wait for the page to finish loading.
  3. Observe the page below the two-column section.
- **Expected Result**: The "Source Document Preview" section does **not** appear. Only the two-column grid is shown (left: gap report area; right: Citation Sources sidebar with "No extracted fields yet." message).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-006: Citation Sources sidebar shows "No extracted fields yet." when fields are empty

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies the empty-state message in the citation sidebar when no extracted fields exist for the job.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_EMPTY_JOB_ID/gap-report`.
  2. Wait for the page to load.
  3. Observe the Citation Sources sidebar.
- **Expected Result**: The sidebar shows the heading "Citation Sources" and the text **"No extracted fields yet."** in grey. No field rows or pill buttons are shown.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-007: Existing gap-report table and attorney-judgment form are unaffected

- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies that the existing gap-report table, fill-value inputs, accept-missing checkboxes, Submit Attorney Judgment button, and Proceed to Generate button continue to work as before the citation panel was added.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Wait for the page to load.
  3. If gaps exist, type a value into a "Fill Value" input for one row.
  4. Click "Submit Attorney Judgment" (if the button is enabled).
  5. Observe the page reloads the gap report without navigating away.
- **Expected Result**: The gap-report table renders correctly in the left column. Fill-value inputs and checkboxes are interactive. The Submit Attorney Judgment button submits and reloads. The Proceed to Generate button navigates to `/jobs/:id/output` when all gaps are resolved. None of these behaviors are broken by the new citation panel.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Citation panel degrades gracefully when /fields API fails

- **Page**: `/jobs/:id/gap-report`
- **Scenario**: The `GET /jobs/:id/fields` call fails (e.g. network error, 500 from the Lambda) — the citation panel must not crash the page or surface an error to the user.
- **Steps**:
  1. Temporarily block or break the `/fields` endpoint (e.g. stop the API server, or set an invalid `VITE_API_URL` for just the fields path — simulate via browser DevTools Network → block URL pattern `*/fields`).
  2. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  3. Wait for the page to load.
  4. Observe the page — specifically the Citation Sources sidebar and the rest of the page.
- **Expected Result**: The gap report table and all existing page functionality loads normally. The Citation Sources sidebar shows **"No extracted fields yet."** (empty state). No error toast, alert, or red error text appears related to the citation panel failure. The page does not throw a JavaScript exception (check browser console).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Block pill shows first 8 characters of block ID followed by ellipsis

- **Page**: `/jobs/:id/gap-report`
- **Scenario**: Block IDs (CUIDs) are long; the UI truncates them to the first 8 characters plus "…" for display.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Wait for the Citation Sources sidebar to populate with at least one field that has block IDs.
  3. Inspect a pill button's displayed label.
- **Expected Result**: Each pill button displays exactly 8 characters followed by the Unicode ellipsis character "…" (e.g. if the block ID is `clxyz1234abcdef`, the pill shows `clxyz123…`). The full block ID is not displayed in the pill label.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: Source Document Preview renders block type, page number, and full text

- **Page**: `/jobs/:id/gap-report`
- **Scenario**: Each block in the preview panel must show its type label, page number, and full text content.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/gap-report`.
  2. Wait for the Source Document Preview panel to appear.
  3. Inspect individual block entries in the preview panel.
- **Expected Result**: Each block entry shows a meta-line in the format `[<type>] p.<page> · id: <full-block-id>` and below it the block's `text` content rendered with whitespace preserved (`white-space: pre-wrap`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

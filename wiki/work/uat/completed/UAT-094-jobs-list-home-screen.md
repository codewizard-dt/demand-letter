---
id: UAT-094
title: "UAT: Add jobs list page as home screen"
status: passed
task: TASK-094
created: 2026-06-26
updated: 2026-06-26
---

# UAT-094 — UAT: Add jobs list page as home screen

implements::[[TASK-094]]

> **Source task**: [[TASK-094]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App running: `pnpm --filter web dev` (frontend on `http://localhost:5174`)
- [ ] API running locally via SAM: `sam local start-api` (API on `http://localhost:3000`)
- [ ] At least one job row in the database (for happy-path UI tests); a clean DB is fine for empty-state test
- [ ] User account exists and you can log in

---

## Test Cases

### UAT-API-001: GET /jobs returns 200 with jobs array

- **Endpoint**: `GET /jobs`
- **Description**: Verifies the `GET /jobs` handler responds with 200 and a `jobs` array containing objects with the fields `id`, `status`, and `createdAt`. Ordered newest-first, max 50.
- **Steps**:
  1. Ensure the API is running locally
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs'
  ```
- **Expected Result**: HTTP 200 with body `{ "jobs": [ ... ] }`. Each element must have `id` (string), `status` (string), and `createdAt` (ISO timestamp string). Array is ordered newest-first.
- [FAIL: auto-judge: HTTP 502 expected 200] <!-- 2026-06-26 -->

---

### UAT-API-002: GET /jobs returns empty array when no jobs exist

- **Endpoint**: `GET /jobs`
- **Description**: When the database has no jobs, the endpoint must return 200 with an empty `jobs` array (not 404 or null).
- **Steps**:
  1. Ensure no job rows exist in the database (or use a clean dev DB)
  2. Run the curl command below
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/jobs'
  ```
- **Expected Result**: HTTP 200 with body `{ "jobs": [] }`.
- [FAIL: auto-judge: HTTP 502 expected 200] <!-- 2026-06-26 -->

---

### UAT-UI-001: Home route (/) loads JobsListPage

- **Page**: `http://localhost:5174/`
- **Description**: Verifies that `/` now renders `JobsListPage` (not `UploadPage`). The page must show an `h1` with text "Jobs" and a "New Job" button.
- **Steps**:
  1. Log in to the app
  2. Navigate to `http://localhost:5174/`
  3. Observe the page heading and navigation CTA
- **Expected Result**: Page shows heading **"Jobs"** and a **"New Job"** button/link in the top-right. The upload form should NOT be visible on this page.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Jobs list renders job ID, date, status, and Resume link

- **Page**: `http://localhost:5174/`
- **Description**: When jobs exist, each list item must display the job ID, a formatted creation date, a human-readable status (underscores replaced with spaces), and a "Resume →" link.
- **Steps**:
  1. Ensure at least one job exists in the database
  2. Log in and navigate to `http://localhost:5174/`
  3. Wait for the loading indicator to disappear
  4. Observe the job list items
- **Expected Result**: Each job card shows:
  - The job's UUID/ID as text
  - A human-readable date (e.g. "Jun 26, 2026")
  - The status with underscores replaced by spaces (e.g. `gap_report_ready` → "gap report ready")
  - A **"Resume →"** link
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Empty state renders when no jobs exist

- **Page**: `http://localhost:5174/`
- **Description**: When the API returns an empty jobs array, the page must show the empty state message (not a blank page or error).
- **Steps**:
  1. Ensure no jobs exist in the database (or mock the API to return `{ "jobs": [] }`)
  2. Log in and navigate to `http://localhost:5174/`
  3. Observe the page content after loading completes
- **Expected Result**: Page shows **"No jobs yet."** and a **"Create your first job"** link that points to `/upload`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: "New Job" CTA navigates to /upload

- **Page**: `http://localhost:5174/`
- **Description**: Clicking "New Job" must navigate to `/upload` where the upload form (UploadPage) is rendered.
- **Steps**:
  1. Log in and navigate to `http://localhost:5174/`
  2. Click the **"New Job"** button in the top-right
  3. Observe the resulting page
- **Expected Result**: Browser navigates to `http://localhost:5174/upload` and the upload form is displayed (not the jobs list).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-005: /upload route still works as UploadPage

- **Page**: `http://localhost:5174/upload`
- **Description**: Moving the upload form from `/` to `/upload` must not break it. Navigating directly to `/upload` must render `UploadPage`.
- **Steps**:
  1. Log in and navigate directly to `http://localhost:5174/upload`
  2. Observe the page
- **Expected Result**: The file upload form is displayed (the same UI that was previously at `/`). The jobs list must NOT appear.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: Resume link for gap_report_ready status routes to /gap-report

- **Page**: `http://localhost:5174/`
- **Description**: A job with status `gap_report_ready` must have a "Resume →" link pointing to `/jobs/:id/gap-report`.
- **Steps**:
  1. Ensure a job with `status = 'gap_report_ready'` exists in the database
  2. Log in and navigate to `http://localhost:5174/`
  3. Locate the job card for that job
  4. Inspect or click the "Resume →" link
- **Expected Result**: The "Resume →" link href is `/jobs/<id>/gap-report`. Clicking it navigates to the gap report page for that job.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-002: Resume link for generate_complete status routes to /editor

- **Page**: `http://localhost:5174/`
- **Description**: A job with status `generate_complete` must have a "Resume →" link pointing to `/jobs/:id/editor`.
- **Steps**:
  1. Ensure a job with `status = 'generate_complete'` exists in the database
  2. Log in and navigate to `http://localhost:5174/`
  3. Locate the job card and inspect or click "Resume →"
- **Expected Result**: The "Resume →" link href is `/jobs/<id>/editor`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-003: Resume link for generating status routes to /generate

- **Page**: `http://localhost:5174/`
- **Description**: A job with status `generating` must have a "Resume →" link pointing to `/jobs/:id/generate`.
- **Steps**:
  1. Ensure a job with `status = 'generating'` exists in the database
  2. Log in and navigate to `http://localhost:5174/`
  3. Locate the job card and inspect or click "Resume →"
- **Expected Result**: The "Resume →" link href is `/jobs/<id>/generate`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-004: Resume link for unknown/unrecognised status defaults to /gap-report

- **Page**: `http://localhost:5174/`
- **Description**: A job with an unrecognised status (e.g. `processing`, `pending`) must fall back to `/jobs/:id/gap-report` for the "Resume →" link.
- **Steps**:
  1. Create a job with a non-standard status (e.g. `pending`) directly in the database
  2. Log in and navigate to `http://localhost:5174/`
  3. Locate the job card and inspect the "Resume →" link
- **Expected Result**: The "Resume →" link href is `/jobs/<id>/gap-report` (the default fallback).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

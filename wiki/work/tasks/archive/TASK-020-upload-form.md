---
id: TASK-020
title: "Upload Form — Template DOCX + Case PDFs"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-013, TASK-014, TASK-019]
blocks: []
parallel_safe_with: [TASK-021, TASK-022]
uat: "[[UAT-020]]"
tags: [frontend, upload, form, phase-4]
---

# TASK-020 — Upload Form — Template DOCX + Case PDFs

## Objective

Build the upload page in `packages/web` where a user selects a DOCX template file and one or more PDF case documents, submits them to `POST /jobs` (to create a job) and then `POST /jobs/:id/files` (to upload each file), and is redirected to the generate page on success.

## Approach

Create `packages/web/src/pages/UploadPage.tsx` with a two-step form: file selection UI (one DOCX + one-or-more PDFs), then an upload action that calls the API sequentially. Use `packages/web/src/lib/api.ts` for the API calls. Show upload progress (loading state) and error messages. On success, navigate to `/jobs/:id/generate`.

## Steps

### 1. Extend `packages/web/src/lib/api.ts` with upload helpers  <!-- agent: general-purpose -->

- [x] Add to `api.ts`: <!-- Completed: 2026-06-24 -->
  ```typescript
  const API_BASE = import.meta.env.VITE_API_URL ?? '';

  export async function createJob(): Promise<{ id: string }> {
    const res = await fetch(`${API_BASE}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) throw new Error(`POST /jobs failed: ${res.status}`);
    return res.json();
  }

  export async function uploadFile(jobId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/jobs/${jobId}/files`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`POST /jobs/${jobId}/files failed: ${res.status}`);
  }
  ```

### 2. Create `packages/web/src/pages/UploadPage.tsx`  <!-- agent: general-purpose -->

- [x] Create the page with: <!-- Completed: 2026-06-24 -->
  - A file input accepting `.docx` for the template (required, single file)
  - A file input accepting `.pdf` for case documents (required, multiple files)
  - A "Upload & Continue" submit button
  - Loading state during upload (disable button, show spinner text)
  - Error display (red banner on failure)
  - On success: `navigate('/jobs/${jobId}/generate')` via `react-router-dom`
- [x] Implement submit handler: <!-- Completed: 2026-06-24 -->
  1. Call `createJob()` → get `{ id }`
  2. Upload template file via `uploadFile(id, templateFile)`
  3. Upload each case PDF via `uploadFile(id, pdfFile)` (sequential)
  4. Navigate to `/jobs/${id}/generate`

### 3. Wire the route in `App.tsx`  <!-- agent: general-purpose -->

- [x] Add to `App.tsx`: <!-- Completed: 2026-06-24 -->
  ```tsx
  import UploadPage from './pages/UploadPage';
  ```
  and add the route:
  ```tsx
  <Route path="/" element={<UploadPage />} />
  ```
  (replace the existing `Navigate` redirect from `/` to `/admin/usage`)

### 4. TypeScript check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-24 -->

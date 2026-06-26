---
id: TASK-078
title: "GET /jobs/:id/export/docx — stream generated .docx and trigger browser download"
status: in-progress
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-076]
blocks: [TASK-079, TASK-083]
parallel_safe_with: [TASK-077]
uat: "[[UAT-078]]"
tags: [docx, word-export, api, lambda, download, frontend]
---

# TASK-078 — GET /jobs/:id/export/docx Endpoint and Browser Download

## Objective

Add a `GET /jobs/:id/export/docx` endpoint that fetches the job's current editor state (from Y.js snapshot or the job's stored output), runs it through the DOCX converter (TASK-076), and streams the `.docx` file to the browser. Wire a download button in `EditorPage` that calls this endpoint and triggers the browser file-save dialog.

## Approach

The GET handler fetches the job's stored `output_text` from the database (or reconstructs the ProseMirror JSON from the Y.js S3 snapshot), converts it via `prosemirrorToDocx`, packs it to a buffer, and returns it as a binary response. The frontend `exportDocx` helper (added in TASK-076) is called from an "Export to Word" button in `EditorPage` using `URL.createObjectURL` to trigger the download.

## Steps

### 1. Create GET /jobs/:id/export/docx Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/get-jobs-export-docx.ts`: <!-- Completed: 2026-06-25 -->
  - Look up the `Job` by `id`; 404 if not found; 422 if `outputText` is null (no generated output)
  - Parse `job.outputText` as ProseMirror JSON (the stored output is plain text; if it is not valid JSON, wrap it as a single paragraph node: `{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: outputText }] }] }`)
  - Call `prosemirrorToDocx(doc)` then `Packer.toBuffer(document)`
  - Return buffer with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` and `Content-Disposition: attachment; filename="demand-letter.docx"`
  - Register in `template.yaml` as `GetJobsExportDocxFunction` at path `/jobs/{id}/export/docx` method `GET`

### 2. Add handler to build pipeline  <!-- agent: general-purpose -->

- [x] Add `get-jobs-export-docx` to the esbuild entrypoints in `packages/api/package.json` <!-- Completed: 2026-06-25 -->
- [x] Verify `.build/handlers/get-jobs-export-docx.js` is emitted <!-- Completed: 2026-06-25 -->

### 3. Update exportDocx API helper to support GET  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/lib/api.ts` <!-- Completed: 2026-06-25 -->
- [x] Update or add `downloadExportDocx(id: string): Promise<void>` that: <!-- Completed: 2026-06-25 -->
  - Calls `GET /jobs/:id/export/docx`
  - Creates a `Blob` from the response
  - Uses `URL.createObjectURL` + a temporary `<a>` click to trigger the browser download dialog

### 4. Add "Export to Word" button in EditorPage  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/pages/EditorPage.tsx`: <!-- Completed: 2026-06-25 -->
  - Import `downloadExportDocx` from `../lib/api`
  - Add `[isExporting, setIsExporting]` state
  - Render a button in the editor toolbar area:
    ```tsx
    <button
      onClick={async () => { setIsExporting(true); try { await downloadExportDocx(id!); } finally { setIsExporting(false); } }}
      disabled={isExporting}
      className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
    >
      {isExporting ? 'Exporting…' : 'Export to Word'}
    </button>
    ```

### 5. Typecheck  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0 <!-- Completed: 2026-06-25 -->
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 -->

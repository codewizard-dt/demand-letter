---
id: TASK-076
title: "Editor state → DOCX export using docx npm package; convert ProseMirror JSON to .docx"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: [TASK-077, TASK-078, TASK-079, TASK-083]
parallel_safe_with: [TASK-075, TASK-080, TASK-081]
uat: "[[UAT-076]]"
tags: [docx, word-export, prosemirror, tiptap, backend, lambda]
---

# TASK-076 — Editor State → DOCX Export

## Objective

Implement DOCX export from the TipTap/ProseMirror editor state. The editor's current JSON document is serialized server-side into a `.docx` file using the `docx` npm package, preserving bold, italic, paragraph styles, and the specials table structure from the original template.

## Approach

Add a `POST /jobs/:id/export/docx` Lambda handler that accepts the editor's ProseMirror JSON in the request body, walks the document tree, and builds a `docx` `Document` object (paragraphs, runs, tables). Return the DOCX binary as `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. The `docx` npm package is chosen over ProseMirror's DOCX serializer because it is actively maintained and does not require a ProseMirror plugin ecosystem.

## Steps

### 1. Install docx package in API  <!-- agent: general-purpose -->

- [x] Run from the repo root:
  ```
  pnpm --filter @demand-letter/api add docx
  ```
- [x] Verify `"docx"` appears in `packages/api/package.json` dependencies <!-- Completed: 2026-06-25 -->

### 2. Create ProseMirror JSON → docx converter  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/prosemirror-to-docx.ts`:
  - Accept a ProseMirror `doc` JSON object (type the root node shape)
  - Walk the node tree: map `paragraph` nodes → `Paragraph`, `text` nodes → `TextRun` with bold/italic from marks, `table` nodes → `Table` with `TableRow` and `TableCell`
  - Return a `docx.Document` instance
  - Handle `boilerplateZone` mark: render as a shaded paragraph (matching the grey background visual)
  - Handle `trackInsert` and `trackDelete` marks: strip them (export the clean accepted state) <!-- Completed: 2026-06-25 -->

### 3. Create POST /jobs/:id/export/docx Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-export-docx.ts`:
  - Parse `req.body` as `{ doc: ProseMirrorDoc }`; validate presence
  - Look up the `Job` by `id`; 404 if not found
  - Call `prosemirrorToDocx(doc)` to build the document
  - Call `Packer.toBuffer(document)` to serialize to binary
  - Return the buffer with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` and `Content-Disposition: attachment; filename="demand-letter.docx"`
  - Register in `template.yaml` as `PostJobsExportDocxFunction` at path `/jobs/{id}/export/docx` method `POST` <!-- Completed: 2026-06-25 -->

### 4. Add handler to build pipeline  <!-- agent: general-purpose -->

- [x] Add `post-jobs-export-docx` to the esbuild entrypoints in `packages/api/package.json` (same pattern as other handlers)
- [x] Verify `.build/handlers/post-jobs-export-docx.js` is emitted after `pnpm build` <!-- Completed: 2026-06-25 -->

### 5. Add API client helper  <!-- agent: general-purpose -->

- [x] Add to `packages/web/src/lib/api.ts`:
  ```typescript
  export async function exportDocx(id: string, doc: unknown): Promise<Blob> {
    const res = await apiFetch(`/jobs/${id}/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc }),
    });
    if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
    return res.blob();
  }
  ``` <!-- Completed: 2026-06-25 -->

### 6. Typecheck  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 -->

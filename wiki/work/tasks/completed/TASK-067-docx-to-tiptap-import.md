---
id: TASK-067
title: "DOCX-to-editor import via mammoth.js: convert output DOCX to HTML then load into TipTap"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-066]
blocks: [TASK-068]
parallel_safe_with: []
uat: "[[UAT-067]]"
tags: [tiptap, prosemirror, mammoth, docx, import, frontend]
---

# TASK-067 — DOCX-to-Editor Import via mammoth.js

## Objective

Replace the plain-text seed of the TipTap editor (introduced in TASK-066) with a rich DOCX import: fetch the job's output DOCX from S3 (via a presigned URL from the API), run it through mammoth.js to convert to HTML, then load the resulting HTML into TipTap. This preserves paragraph structure, bold/italic, and table elements from the original generated DOCX.

## Approach

Use `mammoth` (browser-compatible build) to convert the raw DOCX `ArrayBuffer` fetched from the presigned S3 URL into HTML. Pass the HTML string directly to TipTap's `content` option (TipTap parses HTML natively via `@tiptap/pm`). A `GET /jobs/:id/output/download-url` endpoint already exists or can be added to return the presigned S3 URL for the DOCX file; the browser fetches the DOCX binary from S3 directly to avoid Lambda response-size limits.

## Steps

### 1. Add mammoth.js dependency  <!-- agent: general-purpose -->

- [x] Run from the repo root:
  ```
  pnpm --filter @demand-letter/web add mammoth
  ```
- [x] Verify `"mammoth"` appears in `packages/web/package.json` dependencies. <!-- Completed: 2026-06-25 mammoth@^1.12.0 -->

### 2. Add / confirm download-URL API endpoint  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/lib/api.ts` and `packages/api/src/handlers/get-jobs-output.ts` <!-- Completed: 2026-06-25 -->
- [x] If the handler already returns a presigned URL (not a binary blob), document the response shape and continue to Step 3. <!-- GET /jobs/{id}/output returns { url: string } presigned S3 URL, 900s TTL — endpoint already existed -->
- [x] If the handler returns a binary blob or a redirect, add a `GET /jobs/:id/output/url` Lambda handler in `packages/api/src/handlers/get-jobs-output-url.ts` that:
  - Looks up the `Job` by `id` (Prisma); 404 if not found
  - Returns `{ url: <presigned S3 GetObject URL, 15-min expiry> }` as JSON
  - Register it in `template.yaml` as `GetJobsOutputUrlFunction` at path `/jobs/{id}/output/url` method `GET` <!-- NOT NEEDED — existing endpoint used -->
- [x] Add `fetchOutputUrl(id: string): Promise<string>` to `packages/web/src/lib/api.ts` <!-- Completed: 2026-06-25 — calls GET /jobs/{id}/output -->

### 3. Update EditorPage to use DOCX import  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/pages/EditorPage.tsx`: <!-- Completed: 2026-06-25 -->
  - Remove plain-text fetch logic added in TASK-066 <!-- done: removed fetchOutputText, added mammoth flow -->
  - On mount:
    1. Call `fetchOutputUrl(id)` to get the presigned S3 URL
    2. `fetch(presignedUrl)` → `.arrayBuffer()`
    3. `import mammoth from 'mammoth'` — use the browser entry: `mammoth/mammoth.browser.min.js` or the standard `mammoth` package (check if it works in Vite; if not, use a dynamic `import()`)
    4. Call `mammoth.convertToHtml({ arrayBuffer })` → destructure `{ value: html }`
    5. Pass `html` as the `content` option to `useEditor({ extensions: [StarterKit], content: html })`
  - Show a loading state (spinner) while fetching and converting <!-- done: loading state via html === null check -->

### 4. Vite compatibility check for mammoth  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/web build` and confirm no bundling errors for mammoth. <!-- Completed: 2026-06-25 — built cleanly in 1.65s, 553 modules, no mammoth errors -->
- [x] If mammoth's Node.js-only dependencies cause issues in Vite, add to `packages/web/vite.config.ts` (or create if absent): <!-- NOT NEEDED — mammoth bundled cleanly without any Vite config changes -->
  ```typescript
  // packages/web/vite.config.ts
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  export default defineConfig({
    plugins: [react()],
    optimizeDeps: { include: ['mammoth'] },
  })
  ```

### 5. Smoke-test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Run `pnpm --filter @demand-letter/web dev`
- [DEFERRED-TO-UAT] Navigate to `/jobs/:id/editor` for a completed job
- [DEFERRED-TO-UAT] Confirm the editor renders content with paragraph breaks and bold text (not raw HTML tags)
- [x] Confirm `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 — make typecheck passed all 3 packages -->

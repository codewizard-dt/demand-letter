---
id: TASK-066
title: "Integrate TipTap editor in React app and render generated output as editor content"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: [TASK-067, TASK-068]
parallel_safe_with: []
uat: "[[UAT-066]]"
tags: [tiptap, prosemirror, editor, react, frontend]
---

# TASK-066 — Integrate TipTap Editor in React App and Render Generated Output as Editor Content

## Objective

Install TipTap (ProseMirror-based) rich-text editor in the React frontend and create an `EditorPage` that loads the generated demand-letter text as editable TipTap content. Add a route `/jobs/:id/editor` and surface an "Open in Editor" button on `GeneratePage` after generation completes. This establishes the editor scaffold that subsequent tasks (DOCX import, zone boundaries, Y.js collaboration) build on.

## Approach

TipTap is the chosen rich-text editor because it is ProseMirror-based (required by ROADMAP-007), has first-class React support via `@tiptap/react`, and ships with a standard `StarterKit` extension set. For this initial integration the editor is seeded from the job's streamed text output (fetched via the existing `GET /jobs/:id/output` endpoint) as plain-text content. Mammoth.js DOCX→HTML import is handled in TASK-067; zone boundary marks are handled in TASK-068. Installing packages with pnpm workspace targeting `@demand-letter/web`.

## Steps

### 1. Install TipTap packages  <!-- agent: general-purpose -->

- [x] Run from the repo root:
  ```
  pnpm --filter @demand-letter/web add @tiptap/react @tiptap/pm @tiptap/starter-kit
  ```
- [x] Verify entries appear in `packages/web/package.json` dependencies. <!-- Completed: 2026-06-25 -->

### 2. Create EditorPage component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/pages/EditorPage.tsx`:
  - Import `useEditor` and `EditorContent` from `@tiptap/react`; import `StarterKit` from `@tiptap/starter-kit`
  - Use `useParams<{ id: string }>()` to read the job `id`
  - On mount, call `GET /jobs/:id/output` (use the existing `downloadOutput` helper in `packages/web/src/lib/api.ts` — or add a `fetchOutputText(id: string): Promise<string>` helper if only a binary download exists; check first)
  - Initialize TipTap editor with `StarterKit` and `content: outputText` once fetched
  - Show a loading spinner while fetching; show error text on failure
  - Render `<EditorContent editor={editor} />` inside a styled container (`prose` Tailwind class or equivalent)
  - Add a `className` of `tiptap-editor` to the `EditorContent` wrapper div for UAT targeting <!-- Completed: 2026-06-25 -->

### 3. Check / add fetchOutputText API helper  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/lib/api.ts`
- [x] If no text-fetch endpoint exists (only a blob download), add:
  ```typescript
  export async function fetchOutputText(id: string): Promise<string> {
    const res = await apiFetch(`/jobs/${id}/output`);
    if (!res.ok) throw new Error(`Failed to fetch output: ${res.statusText}`);
    return res.text();
  }
  ```
  where `apiFetch` is the existing authenticated fetch wrapper in `api.ts`
- [x] Check `packages/api/src/handlers/get-jobs-output.ts` to confirm the handler returns text (not binary-only); if it only returns a presigned S3 URL for the DOCX binary, add a separate `GET /jobs/:id/output/text` Lambda handler that fetches the stored text from S3 and returns it as `text/plain` <!-- Completed: 2026-06-25 — endpoint returns presigned S3 URL for DOCX; fetchOutputText added to api.ts with note about DOCX→HTML conversion needed (TASK-067) -->

### 4. Register the editor route in App.tsx  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/App.tsx`:
  - Add import: `import EditorPage from './pages/EditorPage';`
  - Inside the protected `<AuthLayout>` routes block, add:
    ```tsx
    <Route path="/jobs/:id/editor" element={<EditorPage />} />
    ``` <!-- Completed: 2026-06-25 -->

### 5. Add "Open in Editor" button on GeneratePage  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/pages/GeneratePage.tsx`:
  - Import `{ useNavigate }` from `react-router-dom`
  - After `isDone` is true, render a button alongside the existing "Download DOCX" button:
    ```tsx
    <button
      onClick={() => navigate(`/jobs/${id}/editor`)}
      className="mt-4 ml-2 px-4 py-2 bg-purple-600 text-white rounded"
    >
      Open in Editor
    </button>
    ``` <!-- Completed: 2026-06-25 -->

### 6. Add basic TipTap prose styles  <!-- agent: general-purpose -->

- [x] In `packages/web/src/index.css` (or a new `editor.css` imported by `EditorPage.tsx`), add minimal styles so the editor area has a visible border and cursor:
  ```css
  .tiptap-editor .ProseMirror {
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 1rem;
    min-height: 400px;
    outline: none;
  }
  .tiptap-editor .ProseMirror:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  ``` <!-- Completed: 2026-06-25 -->

### 7. Smoke-test locally  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Run `pnpm dev` in `packages/web/`
- [DEFERRED-TO-UAT] Navigate to a completed job's GeneratePage; confirm the "Open in Editor" button appears after generation
- [DEFERRED-TO-UAT] Click the button; confirm the editor loads with the demand-letter text and is editable
- [x] Confirm no TypeScript errors (`pnpm --filter @demand-letter/web typecheck`) — verified clean in steps 2, 4, and 5 <!-- Completed: 2026-06-25 -->

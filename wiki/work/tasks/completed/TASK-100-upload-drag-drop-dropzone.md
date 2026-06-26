---
id: TASK-100
title: "Add styled drag-and-drop dropzone to UploadPage with file name preview"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-098, TASK-099, TASK-101, TASK-102, TASK-103, TASK-104, TASK-105, TASK-106]
uat: "[[UAT-100]]"
tags: [ui, frontend, upload, ux]
---

# TASK-100 — Add styled drag-and-drop dropzone to UploadPage with file name preview

## Objective

Replace the bare `<input type="file">` elements on UploadPage with styled drag-and-drop dropzones that show file name previews once a file is chosen.

## Approach

Use the HTML5 `dragover`/`drop` events on a styled `<div>` to intercept drag-and-drop, alongside the existing `<input type="file">` (hidden, triggered on click). Show the chosen file name(s) inside the dropzone. No third-party DnD library — native events are sufficient. UploadPage already has `templateFile` and `caseFiles` state.

## Steps

### 1. Convert template file input to dropzone  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/UploadPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Add `dragOver` state: `const [templateDrag, setTemplateDrag] = useState(false);` <!-- Completed: 2026-06-26 -->
- [x] Replace the template `<div className="mb-5">` block with: <!-- Completed: 2026-06-26 -->
  ```tsx
  <div className="mb-5">
    <label className="block mb-1.5 font-semibold">Template (.docx)</label>
    <div
      className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${templateDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
      onDragOver={(e) => { e.preventDefault(); setTemplateDrag(true); }}
      onDragLeave={() => setTemplateDrag(false)}
      onDrop={(e) => { e.preventDefault(); setTemplateDrag(false); const f = e.dataTransfer.files[0]; if (f) setTemplateFile(f); }}
      onClick={() => document.getElementById('template')?.click()}
    >
      <input id="template" type="file" accept=".docx" required className="hidden" onChange={(e) => setTemplateFile(e.target.files?.[0] ?? null)} />
      {templateFile ? (
        <p className="text-sm text-primary font-medium">{templateFile.name}</p>
      ) : (
        <p className="text-sm text-text-muted">Drag a .docx file here or <span className="text-primary underline">browse</span></p>
      )}
    </div>
  </div>
  ```

### 2. Convert case documents input to dropzone  <!-- agent: general-purpose -->

- [x] Add `const [caseDrag, setCaseDrag] = useState(false);` <!-- Completed: 2026-06-26 -->
- [x] Replace the caseDocs `<div className="mb-6">` block with: <!-- Completed: 2026-06-26 -->
  ```tsx
  <div className="mb-6">
    <label className="block mb-1.5 font-semibold">Case Documents (.pdf)</label>
    <div
      className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${caseDrag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
      onDragOver={(e) => { e.preventDefault(); setCaseDrag(true); }}
      onDragLeave={() => setCaseDrag(false)}
      onDrop={(e) => { e.preventDefault(); setCaseDrag(false); setCaseFiles(Array.from(e.dataTransfer.files)); }}
      onClick={() => document.getElementById('caseDocs')?.click()}
    >
      <input id="caseDocs" type="file" accept=".pdf" multiple required className="hidden" onChange={(e) => setCaseFiles(Array.from(e.target.files ?? []))} />
      {caseFiles.length > 0 ? (
        <ul className="text-sm text-primary font-medium space-y-0.5">
          {caseFiles.map((f) => <li key={f.name}>{f.name}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">Drag .pdf files here or <span className="text-primary underline">browse</span></p>
      )}
    </div>
  </div>
  ```

### 3. Verify TypeScript and remove unused label elements  <!-- agent: general-purpose -->

- [x] Ensure there are no duplicate `<label>` elements <!-- Completed: 2026-06-26 -->
- [x] Confirm `useState` is imported (already is) <!-- Completed: 2026-06-26 -->
- [x] Run typecheck — should pass clean <!-- Completed: 2026-06-26 -->

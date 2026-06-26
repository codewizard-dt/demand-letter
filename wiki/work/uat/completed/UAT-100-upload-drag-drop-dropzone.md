---
id: UAT-100
title: "UAT: Add styled drag-and-drop dropzone to UploadPage with file name preview"
status: pending
task: TASK-100
created: 2026-06-26
updated: 2026-06-26
---

# UAT-100 — UAT: Add styled drag-and-drop dropzone to UploadPage with file name preview

implements::[[TASK-100]]

> **Source task**: [[TASK-100]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running: `cd /Users/davidtaylor/Repositories/gauntlet/demand-letter && pnpm --filter @demand-letter/web dev`
- [ ] App accessible at `http://localhost:5173` (or whichever port Vite binds to)
- [ ] A `.docx` file available locally for upload testing
- [ ] At least two `.pdf` files available locally for multi-file upload testing

---

## Test Cases

### UAT-UI-001: Template dropzone renders with correct placeholder text

- **Page**: `/upload`
- **Description**: Verifies the template dropzone renders with its styled dashed border and the correct placeholder text before any file is selected.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Locate the section labelled **Template (.docx)**
  3. Observe the dropzone area (dashed border box)
- **Expected Result**: The dropzone displays the text "Drag a .docx file here or" followed by a "browse" link (underlined). No filename is shown. The box has a dashed border.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Case documents dropzone renders with correct placeholder text

- **Page**: `/upload`
- **Description**: Verifies the case documents dropzone renders with its styled dashed border and the correct placeholder text before any file is selected.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Locate the section labelled **Case Documents (.pdf)**
  3. Observe the dropzone area (dashed border box)
- **Expected Result**: The dropzone displays the text "Drag .pdf files here or" followed by a "browse" link (underlined). No filenames are shown. The box has a dashed border.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Template file selected via click/browse shows filename

- **Page**: `/upload`
- **Description**: Verifies that clicking the template dropzone opens a file picker and that the chosen `.docx` filename appears inside the dropzone after selection.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Click anywhere inside the **Template (.docx)** dropzone
  3. In the system file picker that opens, select a `.docx` file
  4. Observe the dropzone content
- **Expected Result**: The placeholder text is replaced by the filename of the selected `.docx` file (e.g. `template.docx`), displayed in the primary colour and bold/medium weight. The hidden `<input id="template">` is not visible.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Case documents selected via click/browse show all filenames

- **Page**: `/upload`
- **Description**: Verifies that clicking the case documents dropzone opens a file picker and that all selected `.pdf` filenames appear as a list inside the dropzone after selection.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Click anywhere inside the **Case Documents (.pdf)** dropzone
  3. In the system file picker, select two or more `.pdf` files (using Shift/Cmd+click for multi-select)
  4. Observe the dropzone content
- **Expected Result**: The placeholder text is replaced by a list (`<ul>`) where each selected PDF filename appears as a separate list item (`<li>`). All filenames are shown; none are omitted.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-005: Template dropzone shows visual drag-over state

- **Page**: `/upload`
- **Description**: Verifies that dragging a file over the template dropzone triggers a visible highlighted state (active border/background) and that the highlight disappears when the drag leaves.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Drag a `.docx` file from your file manager and hover it over the **Template (.docx)** dropzone (do not release yet)
  3. Observe the dropzone border and background
  4. Move the cursor out of the dropzone without releasing
  5. Observe the dropzone again
- **Expected Result**:
  - While hovering: the border colour changes to the primary colour and a subtle primary-tinted background (`bg-primary/5`) is applied.
  - After leaving: the border reverts to the default dashed border style (no highlight).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-006: Case documents dropzone shows visual drag-over state

- **Page**: `/upload`
- **Description**: Verifies that dragging a file over the case documents dropzone triggers a visible highlighted state and reverts on drag-leave.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Drag a `.pdf` file from your file manager and hover it over the **Case Documents (.pdf)** dropzone (do not release yet)
  3. Observe the dropzone border and background
  4. Move the cursor out of the dropzone without releasing
  5. Observe the dropzone again
- **Expected Result**:
  - While hovering: border turns primary colour with primary-tinted background.
  - After leaving: reverts to default dashed border, no highlight.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-007: Template file accepted via drop shows filename

- **Page**: `/upload`
- **Description**: Verifies that dropping a `.docx` file onto the template dropzone sets the file and displays its name.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Drag a `.docx` file from your file manager
  3. Drop it onto the **Template (.docx)** dropzone
  4. Observe the dropzone content
- **Expected Result**: The placeholder text is replaced by the dropped file's name (e.g. `template.docx`). The drag-over highlight is cleared immediately on drop.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-008: Case documents accepted via drop shows all filenames

- **Page**: `/upload`
- **Description**: Verifies that dropping one or more `.pdf` files onto the case documents dropzone sets all files and displays each filename.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Select two `.pdf` files in your file manager and drag them together
  3. Drop them onto the **Case Documents (.pdf)** dropzone
  4. Observe the dropzone content
- **Expected Result**: The placeholder text is replaced by a bulleted list of all dropped PDF filenames. The drag-over highlight is cleared immediately on drop.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-009: Hidden file inputs are not visually exposed

- **Page**: `/upload`
- **Description**: Verifies that the raw `<input type="file">` elements are hidden and the styled dropzone is the only visible file-selection UI.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Visually inspect the upload form
  3. Open browser DevTools → Elements and inspect the `<input id="template">` and `<input id="caseDocs">` elements
- **Expected Result**: Neither bare file input is visible on the page. The DevTools shows both inputs have `class="hidden"` (Tailwind hidden). No native browser file-input buttons appear in the UI.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-010: Form submission blocked until both dropzones have files

- **Page**: `/upload`
- **Description**: Verifies that the existing guard (`if (!templateFile || caseFiles.length === 0) return`) still works — the form does not submit when dropzones are empty.
- **Steps**:
  1. Navigate to `http://localhost:5173/upload`
  2. Click **Upload & Continue** without selecting any files
  3. Observe whether a network request is made or the page navigates
- **Expected Result**: Nothing happens — no API call is made and the page does not navigate. Both inputs are `required`, so the browser may also show native validation messages.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

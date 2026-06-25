---
id: UAT-068
title: "UAT: Zone Boundaries in TipTap Editor Schema"
status: passed
task: TASK-068
created: 2026-06-25
updated: 2026-06-25
---

# UAT-068 — UAT: Zone Boundaries in TipTap Editor Schema

implements::[[TASK-068]]

> **Source task**: [[TASK-068]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Dev environment running: `pnpm --filter @demand-letter/web dev` (http://localhost:5173) and API stack available at http://localhost:3000
- [ ] A completed job exists whose DOCX output was generated from a template containing paragraphs with the "Boilerplate" Word paragraph style (so that mammoth's styleMap produces `span.boilerplate-zone` / `p.boilerplate-zone` elements in the converted HTML)
- [ ] Set `UAT_JOB_ID` to the ID of that job: `export UAT_JOB_ID=<uuid>`
- [ ] WebSocket server accessible (Yjs collaboration provider) — editor page requires WS at `VITE_WS_API_URL`

---

## Test Cases

### UAT-UI-001: Boilerplate zone renders with grey background and left border

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verify that paragraphs/spans tagged with the `boilerplate-zone` CSS class are visually distinct with the expected grey background, left border, and `contenteditable="false"` attribute once the DOCX loads.
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
  2. Wait for the loading spinner to disappear and the editor content to render
  3. Inspect the DOM — locate one or more elements with the class `boilerplate-zone` inside the `.tiptap-editor` container
  4. Check the computed CSS for a `.boilerplate-zone` element:
     - `background-color` should be `rgb(243, 244, 246)` (i.e. `#f3f4f6`)
     - `border-left` should be `3px solid rgb(156, 163, 175)` (i.e. `#9ca3af`)
     - `padding-left` should be `0.25rem` (4px)
  5. Confirm the element has the attribute `contenteditable="false"`
- **Expected Result**: At least one `.boilerplate-zone` element is present, carries `contenteditable="false"`, and its computed styles match the values above
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-002: Boilerplate zone rejects edit attempts — text unchanged after typing

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verify that the `readOnlyZonePlugin` blocks any `ReplaceStep` over a `boilerplateZone`-marked range. Typing inside a boilerplate zone must not alter the editor document.
- **Steps**:
  1. Navigate to the editor page and wait for content to load
  2. Note the text content of a boilerplate zone element (copy it to clipboard for comparison)
  3. Click inside the boilerplate zone element
  4. Press `Home` to position the cursor at the start of the line
  5. Type `TESTINPUT` using the keyboard
  6. Observe the text content of the same element after typing
- **Expected Result**: The boilerplate zone element's text is **unchanged** — `TESTINPUT` does not appear anywhere inside it. No characters should have been inserted.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-003: Variable (non-boilerplate) zone remains editable

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verify that paragraphs without the `boilerplateZone` mark (facts, dates, amounts) are freely editable. The `readOnlyZonePlugin` must not block transactions in unmarked ranges.
- **Steps**:
  1. Navigate to the editor page and wait for content to load
  2. Identify a paragraph in the editor that does **not** have the `boilerplate-zone` class (e.g. a paragraph containing a client name, date, or claimed amount)
  3. Click at the end of that paragraph
  4. Type `EDITCHECK`
  5. Observe the paragraph content in the editor
- **Expected Result**: `EDITCHECK` is appended to the paragraph; the editor document updates to include the typed text. The cursor is positioned after `EDITCHECK`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-EDGE-001: CSS cursor and user-select on boilerplate zones signal non-editable intent

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verify the UX cues that communicate "this area is locked" — `cursor: not-allowed` and `user-select: none` — are applied to `.boilerplate-zone` elements per `index.css`.
- **Steps**:
  1. Navigate to the editor page and wait for content to load
  2. Hover the mouse cursor over a `.boilerplate-zone` element
  3. Observe the cursor shape — it should display as `not-allowed` (circle with slash), not the default text-insertion beam
  4. Open DevTools, select a `.boilerplate-zone` element, and check computed styles:
     - `cursor` → `not-allowed`
     - `user-select` → `none`
- **Expected Result**: Cursor changes to `not-allowed` on hover; computed `user-select` is `none` for all `.boilerplate-zone` elements
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-EDGE-002: BoilerplateZone mark survives HTML round-trip (parseHTML ↔ renderHTML)

- **Page**: `http://localhost:5173/jobs/$UAT_JOB_ID/editor`
- **Description**: Verify the mark's `parseHTML` rule (`{ tag: 'span.boilerplate-zone' }`) correctly re-hydrates boilerplate zones from the mammoth-produced HTML so that the `contenteditable="false"` attribute is rendered by `renderHTML` — confirming the full parse→render cycle works end-to-end.
- **Steps**:
  1. Navigate to the editor page and wait for content to load
  2. Open DevTools → Elements panel
  3. Inspect the rendered HTML inside `.tiptap-editor .ProseMirror`
  4. Locate a `<span class="boilerplate-zone" ...>` element
  5. Confirm the attribute `contenteditable="false"` is present on the element (set by `renderHTML`, not just CSS)
  6. Confirm the element is a `<span>` (not a `<p>`) for inline boilerplate runs, or confirm boilerplate paragraphs render as `<p class="boilerplate-zone">` with `contenteditable="false"` on their inline spans
- **Expected Result**: Every boilerplate range in the editor DOM has `contenteditable="false"` set as an attribute — not merely implied by CSS. The mark round-trip (parse HTML → ProseMirror doc → render HTML) is lossless.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

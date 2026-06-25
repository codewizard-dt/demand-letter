---
id: TASK-068
title: "Maintain zone boundaries in TipTap editor schema: boilerplate read-only marks, variable editable nodes"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-066, TASK-067]
blocks: []
parallel_safe_with: []
uat: "[[UAT-068]]"
tags: [tiptap, prosemirror, zones, editor, frontend]
---

# TASK-068 — Zone Boundaries in TipTap Editor Schema

## Objective

Enforce zone boundaries inside the TipTap editor so that boilerplate sections (fixed statutory language, firm boilerplate) are read-only and variable sections (facts, dates, amounts) are editable. Boilerplate zones are implemented as custom ProseMirror marks with `contenteditable=false`; variable zones are standard editable TipTap nodes.

## Approach

Define a custom TipTap `Extension` (`BoilerplateZone`) that adds a ProseMirror mark which renders as a `span` with `contenteditable="false"` and a distinct background colour. The mammoth.js HTML output (from TASK-067) will have styled spans for boilerplate sections; parse those into `BoilerplateZone` marks during HTML import by configuring mammoth's style map. Variable zones remain normal ProseMirror text nodes. A TipTap `NodeView` or CSS rule provides visual distinction.

## Steps

### 1. Define BoilerplateZone mark extension  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/lib/editor/boilerplateZoneMark.ts`: <!-- Completed: 2026-06-25 -->
  ```typescript
  import { Mark } from '@tiptap/core'
  export const BoilerplateZone = Mark.create({
    name: 'boilerplateZone',
    addAttributes() {
      return { class: { default: 'boilerplate-zone' } }
    },
    renderHTML({ HTMLAttributes }) {
      return ['span', { ...HTMLAttributes, contenteditable: 'false' }, 0]
    },
    parseHTML() {
      return [{ tag: 'span.boilerplate-zone' }]
    },
  })
  ```

### 2. Wire the extension into EditorPage  <!-- agent: general-purpose -->

- [x] Edit `packages/web/src/pages/EditorPage.tsx`: <!-- Completed: 2026-06-25 -->
  - Import `BoilerplateZone` from `../lib/editor/boilerplateZoneMark`
  - Add it to the `extensions` array: `useEditor({ extensions: [StarterKit, BoilerplateZone], content: html })`

### 3. Map DOCX boilerplate styles to the mark during mammoth conversion  <!-- agent: general-purpose -->

- [x] In `EditorPage.tsx` update the mammoth call to include a style map: <!-- Completed: 2026-06-25 -->
  ```typescript
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Boilerplate'] => p.boilerplate-zone:fresh",
        "r[style-name='Boilerplate'] => span.boilerplate-zone",
      ],
    }
  )
  ```
- [x] If the DOCX template does not use a named "Boilerplate" style, fall back to identifying boilerplate paragraphs by their zone prefix in the generated text (e.g. paragraphs containing `§7`) and apply the mark via a post-processing step on the TipTap `Transaction`. <!-- Completed: 2026-06-25 -->

### 4. Add read-only enforcement via transaction filter  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/lib/editor/readOnlyZonePlugin.ts` — a ProseMirror plugin that intercepts transactions and rejects any `ReplaceStep` that overlaps a range covered by a `boilerplateZone` mark: <!-- Completed: 2026-06-25 -->
  ```typescript
  import { Plugin } from 'prosemirror-state'
  import { ReplaceStep } from 'prosemirror-transform'
  export const readOnlyZonePlugin = new Plugin({
    filterTransaction(tr, state) {
      if (!tr.docChanged) return true
      for (const step of tr.steps) {
        if (step instanceof ReplaceStep) {
          const { from, to } = step
          let blocked = false
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.marks.some(m => m.type.name === 'boilerplateZone')) blocked = true
          })
          if (blocked) return false
        }
      }
      return true
    },
  })
  ```
- [x] Add the plugin to the editor: add an `addProseMirrorPlugins` hook in `BoilerplateZone` extension, or pass via `editorProps.plugins`. <!-- Completed: 2026-06-25 -->

### 5. Visual styles for boilerplate zones  <!-- agent: general-purpose -->

- [x] In `packages/web/src/index.css`, add: <!-- Completed: 2026-06-25 -->
  ```css
  .boilerplate-zone {
    background-color: #f3f4f6;
    border-left: 3px solid #9ca3af;
    padding-left: 0.25rem;
    cursor: not-allowed;
    user-select: none;
  }
  ```

### 6. Smoke-test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Open a generated job in the editor; confirm boilerplate paragraphs have grey background and cannot be edited
- [DEFERRED-TO-UAT] Confirm variable zones (facts, amounts) remain editable
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 -->

---
id: TASK-084
title: "Verify boilerplate zones (§7 conditions) are not editable in the collaborative TipTap editor"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-068]
blocks: []
parallel_safe_with: []
uat: "[[UAT-084]]"
tags: [tiptap, prosemirror, editor, verification, boilerplate, read-only]
---

# TASK-084 — Verify Boilerplate Zones Are Not Editable in Collaborative TipTap Editor

## Objective

Confirm that the `BoilerplateZone` mark implementation (from TASK-068) correctly renders boilerplate sections with `contenteditable="false"` and that the `readOnlyZonePlugin` rejects any `ReplaceStep` transaction that touches a boilerplate-marked range. This is a pure verification task — no new features are added; the goal is to assert the existing code meets its specification.

## Approach

Inspect the live implementation in `packages/web/src/lib/editor/boilerplateZoneMark.ts` and `packages/web/src/lib/editor/readOnlyZonePlugin.ts` for correctness. Write a vitest unit test that exercises `readOnlyZonePlugin.filterTransaction` against a synthetic ProseMirror state containing a `boilerplateZone`-marked range and asserts that a `ReplaceStep` over that range is rejected. Run the test suite and typecheck to confirm green.

## Steps

### 1. Inspect BoilerplateZone mark for contenteditable=false  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/lib/editor/boilerplateZoneMark.ts` using Serena (`find_symbol` with `name_path_pattern: BoilerplateZone`, `include_body: true`). <!-- Completed: 2026-06-25 -->
  - Confirm `renderHTML` returns `['span', { ...HTMLAttributes, contenteditable: 'false' }, 0]` (string `'false'`, not boolean).
  - Confirm `parseHTML` has a rule matching `span[contenteditable="false"]` or `span.boilerplate-zone`.
  - If `contenteditable` is missing or set to boolean `false`, update the `renderHTML` to use the string `'false'` — the DOM attribute requires a string value; a boolean `false` causes the attribute to be omitted.

### 2. Inspect readOnlyZonePlugin for ReplaceStep rejection  <!-- agent: general-purpose -->

- [x] Read `packages/web/src/lib/editor/readOnlyZonePlugin.ts` using Serena (`find_symbol` with `name_path_pattern: readOnlyZonePlugin`, `include_body: true`). <!-- Completed: 2026-06-25 -->
  - Confirm `filterTransaction` iterates `tr.steps`, finds `ReplaceStep` instances, and calls `state.doc.nodesBetween(from, to, ...)` to detect a `boilerplateZone` mark.
  - Confirm the plugin returns `false` (blocks the transaction) when a boilerplate mark is found within the replaced range.
  - Confirm the plugin returns `true` for transactions with no `docChanged` or no `ReplaceStep`.
  - If any of these conditions are not met, fix the plugin logic in place using `mcp__serena__replace_symbol_body`.

### 3. Write unit test for readOnlyZonePlugin  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/lib/editor/__tests__/readOnlyZonePlugin.test.ts` (create `__tests__/` dir if absent): <!-- Completed: 2026-06-25 -->
  - Import `readOnlyZonePlugin` from `../readOnlyZonePlugin`.
  - Build a minimal ProseMirror `EditorState` using `prosemirror-state` and `prosemirror-schema-basic` (or a schema that includes the `boilerplateZone` mark type).
  - Add a `boilerplateZone` mark to a range `[5, 20]` in a test document.
  - Construct a `Transaction` that performs a `ReplaceStep` at `[10, 15]` (inside the boilerplate range).
  - Assert `readOnlyZonePlugin.spec.filterTransaction(tr, state)` returns `false`.
  - Construct a second `Transaction` that performs a `ReplaceStep` at `[30, 40]` (outside the boilerplate range).
  - Assert `readOnlyZonePlugin.spec.filterTransaction(tr, state)` returns `true`.

### 4. Run tests and typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/web test --run` and confirm all tests pass (including the new test from Step 3). <!-- Completed: 2026-06-25 -->
- [x] Run `pnpm --filter @demand-letter/web typecheck` and confirm exit code 0. <!-- Completed: 2026-06-25 -->
- [ ] If the test for `filterTransaction` fails because the plugin's `spec` property is not accessible, refactor `readOnlyZonePlugin.ts` to export a helper function `filterBoilerplateTransaction(tr, state)` that contains the filter logic, then import and test that function directly, and call it from inside the plugin's `filterTransaction` hook.

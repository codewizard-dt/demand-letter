---
id: UAT-084
title: "UAT: Verify boilerplate zones (§7 conditions) are not editable in the collaborative TipTap editor"
status: passed
task: TASK-084
created: 2026-06-25
updated: 2026-06-25
---

# UAT-084 — UAT: Verify Boilerplate Zones Are Not Editable in Collaborative TipTap Editor

implements::[[TASK-084]]

> **Source task**: [[TASK-084]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Repository dependencies installed: `pnpm install`
- [ ] Working directory is the repo root: `/Users/davidtaylor/Repositories/gauntlet/demand-letter`

---

## Test Cases

### UAT-SCRIPT-001: Unit tests pass — ReplaceStep inside boilerplate range is blocked

- **Scenario**: The `readOnlyZonePlugin` vitest suite executes and both cases pass
- **Description**: Verifies that `readOnlyZonePlugin.spec.filterTransaction` returns `false` when a `ReplaceStep` overlaps a `boilerplateZone`-marked range, and `true` when outside.
- **Steps**:
  1. Run the web package test suite in the terminal
  2. Confirm the `readOnlyZonePlugin` `describe` block reports 2 passing tests with no failures
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web test --run 2>&1 | grep -A 20 'readOnlyZonePlugin'
  ```
- **Expected Result**: Output contains `✓ blocks a ReplaceStep whose range overlaps a boilerplateZone mark` and `✓ allows a ReplaceStep whose range does not overlap any boilerplateZone mark`; exit code 0
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-002: Full test suite exits 0

- **Scenario**: No regressions introduced by the new test file
- **Description**: Runs the entire `@demand-letter/web` test suite and confirms all tests pass.
- **Steps**:
  1. Run the full test suite and observe the summary line
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web test --run
  ```
- **Expected Result**: Final line reports `Tests X passed` (or similar) with no failures and exit code 0
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCRIPT-003: TypeScript typecheck exits 0

- **Scenario**: The new `readOnlyZonePlugin.test.ts` and any edits to `boilerplateZoneMark.ts` / `readOnlyZonePlugin.ts` are type-correct
- **Description**: Runs `tsc` via the workspace typecheck script and confirms no type errors.
- **Steps**:
  1. Run the typecheck script and observe output
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web typecheck
  ```
- **Expected Result**: No type errors printed; process exits with code 0
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: `contenteditable` attribute is the string `'false'`, not boolean

- **Scenario**: `BoilerplateZone.renderHTML` emits `contenteditable="false"` as a DOM string attribute
- **Description**: Confirms the mark's `renderHTML` returns `contenteditable: 'false'` (string) rather than `contenteditable: false` (boolean). A boolean `false` causes the attribute to be omitted from the DOM, making the element editable.
- **Steps**:
  1. Inspect `packages/web/src/lib/editor/boilerplateZoneMark.ts`
  2. Locate the `renderHTML` return value
  3. Confirm it reads `contenteditable: 'false'` (single-quoted string) and not `contenteditable: false`
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web exec grep -n "contenteditable" packages/web/src/lib/editor/boilerplateZoneMark.ts
  ```
- **Expected Result**: Output contains `contenteditable: 'false'` (with quotes around the value)
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-002: `filterTransaction` returns `true` for transactions without `docChanged`

- **Scenario**: Non-document-changing transactions (cursor moves, selection changes) are never blocked
- **Description**: Confirms the early-return guard `if (!tr.docChanged) return true` is present in the plugin, so selection-only transactions are never incorrectly blocked.
- **Steps**:
  1. Inspect `packages/web/src/lib/editor/readOnlyZonePlugin.ts`
  2. Confirm the `filterTransaction` body contains `if (!tr.docChanged) return true` as its first guard
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web exec grep -n "docChanged" packages/web/src/lib/editor/readOnlyZonePlugin.ts
  ```
- **Expected Result**: Output contains a line with `!tr.docChanged` and `return true`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-003: `readOnlyZonePlugin` is registered on the `BoilerplateZone` mark extension

- **Scenario**: The plugin is wired into TipTap via `addProseMirrorPlugins` on the mark extension
- **Description**: Confirms that `boilerplateZoneMark.ts` calls `addProseMirrorPlugins()` and returns `[readOnlyZonePlugin]`, ensuring the plugin runs inside any TipTap editor that uses the mark.
- **Steps**:
  1. Inspect `packages/web/src/lib/editor/boilerplateZoneMark.ts`
  2. Confirm `addProseMirrorPlugins` is present and returns `[readOnlyZonePlugin]`
- **Command**:
  ```bash
  pnpm --filter @demand-letter/web exec grep -n "addProseMirrorPlugins\|readOnlyZonePlugin" packages/web/src/lib/editor/boilerplateZoneMark.ts
  ```
- **Expected Result**: Output shows both `addProseMirrorPlugins` and `readOnlyZonePlugin` referenced in the file
- [x] Pass <!-- 2026-06-25 -->

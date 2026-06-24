---
id: UAT-007
title: "UAT: TypeScript Strict Mode + ESLint + Prettier — Clean Baseline"
status: passed
task: TASK-007
created: 2026-06-23
updated: 2026-06-23
---

# UAT-007 — UAT: TypeScript Strict Mode + ESLint + Prettier — Clean Baseline

implements::[[TASK-007]]

> **Source task**: [[TASK-007]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] Working directory is the project root (`demand-letter/`)
- [ ] `pnpm` is installed and available on `$PATH`
- [ ] `make` is installed and available on `$PATH`
- [ ] No uncommitted changes that could affect typecheck, lint, or formatting results

---

## Test Cases

### UAT-CLI-001: pnpm typecheck passes across all packages

- **Command**: `pnpm typecheck`
- **Description**: Verifies that TypeScript strict mode compiles cleanly across all three packages (`api`, `db`, `web`). The root script runs `pnpm -r typecheck` recursively. No type errors should be emitted.
- **Steps**:
  1. From the project root, run the command below
  2. Observe that the process exits without printing any TypeScript diagnostic errors
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits 0. Output shows typecheck running for all three packages (`@demand-letter/api`, `@demand-letter/db`, `@demand-letter/web`) with no errors reported. No lines containing `error TS` appear in the output.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-CLI-002: pnpm lint passes across all packages

- **Command**: `pnpm lint`
- **Description**: Verifies that ESLint passes cleanly across all three packages. The root script runs `pnpm -r lint` recursively. No lint errors or warnings that are configured as errors should be emitted.
- **Steps**:
  1. From the project root, run the command below
  2. Observe that the process exits without printing any ESLint errors
- **Command**:
  ```bash
  pnpm lint
  ```
- **Expected Result**: Command exits 0. Output shows lint running for all three packages with no errors. No lines containing `error` (ESLint severity 2) appear in the output.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-CLI-003: pnpm format:check passes

- **Command**: `pnpm format:check`
- **Description**: Verifies that all files in the repository are formatted according to the Prettier configuration. The script runs `prettier --check .`. This confirms that `pnpm format` was run to fix all formatting issues before committing.
- **Steps**:
  1. From the project root, run the command below
  2. Observe that Prettier reports no unformatted files
- **Command**:
  ```bash
  pnpm format:check
  ```
- **Expected Result**: Command exits 0. Prettier outputs something like `All matched files use Prettier code style!` and does not list any files as needing reformatting.
- [FAIL: auto-judge: exit code 1 — Prettier reports 3 unformatted files: wiki/work/tasks/README.md, wiki/work/uat/UAT-002-postgresql-schema-bootstrap.md, wiki/work/uat/UAT-007-typescript-eslint-prettier-verify.md] <!-- 2026-06-23 -->

---

### UAT-CLI-004: make ci exits 0 (full CI gate)

- **Command**: `make ci`
- **Description**: Verifies the Makefile `ci` target chains `install → typecheck → lint → format-check` and that the entire sequence exits 0. This is the canonical CI gate that all subsequent PRs must pass.
- **Steps**:
  1. From the project root, run the command below
  2. Observe each Make target execute in sequence: `install`, `typecheck`, `lint`, `format-check`
  3. Confirm no target fails (Make stops and exits non-zero on the first failure)
- **Command**:
  ```bash
  make ci
  ```
- **Expected Result**: Command exits 0. All four Make sub-targets complete successfully:
  - `install`: `pnpm install --frozen-lockfile` exits 0 (no lockfile changes needed)
  - `typecheck`: `pnpm typecheck` exits 0 across all packages
  - `lint`: `pnpm lint` exits 0 across all packages
  - `format-check`: `pnpm format:check` exits 0 (all files already formatted)
- [FAIL: auto-judge: exit code 2 — make ci fails at format-check step; Prettier reports 3 unformatted files (wiki/work/tasks/README.md, wiki/work/uat/UAT-002-postgresql-schema-bootstrap.md, wiki/work/uat/UAT-007-typescript-eslint-prettier-verify.md)] <!-- 2026-06-23 -->

---

### UAT-EDGE-001: make ci fails fast when typecheck is broken

- **Scenario**: If TypeScript errors exist, `make ci` must stop at the `typecheck` step and exit non-zero — it must not proceed to lint or format-check.
- **Steps**:
  1. Introduce a deliberate type error in `packages/api/src/index.ts` (e.g., add `const x: number = "not a number";` on a new line)
  2. Run `make ci`
  3. Observe that `make` stops after `typecheck` with a non-zero exit code
  4. Revert the file to restore the clean state
- **Expected Result**: `make ci` exits non-zero. Only `install` and `typecheck` targets run; `lint` and `format-check` do not execute. Make prints something like `make: *** [typecheck] Error 1`.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

---

### UAT-EDGE-002: pnpm format:check detects unformatted files

- **Scenario**: If a file is not formatted to Prettier's standards, `pnpm format:check` must exit non-zero and list the offending file(s).
- **Steps**:
  1. Open `packages/api/src/index.ts` and add extra spaces or inconsistent indentation on a line (e.g., change `export const handler` to `export  const  handler`)
  2. Run `pnpm format:check`
  3. Observe that Prettier reports the file as failing the style check
  4. Run `pnpm format` to restore correct formatting
  5. Confirm `pnpm format:check` exits 0 again
- **Expected Result**: After introducing the formatting issue, `pnpm format:check` exits non-zero and lists the affected file path in its output. After running `pnpm format`, `pnpm format:check` exits 0 cleanly.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

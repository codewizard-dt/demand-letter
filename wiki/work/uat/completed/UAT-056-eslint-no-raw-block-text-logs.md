---
id: UAT-056
title: "UAT: ESLint rule to flag direct console.log with block text in Lambda handlers"
status: passed
task: TASK-056
created: 2026-06-25
updated: 2026-06-25
---

# UAT-056 — UAT: ESLint rule to flag direct console.log with block text in Lambda handlers

implements::[[TASK-056]]

> **Source task**: [[TASK-056]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Working directory is repo root: `/Users/davidtaylor/Repositories/gauntlet/demand-letter`
- [ ] `pnpm install` has been run (ESLint devDependencies present in `packages/api/node_modules`)
- [ ] `packages/api/.eslintrc.json` exists

---

## Test Cases

### UAT-STATIC-001: ESLint config file exists and is valid JSON

- **Scenario**: `packages/api/.eslintrc.json` is present and parseable
- **Steps**:
  1. From the repo root, run:
     ```bash
     node -e "require('./packages/api/.eslintrc.json'); console.log('valid')"
     ```
- **Expected Result**: Prints `valid` with exit code 0 — file exists and is valid JSON
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: ESLint config contains no-console warn rule

- **Scenario**: The `no-console` rule is set to `warn` (not `error` or `off`) so it flags but does not block CI
- **Steps**:
  1. From the repo root, run:
     ```bash
     node -e "const cfg = require('./packages/api/.eslintrc.json'); const r = cfg.rules['no-console']; console.log(Array.isArray(r) ? r[0] : r)"
     ```
- **Expected Result**: Prints `warn` with exit code 0
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: lint script is present in packages/api/package.json

- **Scenario**: The `lint` script is wired up so `pnpm lint` works in the api package
- **Steps**:
  1. From the repo root, run:
     ```bash
     node -e "const pkg = require('./packages/api/package.json'); console.log(pkg.scripts.lint)"
     ```
- **Expected Result**: Prints a non-empty string starting with `eslint src` with exit code 0
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: pnpm lint runs and exits 0 (warnings do not exceed threshold)

- **Scenario**: Running `pnpm --filter @demand-letter/api lint` completes without error — warnings are present but within the `--max-warnings` budget
- **Steps**:
  1. From the repo root, run:
     ```bash
     pnpm --filter @demand-letter/api lint
     ```
- **Expected Result**: Command exits with code 0. Output may include `warning  Unexpected console statement  no-console` lines for existing `console.*` calls in `packages/api/src/` — this is correct and expected. The command must NOT exit non-zero.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: no-console warnings appear for existing console.* calls

- **Scenario**: ESLint detects and warns on `console.log`, `console.warn`, `console.error` calls already in the codebase
- **Steps**:
  1. From the repo root, run:
     ```bash
     pnpm --filter @demand-letter/api lint 2>&1 | grep "no-console"
     ```
- **Expected Result**: At least one line is printed containing `no-console`, confirming the rule is active and detecting real calls in `packages/api/src/`. Known files with console calls: `post-jobs-generate.ts`, `medical-narrative.ts`, `ai.ts`, `document-type-detector.ts`, `get-jobs-template-slots.ts`, `post-jobs-extract.ts`, `post-jobs-templates-inject.ts`, `sns-textract-completion.ts`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-006: TypeScript typecheck still passes after ESLint addition

- **Scenario**: Adding ESLint devDependencies and config did not break TypeScript compilation
- **Steps**:
  1. From the repo root, run:
     ```bash
     pnpm --filter @demand-letter/api typecheck
     ```
- **Expected Result**: Command exits with code 0 with no TypeScript errors
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: Adding a new console.log in a TypeScript file triggers a lint warning

- **Scenario**: A developer adds `console.log("test")` to a source file — ESLint warns, enforcing the rule for future code
- **Steps**:
  1. Add a temporary `console.log("test");` line to any existing file in `packages/api/src/` (e.g. top of `packages/api/src/lib/index.ts`)
  2. From the repo root, run:
     ```bash
     pnpm --filter @demand-letter/api lint 2>&1 | grep "no-console"
     ```
  3. Revert the temporary change after observing the output
- **Expected Result**: The lint output includes a `no-console` warning for the file you edited. Exit code may be 0 or 1 depending on whether total warnings exceed `--max-warnings`; the presence of the warning line is what matters.
- [x] Pass <!-- 2026-06-25 -->

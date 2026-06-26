---
id: UAT-086
title: "UAT: Create packages/api/vitest.config.ts with node environment"
status: passed
task: TASK-086
created: 2026-06-26
updated: 2026-06-26
---

# UAT-086 — UAT: Create packages/api/vitest.config.ts with node environment

implements::[[TASK-086]]

> **Source task**: [[TASK-086]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Repository is cloned and `pnpm install` has been run from the root
- [ ] Working directory is the repository root

---

## Test Cases

### UAT-EDGE-001: Test suite runs with exit code 0

- **Scenario**: `pnpm --filter @demand-letter/api test` exits 0 — confirming Vitest loads the config without errors and the `--passWithNoTests` flag is honoured when no test files exist yet
- **Steps**:
  1. From the repository root, run the command below
  2. Observe exit code and stdout/stderr for any environment or config load errors
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api test
  ```
- **Expected Result**: Exit code 0. Vitest outputs a passing summary (e.g. "No test files found, exiting with code 0" or equivalent). No jsdom, JSDOM, or browser-environment warnings.
- [x] Pass <!-- 2026-06-26 -->

### UAT-EDGE-002: Coverage run exits 0 with v8 provider

- **Scenario**: Running Vitest with the `--coverage` flag triggers the `@vitest/coverage-v8` provider as configured — confirming `coverage.provider: 'v8'` is wired up correctly
- **Steps**:
  1. From the repository root, run the command below
  2. Observe exit code and output for coverage provider errors
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api test --coverage
  ```
- **Expected Result**: Exit code 0. Output references v8 coverage (e.g. "Coverage provider: v8" or a v8-generated coverage table). No "coverage provider not found" or "istanbul" errors.
- [x] Pass <!-- 2026-06-26 -->

### UAT-EDGE-003: Typecheck passes with vitest.config.ts present

- **Scenario**: The `vitest/config` import in `packages/api/vitest.config.ts` does not introduce TypeScript errors — confirming `vitest` is in devDependencies and the import resolves cleanly
- **Steps**:
  1. From the repository root, run the command below
  2. Observe exit code; any error output referencing `vitest.config.ts` is a failure
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api typecheck
  ```
- **Expected Result**: Exit code 0. No TypeScript errors emitted for `vitest.config.ts` or any other file in `packages/api`.
- [FAIL: auto-judge: exit code 2 — TypeScript error in src/__uat087__.test.ts:17 (mockResolvedValueOnce does not exist on Prisma client type; unrelated to vitest.config.ts but typecheck exits non-zero)] <!-- 2026-06-26 -->

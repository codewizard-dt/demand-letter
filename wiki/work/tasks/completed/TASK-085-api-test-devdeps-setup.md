---
id: TASK-085
title: "Add vitest, aws-sdk-client-mock, and vitest-mock-extended to packages/api devDeps with test scripts"
status: done
created: 2026-06-26
updated: 2026-06-26 <!-- tackle completed -->
depends_on: []
blocks: [TASK-086, TASK-087, TASK-088]
parallel_safe_with: []
uat: "[[UAT-085]]"
tags: [testing, api, vitest, dependencies]
roadmap: "[[ROADMAP-008]]"
---

# TASK-085 — Add Vitest and Mock Libraries to packages/api devDeps

## Objective

Install the four test-runner dependencies (`vitest`, `aws-sdk-client-mock`, `aws-sdk-client-mock-vitest`, `vitest-mock-extended`) into `packages/api` as devDependencies, and add `test` and `test:watch` scripts to `packages/api/package.json`. After this task, `pnpm --filter api test` must exit 0 (even with no test files yet).

## Approach

Edit `packages/api/package.json` to add the four devDeps and two scripts, then run `pnpm install` from the repo root to update `pnpm-lock.yaml`. Confirm by running `pnpm --filter api test` — vitest will report "no test files found" but exit 0, which is a passing baseline.

## Steps

### 1. Add devDependencies to packages/api/package.json  <!-- agent: general-purpose -->

- [x] Read `packages/api/package.json` using the Read tool.
- [x] Add to `devDependencies`:
  - `"vitest": "^2.0.0"` (match the version already in `packages/web/package.json`)
  - `"@vitest/coverage-v8": "^2.0.0"`
  - `"aws-sdk-client-mock": "^4.0.0"`
  - `"aws-sdk-client-mock-vitest": "^4.0.0"`
  - `"vitest-mock-extended": "^2.0.0"`
- [x] Add to `scripts`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- [x] Save with the Edit tool.

### 2. Install dependencies  <!-- agent: general-purpose -->

- [x] Run `pnpm install` from the repo root to resolve and lock the new packages.
- [x] Confirm `pnpm-lock.yaml` has been updated (no error output from install). <!-- Completed: 2026-06-26 54 packages added -->

### 3. Verify test script baseline  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api test`.
- [x] Confirm it exits 0 (vitest may report "no test files found" — that is acceptable at this stage). <!-- Note: added --passWithNoTests flag to script to achieve exit 0 -->
- [x] Run `pnpm --filter @demand-letter/api typecheck` and confirm exit code 0. <!-- Completed: 2026-06-26 -->

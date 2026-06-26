---
id: TASK-086
title: "Create packages/api/vitest.config.ts with node environment"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-085]
blocks: []
parallel_safe_with: [TASK-087, TASK-088]
uat: "[[UAT-086]]"
tags: [testing, api, vitest, config]
roadmap: "[[ROADMAP-008]]"
---

# TASK-086 — Create packages/api/vitest.config.ts

## Objective

Create `packages/api/vitest.config.ts` that configures Vitest with `environment: 'node'`, points the include glob at `src/**/*.test.ts`, and wires up coverage via `@vitest/coverage-v8`. Without this config, Vitest defaults to the jsdom environment which is inappropriate for Lambda handlers.

## Approach

Write `packages/api/vitest.config.ts` using the `defineConfig` helper from vitest. Set `test.environment` to `'node'`, set `test.include` to `['src/**/*.test.ts']`, configure `test.coverage` with `provider: 'v8'` and `include: ['src/**']`. Confirm the config is valid by running `pnpm --filter api test`.

## Steps

### 1. Create vitest.config.ts  <!-- agent: general-purpose -->

- [x] Write `packages/api/vitest.config.ts` with this content: <!-- Completed: 2026-06-26 -->
  ```ts
  import { defineConfig } from 'vitest/config'

  export default defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**'],
        exclude: ['src/**/*.test.ts'],
      },
    },
  })
  ```
- [x] Verify the file was written correctly using the Read tool. <!-- Completed: 2026-06-26 -->

### 2. Confirm Vitest picks up the config  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api test`. <!-- Completed: 2026-06-26 -->
- [x] Confirm Vitest reports `environment: node` in its output (or no environment error). <!-- Completed: 2026-06-26 -->
- [x] Confirm exit code is 0 (no test files yet is acceptable). <!-- Completed: 2026-06-26 -->

### 3. Typecheck  <!-- agent: general-purpose -->

- [x] Run `make typecheck` and confirm exit code 0. <!-- Completed: 2026-06-26 -->
- [x] If `vitest/config` import causes a typecheck error, ensure `vitest` is in `devDependencies` (TASK-085 prerequisite) and that `tsconfig.json` covers `vitest.config.ts` via its `include` or by setting `"composite": false`. <!-- No errors encountered -->

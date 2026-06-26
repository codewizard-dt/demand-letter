---
id: TASK-087
title: "Create Prisma mock helper at packages/api/src/__mocks__/@demand-letter/db.ts"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-085]
blocks: []
parallel_safe_with: [TASK-086, TASK-088]
uat: "[[UAT-087]]"
tags: [testing, api, prisma, mocking]
roadmap: "[[ROADMAP-008]]"
---

# TASK-087 — Create Prisma Deep Mock Helper

## Objective

Create `packages/api/src/__mocks__/@demand-letter/db.ts` so that any handler or lib test can write `vi.mock('@demand-letter/db')` and receive a fully-typed deep mock of `PrismaClient` via `vitest-mock-extended`. This centralises the mock setup in one place and prevents tests from needing to manually mock Prisma.

## Approach

Create the `__mocks__` directory structure under `packages/api/src/`, write the mock file that re-exports a `mockDeep<PrismaClient>()` instance as `prisma`, and adds a `beforeEach` reset. Confirm the file typechecks cleanly.

## Steps

### 1. Inspect the @demand-letter/db export  <!-- agent: general-purpose -->

- [x] Read `packages/db/package.json` to confirm the package name is `@demand-letter/db`. <!-- Completed: 2026-06-26 -->
- [x] Use `mcp__serena__get_symbols_overview` on `packages/db/src/` (or the `main` entry) to confirm the export is `{ prisma: PrismaClient }`. <!-- Completed: 2026-06-26 -->

### 2. Create the mock file  <!-- agent: general-purpose -->

- [x] Create directory `packages/api/src/__mocks__/@demand-letter/` if it does not exist (use Write tool to create the file — the directory will be created implicitly). <!-- Completed: 2026-06-26 -->
- [x] Write `packages/api/src/__mocks__/@demand-letter/db.ts`: <!-- Completed: 2026-06-26 -->
  ```ts
  import { vi } from 'vitest'
  import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
  import type { PrismaClient } from '@demand-letter/db'

  export const prisma = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>

  beforeEach(() => {
    mockReset(prisma)
  })
  ```
- [x] Verify the file was written correctly. <!-- Completed: 2026-06-26 -->

### 3. Typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck`. <!-- Completed: 2026-06-26 -->
- [x] If TypeScript cannot resolve `@demand-letter/db` types in the mock file, check that `packages/api/tsconfig.json` has `paths` or workspace resolution for that package. <!-- Completed: 2026-06-26 — no paths change needed, imported beforeEach explicitly from vitest instead -->
- [x] Confirm exit code 0. <!-- Completed: 2026-06-26 -->

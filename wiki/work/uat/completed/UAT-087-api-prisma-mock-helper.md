---
id: UAT-087
title: "UAT: Create Prisma Deep Mock Helper"
status: pending
task: TASK-087
created: 2026-06-26
updated: 2026-06-26
---

# UAT-087 — UAT: Create Prisma Deep Mock Helper

implements::[[TASK-087]]

> **Source task**: [[TASK-087]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Repository is cloned and `pnpm install` has been run from the root
- [ ] Working directory is the repository root

---

## Test Cases

### UAT-STATIC-001: Mock file is present at the correct path

- **Scenario**: `packages/api/src/__mocks__/@demand-letter/db.ts` exists — confirming the `__mocks__` directory was created in the right location for Vitest's manual-mock resolution
- **Steps**:
  1. From the repository root, run the command below
  2. Observe the output
- **Command**:
  ```bash
  test -f packages/api/src/__mocks__/@demand-letter/db.ts && echo "PASS: file exists" || echo "FAIL: file missing"
  ```
- **Expected Result**: Output is `PASS: file exists`
- [x] Pass <!-- 2026-06-26 -->

### UAT-STATIC-002: File exports `prisma` as `DeepMockProxy<PrismaClient>`

- **Scenario**: The export declaration uses `mockDeep<PrismaClient>()` cast to `DeepMockProxy<PrismaClient>` — this is the exact shape consumers depend on
- **Steps**:
  1. From the repository root, run the command below
  2. Confirm the matched line matches the expected declaration exactly
- **Command**:
  ```bash
  grep "export const prisma = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>" packages/api/src/__mocks__/@demand-letter/db.ts
  ```
- **Expected Result**: One line printed:
  ```
  export const prisma = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>
  ```
- [x] Pass <!-- 2026-06-26 -->

### UAT-STATIC-003: `beforeEach` reset hook is wired with `mockReset`

- **Scenario**: The file registers a `beforeEach` that calls `mockReset(prisma)` — ensuring mock call history and configured return values are cleared between every test that imports this mock
- **Steps**:
  1. From the repository root, run the command below
  2. Confirm the matched line is present
- **Command**:
  ```bash
  grep "mockReset(prisma)" packages/api/src/__mocks__/@demand-letter/db.ts
  ```
- **Expected Result**: One line printed containing `mockReset(prisma)` (inside the `beforeEach` callback)
- [x] Pass <!-- 2026-06-26 -->

### UAT-SCRIPT-001: API package typechecks cleanly with mock file in place

- **Scenario**: The mock file's imports (`vitest-mock-extended`, `@demand-letter/db`) all resolve correctly and no TypeScript errors are introduced
- **Steps**:
  1. From the repository root, run the command below
  2. Observe exit code; any error output referencing the mock file or related imports is a failure
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api typecheck
  ```
- **Expected Result**: Exit code 0. No TypeScript errors emitted for `packages/api/src/__mocks__/@demand-letter/db.ts` or any other file in `packages/api`.
- [x] Pass <!-- 2026-06-26 -->

### UAT-SCRIPT-002: Integration — `vi.mock('@demand-letter/db')` yields a `DeepMockProxy` with Vitest mock functions

- **Scenario**: A consumer test that calls `vi.mock('@demand-letter/db')` and imports `{ prisma }` receives mock functions on every Prisma delegate (verifying Vitest resolves the `__mocks__` file correctly at runtime)
- **Steps**:
  1. Create the integration test file at `packages/api/src/__uat087__.test.ts` with this content:
     ```ts
     import { describe, it, expect, vi } from 'vitest'

     vi.mock('@demand-letter/db')

     import { prisma } from '@demand-letter/db'

     describe('UAT-087: Prisma deep mock helper', () => {
       it('prisma.job.findFirst is a vi mock function', () => {
         expect(vi.isMockFunction(prisma.job.findFirst)).toBe(true)
       })

       it('prisma.job.create is a vi mock function', () => {
         expect(vi.isMockFunction(prisma.job.create)).toBe(true)
       })

       it('mock can be configured to return a specific value', async () => {
         prisma.job.findFirst.mockResolvedValueOnce({ id: 'uat-087', status: 'pending' } as any)
         const result = await prisma.job.findFirst()
         expect(result).toEqual({ id: 'uat-087', status: 'pending' })
       })
     })
     ```
  2. Run the command below
  3. After confirming the result, delete `packages/api/src/__uat087__.test.ts`
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec vitest run src/__uat087__.test.ts
  ```
- **Expected Result**: Exit code 0. Vitest reports 3 tests passed in the `UAT-087: Prisma deep mock helper` suite. No "Cannot find module" or "mock file not found" errors.
- [FAIL: auto-judge: exit code 1 — vi.isMockFunction(prisma.job.findFirst) returned false; mock not resolving via __mocks__ directory] <!-- 2026-06-26 -->

### UAT-SCRIPT-003: Integration — `beforeEach` resets mock call history between tests

- **Scenario**: A test that runs *after* another test that used `prisma.job.findFirst` sees zero calls recorded — confirming `mockReset(prisma)` fires between every test
- **Steps**:
  1. Create the integration test file at `packages/api/src/__uat087_reset__.test.ts` with this content:
     ```ts
     import { describe, it, expect, vi } from 'vitest'

     vi.mock('@demand-letter/db')

     import { prisma } from '@demand-letter/db'

     describe('UAT-087: beforeEach reset behavior', () => {
       it('first test — calls findFirst once', async () => {
         prisma.job.findFirst.mockResolvedValueOnce(null)
         await prisma.job.findFirst()
         expect(prisma.job.findFirst).toHaveBeenCalledOnce()
       })

       it('second test — call count is 0 after reset (beforeEach fired)', () => {
         // If mockReset ran between tests, the call from the first test is gone
         expect(prisma.job.findFirst).not.toHaveBeenCalled()
       })
     })
     ```
  2. Run the command below
  3. After confirming the result, delete `packages/api/src/__uat087_reset__.test.ts`
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec vitest run src/__uat087_reset__.test.ts
  ```
- **Expected Result**: Exit code 0. Both tests pass. The second test passes specifically because `not.toHaveBeenCalled()` succeeds, proving the `beforeEach` reset ran.
- [FAIL: auto-judge: exit code 1 — prisma.job.findFirst.mockResolvedValueOnce is not a function; same root cause as UAT-SCRIPT-002 — mock not resolving via __mocks__ directory] <!-- 2026-06-26 -->

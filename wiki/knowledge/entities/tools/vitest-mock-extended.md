---
id: vitest-mock-extended
title: vitest-mock-extended
aliases: [vitest-mock-extended, mockDeep]
updated: 2026-06-26
sources:
  - ../../../raw/research/api-test-strategy/index.md
tags: [testing, prisma, mock, vitest, typescript]
---

# vitest-mock-extended

relates_to::[[../../sources/api-testing-strategy.md]] | relates_to::[[vitest.md]]

`vitest-mock-extended` provides type-safe deep mocking for Vitest. Its primary use in this project is mocking the Prisma client: `mockDeep<PrismaClient>()` returns a fully typed mock where every model method (`findUnique`, `create`, `update`, etc.) is replaced with a `vi.fn()` stub that TypeScript validates against the real Prisma schema.

**Prisma mock setup pattern:**
```ts
// packages/api/src/__mocks__/@demand-letter/db.ts
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
export const prisma = mockDeep<PrismaClient>()
```
Then in handler tests: `vi.mock('@demand-letter/db')` — Vitest auto-resolves to the `__mocks__` file, injecting the deep mock without any real database connection.

**Role in this project:** All 28 handler integration tests use this pattern to isolate handlers from the Prisma layer. Individual test cases call `prismaMock.job.findUnique.mockResolvedValue(...)` to control return values per scenario.

**Reference sources:** Pattern source: `dev.to/jay818/mastering-unit-testing-a-comprehensive-guide-ing` · npm package: `npmjs.com/package/vitest-mock-extended`

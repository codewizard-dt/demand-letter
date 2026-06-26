# API Package Testing Patterns

## Infrastructure (set up in ROADMAP-008 Phase 1)
- **Runner**: vitest (config at `packages/api/vitest.config.ts`), include pattern `src/**/*.test.ts`
- **Prisma mock**: `packages/api/__mocks__/@demand-letter/db.ts` — `mockDeep<PrismaClient>()` with auto-reset in `beforeEach`
- **AWS mock**: `aws-sdk-client-mock` + `aws-sdk-client-mock-vitest` available as devDeps
- **Run**: `pnpm --filter @demand-letter/api test`

## Test file locations
All test files live alongside source files:
- `src/lib/<name>.test.ts`
- `src/handlers/<name>.test.ts`

## Using the Prisma mock
```ts
import { vi } from 'vitest'
vi.mock('@demand-letter/db')  // must be before other imports

import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'

const prismaMock = prisma as DeepMockProxy<PrismaClient>
// Usage: prismaMock.job.findUnique.mockResolvedValue(...)
```

## Handler test pattern
Handlers are Lambda functions — call `handler(event, {} as any, {} as any)` directly.
```ts
const result = await handler({ pathParameters: { id: 'job-123' } } as any, {} as any, {} as any)
expect(result?.statusCode).toBe(200)
```
For handlers that call a lib function (e.g. computeGapReport), mock that too:
```ts
vi.mock('../lib/sufficiency-gate')
const mockFn = vi.mocked(computeGapReport)
```

## Current coverage (67 tests, 9 files — as of 2026-06-26)
- `lib/redact-text.test.ts` (9 tests) — pure unit
- `lib/merge-entities.test.ts` (8 tests) — pure unit
- `lib/field-schema.test.ts` (11 tests) — pure unit
- `lib/ai.test.ts` (9 tests) — pure unit (estimateCostUsd)
- `lib/sufficiency-gate.test.ts` (10 tests) — prisma mock
- `lib/generation-data-builder.test.ts` (10 tests) — prisma mock
- `handlers/get-jobs.test.ts` (3 tests) — prisma mock
- `handlers/post-jobs.test.ts` (2 tests) — prisma mock
- `handlers/get-jobs-gap-report.test.ts` (5 tests) — prisma mock + lib mock

## stderr is expected on error-path tests
Handlers log via `console.error` in catch blocks — stderr output during tests covering error paths is normal/expected.

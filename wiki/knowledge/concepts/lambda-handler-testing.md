---
id: lambda-handler-testing
title: Lambda Handler Testing (TypeScript)
updated: 2026-06-26
sources:
  - ../../raw/research/api-test-strategy/index.md
tags: [testing, lambda, typescript, vitest, aws]
---

# Lambda Handler Testing (TypeScript)

relates_to::[[../sources/api-testing-strategy.md]] | uses::[[../entities/tools/vitest.md]] | uses::[[../entities/tools/aws-sdk-client-mock.md]] | uses::[[../entities/tools/vitest-mock-extended.md]]

Lambda handlers in this project export a single `handler` const typed as `APIGatewayProxyHandler` (or similar). Integration tests treat the handler as a black box: construct a partial `APIGatewayProxyEvent`, call `handler(event, ctx, vi.fn())`, and assert on the returned `APIGatewayProxyResult` body and status code.

**The two mock boundaries** that must be in place before a handler can be tested in isolation:

1. **AWS SDK clients** — use `mockClient(SomeClient)` from `aws-sdk-client-mock`. This patches at the Smithy middleware level and works even when clients are instantiated at module scope (no refactoring required).
2. **Prisma / database** — use `vi.mock('@demand-letter/db')` pointing to a `__mocks__/@demand-letter/db.ts` file that exports `mockDeep<PrismaClient>()` from `vitest-mock-extended`. Controls every model method individually per test.

**Test file scaffold** (`packages/api/src/handlers/__tests__/<handler>.test.ts`):
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

vi.mock('@demand-letter/db')           // resolves to __mocks__ deep mock

import { handler } from '../my-handler'
import { prisma } from '@demand-letter/db'

const s3Mock = mockClient(S3Client)

beforeEach(() => {
  s3Mock.reset()
  vi.resetAllMocks()
})

describe('my-handler', () => {
  it('returns 200 with job data', async () => {
    ;(prisma.job.findUnique as any).mockResolvedValue({ id: '123', status: 'done' })
    s3Mock.on(GetObjectCommand).resolves({ Body: undefined })
    const event = { pathParameters: { jobId: '123' } } as any
    const res = await handler(event, {} as any, vi.fn())
    expect(res?.statusCode).toBe(200)
    expect(JSON.parse(res?.body ?? '{}')).toMatchObject({ id: '123' })
  })
})
```

**Constraint:** `pdfjs-dist` imports `import.meta.url` and may require a Node canvas shim. Structured-parser tests that exercise PDF paths should use raw fixture bytes or be skipped pending shim setup.

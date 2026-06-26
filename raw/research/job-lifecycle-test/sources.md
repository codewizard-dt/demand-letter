---
topic: "all jobs are pending. create a test that creates a job and monitors it until success or failure"
slug: job-lifecycle-test
researched: 2026-06-26
---

# Primary Sources — Job Lifecycle Test

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/db/prisma/schema.prisma` — `Job` model | 2026-06-26 | `status String @default("pending")`; no DB enum; plain string transitions |
| S2 | codebase | `packages/api/src/handlers/post-jobs-generate.ts` | 2026-06-26 | Full status machine: `processing` on entry, `complete` on success, `failed` on `TemplateRenderError` and other errors; early-return guards (no-files → 422, gap-report gaps → 400) that skip status update |
| S3 | codebase | `packages/api/src/handlers/post-jobs.test.ts` | 2026-06-26 | Pattern: `vi.mock('@demand-letter/db')`, `DeepMockProxy<PrismaClient>`, `prismaMock.job.create.mockResolvedValue(...)` |
| S4 | codebase | `packages/api/src/handlers/get-jobs.test.ts` | 2026-06-26 | Same pattern; shows `status: 'pending'` and `status: 'complete'` as valid string values in test fixtures |
| S5 | codebase | `packages/api/__mocks__/@demand-letter/db.ts` | 2026-06-26 | `mockDeep<PrismaClient>()` + `beforeEach(() => mockReset(prisma))` — auto-reset per test |
| S6 | inference | *(no primary source)* | 2026-06-26 | `Promise.race([handler(...), stall(ms)])` pattern for stall detection — standard JS pattern, no external source |

## Excerpts

### S1 — Prisma schema Job model
`packages/db/prisma/schema.prisma`
```prisma
model Job {
  id        String   @id @default(cuid())
  userId    String
  status    String   @default("pending")
  output      String?
  outputS3Key String?
  ...
  @@index([status])
}
```

### S2 — post-jobs-generate status transitions
`packages/api/src/handlers/post-jobs-generate.ts`
```ts
// Entry
await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } });
// Success
await prisma.job.update({ where: { id: jobId }, data: { status: 'complete', output: narrativeText, outputS3Key } });
// TemplateRenderError
await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
// Other errors
await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
throw err;
```

### S3 — post-jobs.test.ts pattern
```ts
vi.mock('@demand-letter/db')
import { prisma } from '@demand-letter/db'
const prismaMock = prisma as DeepMockProxy<PrismaClient>
// ...
prismaMock.job.create.mockResolvedValue({ id: 'some-uuid' } as any)
const result = await handler({} as any, {} as any, () => {})
expect(result?.statusCode).toBe(201)
```

### S5 — __mocks__ auto-reset
`packages/api/__mocks__/@demand-letter/db.ts`
```ts
export const prisma = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>
beforeEach(() => {
  mockReset(prisma)
})
```

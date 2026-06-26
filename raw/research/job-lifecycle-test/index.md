---
topic: "all jobs are pending. create a test that creates a job and monitors it until success or failure"
slug: job-lifecycle-test
researched: 2026-06-26
sources: [./sources.md]
---

# Research: Job Lifecycle Test

> Jobs default to `pending` and only advance via `POST /jobs/:id/generate`, which synchronously drives the status machine through `processing → complete | failed`. A test should call `post-jobs` to get an ID, then call `post-jobs-generate` and race the result against a stall timeout. The recommended approach is a **unit test** using the existing `vi.mock('@demand-letter/db')` + `vitest-mock-extended` pattern, covering four outcomes: success, generation failure, template-render failure, and stall.

## Research Questions

1. What is the job status lifecycle and what transitions are possible?
2. Why would all jobs stay `pending`?
3. How do existing tests in this codebase work?
4. What should a "create + monitor" test look like, covering success, failure, and stall?
5. How is the stall case best expressed in a Vitest unit test?

## Current State (Codebase)

**Status state machine** (plain `String`, no DB enum) [S1]:
```
pending  →  processing  →  complete
                        →  failed
```
- `pending` — schema default (`@default("pending")`); set on `POST /jobs`
- `processing` — set at the top of `post-jobs-generate.handler`, before AI calls
- `complete` — set after DOCX is uploaded to S3 and output saved
- `failed` — set on `TemplateRenderError` or any other uncaught error

**Why jobs stay `pending`** [S2]:
`POST /jobs/:id/generate` is the only code that transitions away from `pending`. The handler returns early (without touching status) when:
- No files uploaded → 422 `no_files_uploaded`
- Gap report has gaps → 400 `sufficiency_precheck_failed`

If either guard fires, or if the Lambda is never invoked, the job stays `pending` forever. The gap-report 404 seen in the session (job has no classified template) means the generate pre-check would also fail — confirming why the job never left `pending`.

**Existing test pattern** [S3, S4]:
All handler tests in `packages/api/src/handlers/*.test.ts` follow the same structure:
```ts
vi.mock('@demand-letter/db')         // hoisted mock
import { prisma } from '@demand-letter/db'
const prismaMock = prisma as DeepMockProxy<PrismaClient>
// per-test: prismaMock.job.X.mockResolvedValue(...)
// invoke: await handler({} as any, {} as any, () => {})
// assert: expect(result?.statusCode).toBe(...)
```
The `__mocks__/@demand-letter/db.ts` auto-resets the mock before each test via `beforeEach(() => mockReset(prisma))` [S5].

**Dependencies to mock for generate** [S2]:
- `@demand-letter/db` → `prisma` (existing pattern)
- `../lib/sufficiency-gate` → `computeGapReport`
- `../lib/medical-narrative` → `generateMedicalNarrative`
- `../lib` → `buildDataObject`, `renderTemplate`, `TemplateRenderError`
- `@aws-sdk/client-s3` → `S3Client` / `PutObjectCommand`

## Key Findings

- The generate endpoint is **synchronous** — it resolves or rejects in one call; no polling needed [S2].
- The "stall" scenario is a hung promise (Lambda timeout or deadlock). In a unit test this is captured with `Promise.race([handler(...), stall(ms)])` [S6 — inference].
- `TemplateRenderError` is a distinct error subclass with an `errors` array; it produces a separate 500 body and sets `status: 'failed'` before returning (not re-throwing) [S2].
- All other errors set `status: 'failed'` and then re-throw (producing an unhandled Lambda error) [S2].
- The `__mocks__` auto-reset means each test starts with a clean mock — no teardown needed [S5].

## Constraints

- Tests must follow the `vi.mock` hoisting pattern (mock calls before imports).
- S3 must be mocked — the `S3Client` is module-level so it needs `vi.mock('@aws-sdk/client-s3')`.
- `TemplateRenderError` is imported from `../lib`; must be importable in tests.
- Vitest's fake timers (`vi.useFakeTimers`) work for stall, but `Promise.race` with a real `setTimeout` is simpler and doesn't require timer teardown.

## Solution Comparison

| Criteria | Unit test (recommended) | Integration E2E |
|---|---|---|
| **Approach** | Mock Prisma + AWS, call handler directly | Call running SAM local HTTP endpoints |
| **Covers stall** | Yes — `Promise.race` + timeout | Yes — but needs real Lambda timeout |
| **Speed** | Milliseconds | 10–60+ seconds |
| **CI-safe** | Yes | No — needs SAM, DB, S3, Bedrock |
| **Debuggability** | Mock assertions pinpoint the exact call | Real network errors surface naturally |
| **Fits existing pattern** | Yes — same as 3 existing test files | No — new infrastructure |

## Recommendation

**Write a unit test: `post-jobs-generate.test.ts`** in `packages/api/src/handlers/`.

### Implementation

```ts
import { vi } from 'vitest'
vi.mock('@demand-letter/db')
vi.mock('../lib/sufficiency-gate')
vi.mock('../lib/medical-narrative')
vi.mock('../lib')
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn().mockResolvedValue({}) })),
  PutObjectCommand: vi.fn(),
}))

import { describe, it, expect, beforeEach } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { computeGapReport } from '../lib/sufficiency-gate'
import { generateMedicalNarrative } from '../lib/medical-narrative'
import { buildDataObject, renderTemplate, TemplateRenderError } from '../lib'
import { handler } from './post-jobs-generate'

const prismaMock = prisma as DeepMockProxy<PrismaClient>
const mockComputeGapReport = vi.mocked(computeGapReport)
const mockGenerateMedicalNarrative = vi.mocked(generateMedicalNarrative)
const mockBuildDataObject = vi.mocked(buildDataObject)
const mockRenderTemplate = vi.mocked(renderTemplate)

// Helper: stall detection
const stall = (ms: number) =>
  new Promise<'stall'>((resolve) => setTimeout(() => resolve('stall'), ms))

// Shared happy-path setup
function setupHappyPath() {
  prismaMock.file.findMany.mockResolvedValue([{ id: 'f1' }] as any)
  mockComputeGapReport.mockResolvedValue({ covered: 3, total: 3, gaps: [] })
  prismaMock.job.update.mockResolvedValue({} as any)
  mockGenerateMedicalNarrative.mockResolvedValue({
    text: 'Narrative text.',
    groundingReport: {},
  } as any)
  mockBuildDataObject.mockResolvedValue({ field: 'value' } as any)
  mockRenderTemplate.mockResolvedValue(Buffer.from('docx') as any)
}

const event = (id = 'job-123') =>
  ({ pathParameters: { id }, headers: {} }) as any

describe('post-jobs-generate handler — lifecycle', () => {

  it('SUCCESS: transitions pending → processing → complete and returns 200', async () => {
    setupHappyPath()

    const result = await handler(event(), {} as any, () => {})

    // Status machine: processing then complete
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'complete' }) }),
    )
    expect(result?.statusCode).toBe(200)
    expect(result?.headers?.['Content-Type']).toBe('text/event-stream')
  })

  it('FAILURE — generation error: transitions to failed and returns 500', async () => {
    setupHappyPath()
    mockGenerateMedicalNarrative.mockRejectedValue(new Error('Bedrock timeout'))

    await expect(handler(event(), {} as any, () => {})).rejects.toThrow('Bedrock timeout')

    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } }),
    )
  })

  it('FAILURE — template render error: transitions to failed and returns 500', async () => {
    setupHappyPath()
    const renderErr = new TemplateRenderError([{ message: 'missing slot' }])
    mockRenderTemplate.mockRejectedValue(renderErr)

    const result = await handler(event(), {} as any, () => {})

    expect(result?.statusCode).toBe(500)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'template_render_failed' })
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } }),
    )
  })

  it('STALL: resolves "stall" if handler does not complete within timeout', async () => {
    setupHappyPath()
    // Simulate a hung generate call
    mockGenerateMedicalNarrative.mockReturnValue(new Promise(() => {}))

    const outcome = await Promise.race([
      handler(event(), {} as any, () => {}).then(() => 'done' as const),
      stall(100),
    ])

    expect(outcome).toBe('stall')
    // Status never advanced past processing
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    expect(prismaMock.job.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'complete' }) }),
    )
  })

  it('returns 422 if no files are uploaded (status never changes)', async () => {
    prismaMock.file.findMany.mockResolvedValue([])

    const result = await handler(event(), {} as any, () => {})

    expect(result?.statusCode).toBe(422)
    expect(prismaMock.job.update).not.toHaveBeenCalled()
  })

  it('returns 400 if gap report has gaps (status never changes)', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'f1' }] as any)
    mockComputeGapReport.mockResolvedValue({
      covered: 1,
      total: 3,
      gaps: [{ fieldName: 'dob', nullReason: null, acceptMissing: false }],
    })

    const result = await handler(event(), {} as any, () => {})

    expect(result?.statusCode).toBe(400)
    expect(prismaMock.job.update).not.toHaveBeenCalled()
  })
})
```

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| `TemplateRenderError` constructor signature unknown | Read `packages/api/src/lib/docx-renderer.ts` before finalising |
| `vi.mock('../lib')` clobbers all named exports | Use `vi.importActual` for `TemplateRenderError` if it's a plain class |
| S3 mock may need adjustment per actual SDK version | Use `vi.fn().mockResolvedValue({})` on `send`; adjust if `PutObjectCommand` is imported differently |
| Stall test leaks a pending promise | Acceptable in unit tests; if flaky, wrap in `vi.useFakeTimers()` and advance |

## Next Steps

- `/task-add Write post-jobs-generate lifecycle test covering success, failure, template-render-failure, and stall — packages/api/src/handlers/post-jobs-generate.test.ts`
- Verify `TemplateRenderError` constructor before wiring the test: `mcp__serena__find_symbol TemplateRenderError`
- After the test passes, run `pnpm --filter @demand-letter/api test` to confirm suite is green

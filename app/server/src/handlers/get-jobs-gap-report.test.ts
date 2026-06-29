import { vi } from 'vitest'
vi.mock('@demand-letter/db')
vi.mock('../lib/sufficiency-gate')

import { describe, it, expect } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { computeGapReport } from '../lib/sufficiency-gate'
import { handler } from './get-jobs-gap-report'

const prismaMock = prisma as DeepMockProxy<PrismaClient>
const mockComputeGapReport = vi.mocked(computeGapReport)

describe('get-jobs-gap-report handler', () => {
  it('returns 400 with missing_job_id when no pathParameters id', async () => {
    const result = await handler({ pathParameters: undefined } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(400)
    expect(JSON.parse((result as any)?.body ?? '')).toMatchObject({ error: 'missing_job_id' })
  })

  it('returns 404 with job_not_found when job does not exist', async () => {
    prismaMock.job.findUnique.mockResolvedValue(null)

    const result = await handler({ pathParameters: { id: 'job-123' } } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(404)
    expect(JSON.parse((result as any)?.body ?? '')).toMatchObject({ error: 'job_not_found' })
  })

  it('returns 404 with template_not_ready when no template found', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-123' } as any)
    prismaMock.template.findFirst.mockResolvedValue(null)

    const result = await handler({ pathParameters: { id: 'job-123' } } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(404)
    expect(JSON.parse((result as any)?.body ?? '')).toMatchObject({ error: 'template_not_ready' })
  })

  it('returns 200 with gap report when job and template exist', async () => {
    const gapReport = { covered: 2, total: 2, gaps: [] }
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-123' } as any)
    prismaMock.template.findFirst.mockResolvedValue({ id: 'template-1' } as any)
    mockComputeGapReport.mockResolvedValue(gapReport)

    const result = await handler({ pathParameters: { id: 'job-123' } } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(200)
    expect(JSON.parse((result as any)?.body ?? '')).toEqual(gapReport)
  })

  it('returns 500 with internal_server_error when computeGapReport throws', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-123' } as any)
    prismaMock.template.findFirst.mockResolvedValue({ id: 'template-1' } as any)
    mockComputeGapReport.mockRejectedValue(new Error('compute error'))

    const result = await handler({ pathParameters: { id: 'job-123' } } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(500)
    expect(JSON.parse((result as any)?.body ?? '')).toMatchObject({ error: 'internal_server_error' })
  })
})

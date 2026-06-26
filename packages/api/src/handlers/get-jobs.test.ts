import { vi } from 'vitest'
vi.mock('@demand-letter/db')

import { describe, it, expect } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { handler } from './get-jobs'

const prismaMock = prisma as DeepMockProxy<PrismaClient>

describe('get-jobs handler', () => {
  it('returns 200 with empty jobs array when no jobs exist', async () => {
    prismaMock.job.findMany.mockResolvedValue([])

    const result = await handler({} as any, {} as any, () => {})

    expect(result?.statusCode).toBe(200)
    expect(JSON.parse(result?.body ?? '')).toEqual({ jobs: [] })
  })

  it('returns 200 with correct jobs in body when jobs exist', async () => {
    const jobs = [
      { id: 'job-1', status: 'pending', createdAt: new Date('2024-01-01') },
      { id: 'job-2', status: 'complete', createdAt: new Date('2024-01-02') },
    ]
    prismaMock.job.findMany.mockResolvedValue(jobs as any)

    const result = await handler({} as any, {} as any, () => {})

    expect(result?.statusCode).toBe(200)
    const body = JSON.parse(result?.body ?? '')
    expect(body.jobs).toHaveLength(2)
    expect(body.jobs[0].id).toBe('job-1')
    expect(body.jobs[1].id).toBe('job-2')
  })

  it('returns 500 with internal_server_error when prisma throws', async () => {
    prismaMock.job.findMany.mockRejectedValue(new Error('db error'))

    const result = await handler({} as any, {} as any, () => {})

    expect(result?.statusCode).toBe(500)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'internal_server_error' })
  })
})

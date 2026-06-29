import { vi } from 'vitest'
vi.mock('@demand-letter/db')

import { describe, it, expect } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { handler } from './post-jobs'

const prismaMock = prisma as DeepMockProxy<PrismaClient>

describe('post-jobs handler', () => {
  it('returns 201 with job id when job is created successfully', async () => {
    prismaMock.job.create.mockResolvedValue({ id: 'some-uuid' } as any)

    const result = await handler({} as any, {} as any, () => {})

    expect(result?.statusCode).toBe(201)
    expect(JSON.parse(result?.body ?? '')).toEqual({ id: 'some-uuid' })
  })

  it('returns 500 with internal_server_error when prisma throws', async () => {
    prismaMock.job.create.mockRejectedValue(new Error('db error'))

    const result = await handler({} as any, {} as any, () => {})

    expect(result?.statusCode).toBe(500)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'internal_server_error' })
  })
})

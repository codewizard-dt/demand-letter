import { vi, beforeEach } from 'vitest'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'

export const prisma = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prisma)
})

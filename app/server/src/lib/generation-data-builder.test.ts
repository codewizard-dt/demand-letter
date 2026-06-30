import { vi } from 'vitest'
vi.mock('@demand-letter/db')

import { describe, it, expect } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { buildDataObject } from './generation-data-builder'

const prismaMock = prisma as DeepMockProxy<PrismaClient>

const JOB_ID = 'job-123'

describe('buildDataObject', () => {
  it('throws when no extracted fields are found for the job', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([])

    await expect(buildDataObject(JOB_ID)).rejects.toThrow(JOB_ID)
  })

  it('maps a non-null field to its camelCase tagName and dbName alias', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', value: '2024-01-15', isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result).toHaveProperty('letterDate', '2024-01-15')
    expect(result).toHaveProperty('letter_date', '2024-01-15')
  })

  it('includes the field value as-is when isNull is false and value is present', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'claim_number', value: 'foo', isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result.claimNumber).toBe('foo')
  })

  it('adds numbered aliases for multi-line extracted values', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'insurer_address', value: 'P.O. Box 25210\nSanta Ana, CA 92799', isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result.insurer_address).toBe('P.O. Box 25210\nSanta Ana, CA 92799')
    expect(result.insurerAddress).toBe('P.O. Box 25210\nSanta Ana, CA 92799')
    expect(result.insurer_address_1).toBe('P.O. Box 25210')
    expect(result.insurer_address_2).toBe('Santa Ana, CA 92799')
    expect(result.insurerAddress_1).toBe('P.O. Box 25210')
    expect(result.insurerAddress_2).toBe('Santa Ana, CA 92799')
  })

  it('omits the field entirely when isNull is true and acceptMissing is false', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', value: null, isNull: true, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result).not.toHaveProperty('letterDate')
  })

  it('includes empty string when isNull is true and acceptMissing is true', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'incident_time', value: null, isNull: true, source: 'llm', acceptMissing: true },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result).toHaveProperty('incidentTime', '')
    expect(result).toHaveProperty('incident_time', '')
  })

  it('uses the dbName as the key when the field is not in FIELD_SCHEMA', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'unknown_custom_field', value: 'some-value', isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result).toHaveProperty('unknown_custom_field', 'some-value')
  })

  it('parses loop field with valid JSON into an array under the specials tag', async () => {
    const items = [
      { provider: 'Dr. Smith', amount: '$1200' },
      { provider: 'City Hospital', amount: '$5000' },
    ]
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'per_provider_line_items', value: JSON.stringify(items), isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result.specials).toEqual(items)
    expect(result.per_provider_line_items).toEqual(items)
  })

  it('sets specials to an empty array when loop field value is null', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'per_provider_line_items', value: null, isNull: true, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result.specials).toEqual([])
  })

  it('sets specials to an empty array when loop field value is invalid JSON', async () => {
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'per_provider_line_items', value: 'not-valid-json{{', isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result.specials).toEqual([])
  })

  it('produces a correct combined result for multiple rows with mixed types', async () => {
    const lineItems = [{ provider: 'Dr. A', amount: '$500' }]
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', value: '2024-06-01', isNull: false, source: 'llm', acceptMissing: false },
      { fieldName: 'adjuster_name', value: null, isNull: true, source: 'llm', acceptMissing: false },
      { fieldName: 'adjuster_title', value: null, isNull: true, source: 'llm', acceptMissing: true },
      { fieldName: 'per_provider_line_items', value: JSON.stringify(lineItems), isNull: false, source: 'llm', acceptMissing: false },
    ] as any)

    const result = await buildDataObject(JOB_ID)

    expect(result.letterDate).toBe('2024-06-01')
    expect(result.letter_date).toBe('2024-06-01')
    expect(result).not.toHaveProperty('adjusterName')
    expect(result.adjusterTitle).toBe('')
    expect(result.adjuster_title).toBe('')
    expect(result.specials).toEqual(lineItems)
    expect(result.per_provider_line_items).toEqual(lineItems)
  })
})

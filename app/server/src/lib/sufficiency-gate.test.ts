import { vi } from 'vitest'
vi.mock('@demand-letter/db')

import { describe, it, expect } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { computeGapReport } from './sufficiency-gate'

const prismaMock = prisma as DeepMockProxy<PrismaClient>

describe('computeGapReport', () => {
  it('returns empty report when no template found', async () => {
    prismaMock.template.findFirst.mockResolvedValue(null)

    const result = await computeGapReport('job-1')

    expect(result).toEqual({ covered: 0, total: 0, gaps: [] })
    expect(prismaMock.templateSlot.findMany).not.toHaveBeenCalled()
    expect(prismaMock.extractedField.findMany).not.toHaveBeenCalled()
  })

  it('returns empty report when template has zero slots', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([])
    prismaMock.extractedField.findMany.mockResolvedValue([])

    const result = await computeGapReport('job-1')

    expect(result).toEqual({ covered: 0, total: 0, gaps: [] })
  })

  it('returns no gaps when all slots have high-confidence fields', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'claim_number' },
      { slotName: 'claimant_name' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'claim_number', isNull: false, confidence: 0.95, source: 'llm', acceptMissing: false, nullReason: null },
      { fieldName: 'claimant_name', isNull: false, confidence: 0.90, source: 'llm', acceptMissing: false, nullReason: null },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result).toEqual({ covered: 2, total: 2, gaps: [] })
  })

  it('reports a gap when a slot has no matching field', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'claim_number' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([])

    const result = await computeGapReport('job-1')

    expect(result.covered).toBe(0)
    expect(result.total).toBe(1)
    expect(result.gaps).toEqual([
      { fieldName: 'claim_number', nullReason: null, acceptMissing: false },
    ])
  })

  it('covers a field with acceptMissing: true', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'incident_time' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'incident_time', isNull: true, confidence: 0, source: 'llm', acceptMissing: true, nullReason: 'not mentioned' },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result).toEqual({ covered: 1, total: 1, gaps: [] })
  })

  it('covers a field with source: attorney-judgment', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'demand_amount' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'demand_amount', isNull: true, confidence: 0, source: 'attorney-judgment', acceptMissing: false, nullReason: null },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result).toEqual({ covered: 1, total: 1, gaps: [] })
  })

  it('covers a field with isNull: false and confidence above the 0.80 threshold', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'letter_date' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', isNull: false, confidence: 0.85, source: 'llm', acceptMissing: false, nullReason: null },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result).toEqual({ covered: 1, total: 1, gaps: [] })
  })

  it('reports a gap when confidence is below the 0.80 threshold (0.70)', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'letter_date' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', isNull: false, confidence: 0.70, source: 'llm', acceptMissing: false, nullReason: null },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result.covered).toBe(0)
    expect(result.total).toBe(1)
    expect(result.gaps[0].fieldName).toBe('letter_date')
  })

  it('reports a gap when field isNull is true (regardless of confidence)', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'letter_date' },
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', isNull: true, confidence: 0.95, source: 'llm', acceptMissing: false, nullReason: 'could not determine' },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result.covered).toBe(0)
    expect(result.total).toBe(1)
    expect(result.gaps[0]).toEqual({
      fieldName: 'letter_date',
      nullReason: 'could not determine',
      acceptMissing: false,
    })
  })

  it('returns correct covered/total/gaps counts for mixed-coverage slots', async () => {
    prismaMock.template.findFirst.mockResolvedValue({ id: 'tmpl-1' } as any)
    prismaMock.templateSlot.findMany.mockResolvedValue([
      { slotName: 'letter_date' },     // covered: high confidence
      { slotName: 'claim_number' },    // covered: attorney-judgment
      { slotName: 'demand_amount' },   // covered: acceptMissing
      { slotName: 'adjuster_name' },   // gap: low confidence
      { slotName: 'insurer_name' },    // gap: no matching field
    ] as any)
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'letter_date', isNull: false, confidence: 0.90, source: 'llm', acceptMissing: false, nullReason: null },
      { fieldName: 'claim_number', isNull: true, confidence: 0, source: 'attorney-judgment', acceptMissing: false, nullReason: null },
      { fieldName: 'demand_amount', isNull: true, confidence: 0, source: 'llm', acceptMissing: true, nullReason: 'N/A' },
      { fieldName: 'adjuster_name', isNull: false, confidence: 0.50, source: 'llm', acceptMissing: false, nullReason: null },
    ] as any)

    const result = await computeGapReport('job-1')

    expect(result.total).toBe(5)
    expect(result.covered).toBe(3)
    expect(result.gaps).toHaveLength(2)
    expect(result.gaps.map((g) => g.fieldName)).toEqual(
      expect.arrayContaining(['adjuster_name', 'insurer_name']),
    )
  })
})

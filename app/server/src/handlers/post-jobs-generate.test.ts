import { vi } from 'vitest'

vi.mock('@demand-letter/db')
vi.mock('../lib/sufficiency-gate')
vi.mock('../lib/medical-narrative')
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn().mockResolvedValue({}) })),
  PutObjectCommand: vi.fn(),
}))
// Keep TemplateRenderError real so instanceof checks in the handler work
vi.mock('../lib', async (importActual) => {
  const actual = await importActual<typeof import('../lib')>()
  return {
    ...actual,
    buildDataObject: vi.fn(),
    renderTemplate: vi.fn(),
  }
})

import { describe, it, expect } from 'vitest'
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

const stall = (ms: number) =>
  new Promise<'stall'>((resolve) => setTimeout(() => resolve('stall'), ms))

const event = (id = 'job-123') =>
  ({ pathParameters: { id }, headers: {} }) as any

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

describe('post-jobs-generate handler — lifecycle', () => {
  it('SUCCESS: transitions pending → processing → complete and returns 200 SSE', async () => {
    setupHappyPath()

    const result = await handler(event(), {} as any, () => {})

    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'complete' }) }),
    )
    expect(result?.statusCode).toBe(200)
    expect(result?.headers?.['Content-Type']).toBe('text/event-stream')
    expect(result?.body).toContain('event: complete')
  })

  it('FAILURE — generation error: sets status to failed and rethrows', async () => {
    setupHappyPath()
    mockGenerateMedicalNarrative.mockRejectedValue(new Error('Bedrock timeout'))

    await expect(handler(event(), {} as any, () => {})).rejects.toThrow('Bedrock timeout')

    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } }),
    )
    expect(prismaMock.job.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'complete' }) }),
    )
  })

  it('FAILURE — template render error: sets status to failed and returns 500', async () => {
    setupHappyPath()
    mockRenderTemplate.mockRejectedValue(new TemplateRenderError([{ message: 'missing slot' }]))

    const result = await handler(event(), {} as any, () => {})

    expect(result?.statusCode).toBe(500)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'template_render_failed' })
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'failed' } }),
    )
  })

  it('STALL: resolves "stall" if handler does not complete within timeout', async () => {
    setupHappyPath()
    mockGenerateMedicalNarrative.mockReturnValue(new Promise(() => {})) // never resolves

    const outcome = await Promise.race([
      handler(event(), {} as any, () => {}).then(() => 'done' as const),
      stall(200),
    ])

    expect(outcome).toBe('stall')
    // processing was set but complete never was
    expect(prismaMock.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'processing' } }),
    )
    expect(prismaMock.job.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'complete' }) }),
    )
  })

  it('returns 422 if no files uploaded — status never changes', async () => {
    prismaMock.file.findMany.mockResolvedValue([])

    const result = await handler(event(), {} as any, () => {})

    expect(result?.statusCode).toBe(422)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'no_files_uploaded' })
    expect(prismaMock.job.update).not.toHaveBeenCalled()
  })

  it('returns 400 if gap report has gaps — status never changes', async () => {
    prismaMock.file.findMany.mockResolvedValue([{ id: 'f1' }] as any)
    mockComputeGapReport.mockResolvedValue({
      covered: 1,
      total: 3,
      gaps: [{ fieldName: 'dob', nullReason: null, acceptMissing: false }],
    })

    const result = await handler(event(), {} as any, () => {})

    expect(result?.statusCode).toBe(400)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'sufficiency_precheck_failed' })
    expect(prismaMock.job.update).not.toHaveBeenCalled()
  })

  it('returns 400 with missing_job_id when no path param', async () => {
    const result = await handler({ pathParameters: undefined, headers: {} } as any, {} as any, () => {})

    expect(result?.statusCode).toBe(400)
    expect(JSON.parse(result?.body ?? '')).toMatchObject({ error: 'missing_job_id' })
  })
})

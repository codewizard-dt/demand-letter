import { vi } from 'vitest'

vi.mock('@demand-letter/db')
vi.mock('../lib/document-type-detector')
vi.mock('../lib/structured-parser')
vi.mock('../lib/textract-client')
vi.mock('../lib/job-logger')

const { mockS3Send } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  GetObjectCommand: vi.fn(),
}))

import { describe, it, expect, beforeEach } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { detectDocumentType } from '../lib/document-type-detector'
import { parseDocx, parsePdfNative } from '../lib/structured-parser'
import { startTextractAnalysis } from '../lib/textract-client'
import { handler } from './post-jobs-documents-ingest'

const prismaMock = prisma as DeepMockProxy<PrismaClient>
const mockDetectDocumentType = vi.mocked(detectDocumentType)
const mockParseDocx = vi.mocked(parseDocx)
const mockParsePdfNative = vi.mocked(parsePdfNative)
const _mockStartTextractAnalysis = vi.mocked(startTextractAnalysis)

describe('post-jobs-documents-ingest handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockS3Send.mockReset()
    prismaMock.job.findUnique.mockReset()
    prismaMock.sourceFile.findMany.mockReset()
    prismaMock.file.findMany.mockReset()
    prismaMock.sourceFile.create.mockReset()
    prismaMock.sourceFile.update.mockReset()
    prismaMock.sourceFile.deleteMany.mockReset()
    prismaMock.extractedField.deleteMany.mockReset()
  })

  it('skips already ingested S3 objects and only processes new uploads', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-1' } as any)
    prismaMock.sourceFile.findMany.mockResolvedValue([
      { s3Key: 'job-1/old.pdf', status: 'complete' },
    ] as any)
    prismaMock.file.findMany.mockResolvedValue([
      { s3Key: 'job-1/old.pdf', fileName: 'old.pdf' },
      { s3Key: 'job-1/new.pdf', fileName: 'new.pdf' },
    ] as any)

    mockS3Send.mockResolvedValueOnce({
      Body: { transformToByteArray: async () => Buffer.from('new doc bytes') },
    })

    mockDetectDocumentType.mockResolvedValue('docx' as any)
    mockParseDocx.mockResolvedValue([
      { type: 'PARAGRAPH', text: 'New field value', page: 1, confidence: 0.99 },
    ] as any)
    mockParsePdfNative.mockResolvedValue([] as any)

    prismaMock.sourceFile.create.mockResolvedValue({
      id: 'source-file-1',
      jobId: 'job-1',
      s3Key: 'job-1/new.pdf',
      type: 'docx',
      status: 'complete',
    } as any)

    const result = await handler({ pathParameters: { id: 'job-1' }, headers: {} } as any)

    expect(result.statusCode).toBe(200)
    expect(prismaMock.sourceFile.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.sourceFile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ s3Key: 'job-1/new.pdf', type: 'docx', status: 'complete' }),
      }),
    )
    expect(mockParseDocx).toHaveBeenCalledTimes(1)
    expect(mockParsePdfNative).not.toHaveBeenCalled()
    expect(JSON.parse(result.body)).toMatchObject({ processed: 1, pending: 0, blocks: 1 })
  })

  it('reports existing Textract source files as pending while polling', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-1' } as any)
    prismaMock.sourceFile.findMany.mockResolvedValue([
      { s3Key: 'job-1/scanned.pdf', status: 'processing' },
    ] as any)
    prismaMock.file.findMany.mockResolvedValue([
      { s3Key: 'job-1/scanned.pdf', fileName: 'scanned.pdf' },
    ] as any)

    const result = await handler({ pathParameters: { id: 'job-1' }, headers: {} } as any)

    expect(result.statusCode).toBe(200)
    expect(prismaMock.sourceFile.create).not.toHaveBeenCalled()
    expect(JSON.parse(result.body)).toMatchObject({ processed: 0, pending: 1, blocks: 0 })
  })

  it('clears previous source files and extracted fields when force reprocessing', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-1' } as any)
    prismaMock.sourceFile.findMany.mockResolvedValue([] as any)
    prismaMock.file.findMany.mockResolvedValue([] as any)

    const result = await handler({
      pathParameters: { id: 'job-1' },
      headers: {},
      body: JSON.stringify({ force: true }),
    } as any)

    expect(result.statusCode).toBe(200)
    expect(prismaMock.extractedField.deleteMany).toHaveBeenCalledWith({ where: { jobId: 'job-1' } })
    expect(prismaMock.sourceFile.deleteMany).toHaveBeenCalledWith({ where: { jobId: 'job-1' } })
    expect(JSON.parse(result.body)).toMatchObject({ processed: 0, pending: 0, blocks: 0 })
  })
})

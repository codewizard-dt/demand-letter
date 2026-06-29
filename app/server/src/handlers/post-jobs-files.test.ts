import { vi } from 'vitest'

vi.mock('@demand-letter/db')

const { mockS3Send, mockPutObjectCommand, mockParseMultipart } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
  mockPutObjectCommand: vi.fn(),
  mockParseMultipart: vi.fn(),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: mockPutObjectCommand,
}))

vi.mock('lambda-multipart-parser', () => ({
  parse: mockParseMultipart,
}))

import { describe, it, expect, beforeEach } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
import { handler } from './post-jobs-files'

const prismaMock = prisma as DeepMockProxy<PrismaClient>

describe('post-jobs-files handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockS3Send.mockResolvedValue({})
    prismaMock.job.findUnique.mockReset()
    prismaMock.file.findFirst.mockReset()
    prismaMock.file.create.mockReset()
  })

  it('stores a new file with a content hash and uploads it to S3', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-1' } as any)
    mockParseMultipart.mockResolvedValue({
      files: [
        {
          filename: 'case.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('case bytes'),
        },
      ],
    })
    prismaMock.file.findFirst.mockResolvedValue(null)
    prismaMock.file.create.mockResolvedValue({
      id: 'file-1',
      jobId: 'job-1',
      contentHash: 'hash-1',
      s3Key: 'job-1/file-1-case.pdf',
      mimeType: 'application/pdf',
      role: 'case_doc',
      fileName: 'case.pdf',
      createdAt: new Date('2026-06-28T00:00:00Z'),
    } as any)

    const result = await handler({ pathParameters: { id: 'job-1' }, headers: {} } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(201)
    expect(mockS3Send).toHaveBeenCalledTimes(1)
    expect(prismaMock.file.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: 'job-1',
          contentHash: expect.any(String),
          mimeType: 'application/pdf',
          role: 'case_doc',
          fileName: 'case.pdf',
        }),
      }),
    )
  })

  it('reuses an existing file row when the uploaded content hash already exists for the same job', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-1' } as any)
    mockParseMultipart.mockResolvedValue({
      files: [
        {
          filename: 'duplicate.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('same bytes'),
        },
        {
          filename: 'duplicate-copy.pdf',
          contentType: 'application/pdf',
          content: Buffer.from('same bytes'),
        },
      ],
    })
    prismaMock.file.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'file-1',
        jobId: 'job-1',
        contentHash: 'hash-1',
        s3Key: 'job-1/file-1-duplicate.pdf',
        mimeType: 'application/pdf',
        role: 'case_doc',
        fileName: 'duplicate.pdf',
        createdAt: new Date('2026-06-28T00:00:00Z'),
      } as any)
    prismaMock.file.create.mockResolvedValue({
      id: 'file-1',
      jobId: 'job-1',
      contentHash: 'hash-1',
      s3Key: 'job-1/file-1-duplicate.pdf',
      mimeType: 'application/pdf',
      role: 'case_doc',
      fileName: 'duplicate.pdf',
      createdAt: new Date('2026-06-28T00:00:00Z'),
    } as any)

    const result = await handler({ pathParameters: { id: 'job-1' }, headers: {} } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(201)
    expect(mockS3Send).toHaveBeenCalledTimes(1)
    expect(prismaMock.file.create).toHaveBeenCalledTimes(2)
    expect(JSON.parse((result as any)?.body ?? '')).toMatchObject({
      files: [
        { id: 'file-1', contentHash: 'hash-1' },
        { id: 'file-1', contentHash: 'hash-1' },
      ],
    })
  })

  it('reuses stored bytes but creates a job file row when duplicate content is uploaded to another job', async () => {
    prismaMock.job.findUnique.mockResolvedValue({ id: 'job-2' } as any)
    mockParseMultipart.mockResolvedValue({
      files: [
        {
          filename: 'template.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          content: Buffer.from('same template bytes'),
        },
      ],
    })
    prismaMock.file.findFirst
      .mockResolvedValueOnce({
        id: 'file-1',
        jobId: 'job-1',
        contentHash: 'hash-1',
        s3Key: 'job-1/file-1-template.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        role: 'template',
        fileName: 'template.docx',
        createdAt: new Date('2026-06-28T00:00:00Z'),
      } as any)
    prismaMock.file.create.mockResolvedValue({
      id: 'file-2',
      jobId: 'job-2',
      contentHash: 'hash-1',
      s3Key: 'job-1/file-1-template.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      role: 'template',
      fileName: 'template.docx',
      createdAt: new Date('2026-06-28T00:01:00Z'),
    } as any)

    const result = await handler({ pathParameters: { id: 'job-2' }, headers: {} } as any, {} as any, () => {})

    expect((result as any)?.statusCode).toBe(201)
    expect(mockS3Send).not.toHaveBeenCalled()
    expect(prismaMock.file.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: 'job-2',
          s3Key: 'job-1/file-1-template.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          role: 'template',
          fileName: 'template.docx',
        }),
      }),
    )
    expect(JSON.parse((result as any)?.body ?? '')).toMatchObject({
      files: [{ id: 'file-2', jobId: 'job-2', s3Key: 'job-1/file-1-template.docx', role: 'template' }],
    })
  })
})

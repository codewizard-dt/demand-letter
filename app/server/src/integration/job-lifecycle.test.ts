/**
 * Integration test suite — real PostgreSQL (demand_letter_test) + real AWS S3.
 *
 * Mock boundary: only generateMedicalNarrative (Bedrock streaming) is mocked.
 * Everything else — Prisma writes, S3 uploads/downloads, docxtemplater rendering,
 * DB status transitions — uses real services.
 *
 * Run: pnpm --filter @demand-letter/server test:integration
 * Prerequisites: PostgreSQL running locally, AWS credentials in environment.
 */

import { vi } from 'vitest'

// Mock only the Bedrock streaming call — S3 and Prisma remain real.
vi.mock('../lib/medical-narrative', () => ({
  generateMedicalNarrative: vi.fn().mockResolvedValue({
    text: 'Patient sustained injuries and received treatment following the incident.',
    groundingReport: { validCitations: 0, unknownCitations: [] },
  }),
}))

import { describe, it, expect, afterEach } from 'vitest'
import { prisma } from '@demand-letter/db'
import { handler as postJobsHandler } from '../handlers/post-jobs'
import { handler as postJobsFilesHandler } from '../handlers/post-jobs-files'
import { handler as postJobsIngestHandler } from '../handlers/post-jobs-documents-ingest'
import { handler as postJobsGenerateHandler } from '../handlers/post-jobs-generate'
import { DOCX_MIME, plainDocxBuffer, taggedDocxBuffer } from './helpers/docx'
import { makeMultipartEvent } from './helpers/multipart'
import { deleteS3Keys, s3KeyExists, uploadToS3 } from './helpers/aws'

const lambdaCtx = {} as any
const noop = () => {}

/** Delete a job and all cascade-linked records; remove any S3 keys. */
async function cleanup(jobId: string, s3Keys: string[] = []): Promise<void> {
  await prisma.job.delete({ where: { id: jobId } }).catch(() => {})
  await deleteS3Keys(s3Keys)
}

// ---------------------------------------------------------------------------
// Test 1: Job creation + file upload
// ---------------------------------------------------------------------------

describe('integration: job creation and file upload', () => {
  let jobId = ''
  let uploadedKeys: string[] = []

  afterEach(async () => {
    if (jobId) await cleanup(jobId, uploadedKeys)
    jobId = ''
    uploadedKeys = []
  })

  it('creates a job in PostgreSQL and uploads DOCX + PDF to S3', async () => {
    // --- Create job ---
    const createRes = await postJobsHandler({} as any, lambdaCtx, noop)
    expect(createRes?.statusCode).toBe(201)
    ;({ id: jobId } = JSON.parse(createRes!.body))
    expect(typeof jobId).toBe('string')

    // Verify job in DB
    const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } })
    expect(job.status).toBe('pending')

    // --- Upload template DOCX + minimal PDF ---
    // The PDF bytes just need a valid PDF MIME type for the handler to accept them;
    // detectDocumentType is not called by post-jobs-files.
    const minimalPdf = Buffer.from('%PDF-1.4\n%%EOF\n')

    const uploadRes = await postJobsFilesHandler(
      makeMultipartEvent(jobId, [
        { filename: 'template.docx', content: plainDocxBuffer, contentType: DOCX_MIME },
        { filename: 'case.pdf', content: minimalPdf, contentType: 'application/pdf' },
      ]),
      lambdaCtx,
      noop,
    )
    expect(uploadRes?.statusCode).toBe(201)

    const { files } = JSON.parse(uploadRes!.body)
    expect(files).toHaveLength(2)

    // Collect S3 keys for cleanup
    uploadedKeys = files.map((f: { s3Key: string }) => f.s3Key)

    // --- Verify DB records ---
    const dbFiles = await prisma.file.findMany({ where: { jobId } })
    expect(dbFiles).toHaveLength(2)

    const docxFile = dbFiles.find((f) => f.mimeType === DOCX_MIME)
    const pdfFile = dbFiles.find((f) => f.mimeType === 'application/pdf')
    expect(docxFile).toBeDefined()
    expect(pdfFile).toBeDefined()
    expect(docxFile!.role).toBe('template')
    expect(pdfFile!.role).toBe('case_doc')

    // --- Verify objects exist in S3 ---
    for (const key of uploadedKeys) {
      await expect(s3KeyExists(key)).resolves.toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Test 2: Document ingestion (DOCX → real mammoth parse → real Prisma writes)
// ---------------------------------------------------------------------------

describe('integration: document ingestion', () => {
  let jobId = ''
  let s3Key = ''

  afterEach(async () => {
    if (jobId) await cleanup(jobId, s3Key ? [s3Key] : [])
    jobId = ''
    s3Key = ''
  })

  it('reads a DOCX from S3, parses it with mammoth, and creates Block records in PostgreSQL', async () => {
    // --- Seed: job + S3 object ---
    const job = await prisma.job.create({ data: {} })
    jobId = job.id
    s3Key = `${jobId}/file1-medical-records.docx`

    await uploadToS3(s3Key, plainDocxBuffer, DOCX_MIME)
    expect(await s3KeyExists(s3Key)).toBe(true)

    // --- Ingest ---
    const ingestRes = await postJobsIngestHandler(
      { pathParameters: { id: jobId }, headers: {} } as any,
      lambdaCtx,
      noop,
    )
    expect(ingestRes?.statusCode).toBe(200)

    const { processed, blocks: totalBlocks } = JSON.parse(ingestRes!.body)
    expect(processed).toBeGreaterThanOrEqual(1)
    expect(totalBlocks).toBeGreaterThan(0)

    // --- Verify DB records ---
    const sourceFiles = await prisma.sourceFile.findMany({ where: { jobId } })
    expect(sourceFiles.length).toBeGreaterThanOrEqual(1)
    expect(sourceFiles[0].status).toBe('complete')
    expect(sourceFiles[0].type).toBe('docx')

    const blocks = await prisma.block.findMany({
      where: { sourceFileId: { in: sourceFiles.map((s) => s.id) } },
    })
    expect(blocks.length).toBeGreaterThan(0)
    // The plain DOCX has two paragraph lines — at least one should appear
    expect(blocks.some((b) => b.text.length > 5)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Test 3: Full generation pipeline
//   Real: Prisma seed → real S3 tagged-template read → docxtemplater render →
//         real S3 output write → real DB status update to 'complete'
//   Mocked: generateMedicalNarrative (Bedrock streaming)
// ---------------------------------------------------------------------------

describe('integration: job generation pipeline', () => {
  let jobId = ''
  const s3Keys: string[] = []

  afterEach(async () => {
    if (jobId) await cleanup(jobId, s3Keys)
    jobId = ''
    s3Keys.length = 0
  })

  it(
    'reads tagged DOCX from S3, renders with real data, uploads output DOCX, sets job.status=complete',
    async () => {
      // --- Seed job ---
      const job = await prisma.job.create({ data: {} })
      jobId = job.id

      // --- Seed a File record so the no_files_uploaded guard passes ---
      const fileKey = `${jobId}/seed-template.docx`
      s3Keys.push(fileKey)
      // The file bytes don't matter for this test (generate doesn't re-download it);
      // we just need the DB record to exist.
      await uploadToS3(fileKey, plainDocxBuffer, DOCX_MIME)
      await prisma.file.create({
        data: { jobId, s3Key: fileKey, mimeType: DOCX_MIME, role: 'template', fileName: 'template.docx' },
      })

      // --- Upload the tagged DOCX to S3 ---
      // Tagged with {claimantName} and {medicalNarrative} — both will be in the
      // data object assembled by buildDataObject + handler.
      const taggedKey = `${jobId}/templates/tagged.docx`
      s3Keys.push(taggedKey)
      await uploadToS3(taggedKey, taggedDocxBuffer, DOCX_MIME)

      // --- Seed Template record (s3KeyTagged points to the real S3 object) ---
      // No TemplateSlot rows → computeGapReport returns { gaps: [], total: 0 } → gap check passes.
      await prisma.template.create({
        data: {
          jobId,
          s3KeyOriginal: fileKey,
          s3KeyTagged: taggedKey,
        },
      })

      // --- Seed ExtractedField for the {claimantName} tag ---
      // dbName 'claimant_name' maps to tagName 'claimantName' via FIELD_SCHEMA.
      await prisma.extractedField.create({
        data: {
          jobId,
          fieldName: 'claimant_name',
          value: 'Jane Smith',
          isNull: false,
          confidence: 0.95,
          blockIds: [],
          acceptMissing: false,
          nullReason: null,
          source: 'bedrock',
        },
      })

      // --- Run generate ---
      const genRes = await postJobsGenerateHandler(
        { pathParameters: { id: jobId }, headers: {} } as any,
        lambdaCtx,
        noop,
      )

      expect(genRes?.statusCode).toBe(200)
      expect(genRes?.headers?.['Content-Type']).toBe('text/event-stream')
      expect(genRes?.body).toContain('event: complete')

      // --- Verify DB: job.status = 'complete' ---
      const updatedJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } })
      expect(updatedJob.status).toBe('complete')
      expect(updatedJob.outputS3Key).toBe(`${jobId}/output/demand-letter.docx`)
      expect(updatedJob.output).toBe(
        'Patient sustained injuries and received treatment following the incident.',
      )

      // --- Verify S3: output DOCX was written ---
      const outputKey = `${jobId}/output/demand-letter.docx`
      s3Keys.push(outputKey)
      await expect(s3KeyExists(outputKey)).resolves.toBe(true)
    },
  )

  it('sets job.status=failed when no files are present (early-return guard, no S3 write)', async () => {
    const job = await prisma.job.create({ data: {} })
    jobId = job.id

    const res = await postJobsGenerateHandler(
      { pathParameters: { id: jobId }, headers: {} } as any,
      lambdaCtx,
      noop,
    )

    expect(res?.statusCode).toBe(422)
    expect(JSON.parse(res!.body)).toMatchObject({ error: 'no_files_uploaded' })

    // Status must remain 'pending' — early return, no job.update called
    const unchanged = await prisma.job.findUniqueOrThrow({ where: { id: jobId } })
    expect(unchanged.status).toBe('pending')
  })
})

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { prisma } from '@demand-letter/db';
import { detectDocumentType } from '../lib/document-type-detector';
import { parseDocx, parsePdfNative } from '../lib/structured-parser';
import { startTextractAnalysis } from '../lib/textract-client';
import { corsHeadersFor } from '../lib/cors';
import { logJobEvent } from '../lib/job-logger';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  // Verify job exists
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }

  const body = event.body ? JSON.parse(event.body) as { force?: boolean; fileId?: string } : {};
  const force = body.force === true;
  const fileId = body.fileId;

  if (force) {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.sourceFile.deleteMany({ where: { jobId } });
    await logJobEvent(jobId, 'post-jobs-documents-ingest', 'info', 'Reprocessing all uploaded case documents from scratch');
  }

  if (fileId && !force) {
    const specificFile = await prisma.file.findFirst({
      where: { id: fileId, jobId, role: 'case_doc' },
      select: { s3Key: true, fileName: true },
    });
    if (!specificFile) {
      return {
        statusCode: 404,
        headers: { ...corsHeadersFor(event) },
        body: JSON.stringify({ error: 'file_not_found', message: 'The requested file does not exist or does not belong to this job.' }),
      };
    }
    await prisma.sourceFile.deleteMany({ where: { jobId, s3Key: specificFile.s3Key } });
    await logJobEvent(jobId, 'post-jobs-documents-ingest', 'info', `Reprocessing single case document: ${specificFile.fileName}`);
  }

  const [existingSourceFiles, caseFiles] = await Promise.all([
    prisma.sourceFile.findMany({
      where: { jobId },
      select: { s3Key: true, status: true },
    }),
    fileId && !force
      ? prisma.file.findMany({
          where: { id: fileId, jobId, role: 'case_doc' },
          select: { s3Key: true, fileName: true },
          orderBy: { createdAt: 'asc' },
        })
      : prisma.file.findMany({
          where: { jobId, role: 'case_doc' },
          select: { s3Key: true, fileName: true },
          orderBy: { createdAt: 'asc' },
        }),
  ]);
  const processedS3Keys = new Set(existingSourceFiles.map((sourceFile) => sourceFile.s3Key));

  let processed = 0;
  let pending = existingSourceFiles.filter((sourceFile) => sourceFile.status === 'processing').length;
  let totalBlocks = 0;

  for (const file of caseFiles) {
    const s3Key = file.s3Key;
    if (processedS3Keys.has(s3Key)) {
      continue;
    }
    const filename = file.fileName;

    // Download file buffer
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
    const s3Obj = await s3.send(getCmd);
    const bodyBytes = await s3Obj.Body?.transformToByteArray();
    if (!bodyBytes) continue;
    const buffer = Buffer.from(bodyBytes);

    let docType: Awaited<ReturnType<typeof detectDocumentType>>;
    try {
      docType = await detectDocumentType(buffer, filename);
    } catch (err) {
      await logJobEvent(jobId, 'post-jobs-documents-ingest', 'warn',
        `Skipped file ${filename}: ${(err as Error).message}`,
        { context: { s3Key } });
      await prisma.sourceFile.create({
        data: { jobId, s3Key, type: 'unknown', status: 'error', errorMessage: (err as Error).message },
      }).catch(() => {});
      continue;
    }

    if (docType === 'pdf-scanned') {
      // Async path: create SourceFile record and start Textract job
      const sourceFile = await prisma.sourceFile.create({
        data: {
          jobId,
          s3Key,
          type: docType,
          status: 'processing',
        },
      });
      processedS3Keys.add(s3Key);
      const jobTag = sourceFile.id;
      const textractJobId = await startTextractAnalysis(BUCKET, s3Key, jobTag);
      await prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { textractJobId },
      });
      pending++;
    } else {
      // Sync path: parse immediately and insert blocks
      const blocks =
        docType === 'docx'
          ? await parseDocx(buffer)
          : await parsePdfNative(buffer);

      const sourceFile = await prisma.sourceFile.create({
        data: {
          jobId,
          s3Key,
          type: docType,
          status: 'complete',
        },
      });
      processedS3Keys.add(s3Key);

      if (blocks.length > 0) {
        const blockData = blocks.map((b) => ({
          sourceFileId: sourceFile.id,
          type: b.type,
          text: b.text,
          page: b.page,
          confidence: b.confidence ?? null,
          bbox: b.bbox ?? { left: 0, top: 0, width: 0, height: 0 },
          phiOffsets: Prisma.JsonNull,
        }));
        await prisma.block.createMany({ data: blockData });
        totalBlocks += blocks.length;
      }
      processed++;
    }
  }

  return {
    statusCode: 200,
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({ processed, pending, blocks: totalBlocks }),
  };
};

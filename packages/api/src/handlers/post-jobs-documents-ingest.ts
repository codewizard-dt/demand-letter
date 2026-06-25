import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { prisma } from '@demand-letter/db';
import { detectDocumentType } from '../lib/document-type-detector';
import { parseDocx, parsePdfNative } from '../lib/structured-parser';
import { startTextractAnalysis } from '../lib/textract-client';
import { corsHeaders } from '../lib/cors';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...corsHeaders }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  // Verify job exists
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...corsHeaders }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }

  // List uploaded files from S3 under the job prefix
  const listCmd = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `${jobId}/`,
  });
  const listed = await s3.send(listCmd);
  const objects = listed.Contents ?? [];

  let processed = 0;
  let pending = 0;
  let totalBlocks = 0;

  for (const obj of objects) {
    const s3Key = obj.Key!;
    const filename = s3Key.split('/').pop() ?? s3Key;

    // Download file buffer
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
    const s3Obj = await s3.send(getCmd);
    const bodyBytes = await s3Obj.Body?.transformToByteArray();
    if (!bodyBytes) continue;
    const buffer = Buffer.from(bodyBytes);

    let docType: Awaited<ReturnType<typeof detectDocumentType>>;
    try {
      docType = await detectDocumentType(buffer, filename);
    } catch {
      // Skip unsupported file types (e.g. output/ prefix files)
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ processed, pending, blocks: totalBlocks }),
  };
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@demand-letter/db';
import * as parser from 'lambda-multipart-parser';
import { corsHeadersFor } from '../lib/cors';
import { errorResponse } from '../lib/error-response';
import { logJobEvent } from '../lib/job-logger';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
]);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return {
        statusCode: 400,
        headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' })
      };
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return {
        statusCode: 404,
        headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' })
      };
    }

    const result = await parser.parse(event);
    const files = result.files;

    if (!files?.length) {
      return {
        statusCode: 400,
        headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'no_files_uploaded', message: 'At least one file is required.' })
      };
    }

    const created = [];
    for (const file of files) {
      const mime = file.contentType;
      if (!ALLOWED_MIME.has(mime)) {
        return {
          statusCode: 415,
          headers: { ...corsHeadersFor(event) },
          body: JSON.stringify({ error: 'unsupported_file_type', message: `File type '${mime}' is not accepted. Only PDF and DOCX files are allowed.` }),
        };
      }
      const role = mime.includes('wordprocessingml') ? ('template' as const) : ('case_doc' as const);
      const contentBuffer = Buffer.from(file.content);
      const contentHash = createHash('sha256').update(contentBuffer).digest('hex');

      const reusableFile = await prisma.file.findFirst({
        where: { contentHash },
        orderBy: { createdAt: 'asc' },
      });
      if (reusableFile) {
        const record = await prisma.file.create({
          data: { jobId, contentHash, s3Key: reusableFile.s3Key, mimeType: mime, role, fileName: file.filename },
        });
        if (role === 'case_doc') {
          await logJobEvent(jobId, 'post-jobs-files', 'info', `Case document uploaded: ${file.filename}`, {
            context: {
              fileId: record.id,
              s3Key: record.s3Key,
              mimeType: mime,
              reusedContent: true,
            },
          });
        }
        created.push(record);
        continue;
      }

      const fileId = randomUUID();
      const s3Key = `${jobId}/${fileId}-${file.filename}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          Body: contentBuffer,
          ContentType: mime,
        }),
      );

      const record = await prisma.file.create({
        data: { jobId, contentHash, s3Key, mimeType: mime, role, fileName: file.filename },
      });
      if (role === 'case_doc') {
        await logJobEvent(jobId, 'post-jobs-files', 'info', `Case document uploaded: ${file.filename}`, {
          context: {
            fileId: record.id,
            s3Key: record.s3Key,
            mimeType: mime,
            reusedContent: false,
          },
        });
      }
      created.push(record);
    }

    return {
      statusCode: 201,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: created }),
    };
  } catch (err) {
    console.error('post-jobs-files error', err);
    return errorResponse(event, 500, 'internal_server_error', err);
  }
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '@demand-letter/db';
import * as parser from 'lambda-multipart-parser';
import { getCorsHeaders } from '../lib/cors';

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
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }

  const result = await parser.parse(event);
  const files = result.files;

  if (!files?.length) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'no_files_uploaded', message: 'At least one file is required.' }) };
  }

  const created = [];
  for (const file of files) {
    const mime = file.contentType;
    if (!ALLOWED_MIME.has(mime)) {
      return {
        statusCode: 415,
      headers: { ...getCorsHeaders(event.headers?.['origin']) },
        body: JSON.stringify({ error: 'unsupported_file_type', message: `File type '${mime}' is not accepted. Only PDF and DOCX files are allowed.` }),
      };
    }
    const role = mime.includes('wordprocessingml') ? ('template' as const) : ('case_doc' as const);
    const fileId = crypto.randomUUID();
    const s3Key = `${jobId}/${fileId}-${file.filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.content,
        ContentType: mime,
      }),
    );

    const record = await prisma.file.create({
      data: { jobId, s3Key, mimeType: mime, role, fileName: file.filename },
    });
    created.push(record);
  }

  return {
    statusCode: 201,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: created }),
  };
  } catch (err) {
    console.error('post-jobs-files error', err);
    return { statusCode: 500, headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

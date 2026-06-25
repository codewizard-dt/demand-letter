import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '@demand-letter/db';
import * as parser from 'lambda-multipart-parser';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
]);

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  }

  const result = await parser.parse(event);
  const files = result.files;

  if (!files?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No files uploaded' }) };
  }

  const created = [];
  for (const file of files) {
    const mime = file.contentType;
    if (!ALLOWED_MIME.has(mime)) {
      return {
        statusCode: 415,
        body: JSON.stringify({ error: `Unsupported file type: ${mime}` }),
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: created }),
  };
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
    };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return {
      statusCode: 404,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }),
    };
  }
  if (!job.outputS3Key) {
    return {
      statusCode: 404,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'output_not_ready', message: 'Document generation has not completed yet.' }),
    };
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key });
  const url = await getSignedUrl(s3, command, { expiresIn: 900 });

  return {
    statusCode: 200,
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  };
  } catch (err) {
    console.error('output error', err);
    return { statusCode: 500, headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

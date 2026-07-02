import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const jobId = event.pathParameters?.id;
    const templateId = event.pathParameters?.templateId;

    if (!jobId || !templateId) {
      return {
        statusCode: 400,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both jobId and templateId are required.' }),
      };
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { jobId: true, s3KeyOriginal: true },
    });

    if (!template || template.jobId !== jobId) {
      return {
        statusCode: 404,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'template_not_found', message: 'The requested template does not exist.' }),
      };
    }

    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
    const bytes = await s3Obj.Body?.transformToByteArray();
    if (!bytes) {
      return {
        statusCode: 502,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 's3_empty_response', message: 'The S3 object returned no content.' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeadersFor(event),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'inline; filename="template.docx"',
      },
      isBase64Encoded: true,
      body: Buffer.from(bytes).toString('base64'),
    };
  } catch (err) {
    console.error('template original docx error', err);
    return {
      statusCode: 500,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }),
    };
  }
};

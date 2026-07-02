import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import mammoth from 'mammoth';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';
import { extractDocxStationaries } from '../lib/docx-stationary';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

const DOCX_STYLE_MAP = [
  "p[style-name='Boilerplate'] => p.boilerplate-zone:fresh",
  "r[style-name='Boilerplate'] => span.boilerplate-zone",
  "p[style-name='Normal'] => p.docx-paragraph:fresh",
  "p[style-name='List Paragraph'] => p.docx-list-paragraph:fresh",
  "p[style-name='Title'] => h1.docx-title:fresh",
  "p[style-name='Heading 1'] => h1.docx-heading-1:fresh",
  "p[style-name='Heading 2'] => h2.docx-heading-2:fresh",
  "p[style-name='Heading 3'] => h3.docx-heading-3:fresh",
];

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

    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key }));
    if (!s3Obj.Body) {
      return {
        statusCode: 500,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'output_empty', message: 'The generated DOCX has no content.' }),
      };
    }

    const bytes = await s3Obj.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);
    const stationaries = extractDocxStationaries(buffer);
    const { value: html } = await mammoth.convertToHtml(
      { buffer },
      {
        ignoreEmptyParagraphs: false,
        styleMap: DOCX_STYLE_MAP,
      },
    );

    return {
      statusCode: 200,
      headers: {
        ...corsHeadersFor(event),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html, stationaries }),
    };
  } catch (err) {
    console.error('output docx preview error', err);
    return {
      statusCode: 500,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }),
    };
  }
};

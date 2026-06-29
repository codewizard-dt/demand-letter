import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import mammoth from 'mammoth';
import { prisma } from '@demand-letter/db';
import { getCorsHeaders } from '../lib/cors';
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
    const templateId = event.pathParameters?.templateId;

    if (!jobId || !templateId) {
      return {
        statusCode: 400,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
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
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'template_not_found', message: 'The requested template does not exist.' }),
      };
    }

    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
    const bytes = await s3Obj.Body?.transformToByteArray();
    if (!bytes) {
      return {
        statusCode: 502,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 's3_empty_response', message: 'The S3 object returned no content.' }),
      };
    }

    const buffer = Buffer.from(bytes);
    const stationaries = extractDocxStationaries(buffer);
    const { value: html } = await mammoth.convertToHtml(
      { buffer },
      { ignoreEmptyParagraphs: false, styleMap: DOCX_STYLE_MAP },
    );

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, stationaries }),
    };
  } catch (err) {
    console.error('template original preview error', err);
    return {
      statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }),
    };
  }
};

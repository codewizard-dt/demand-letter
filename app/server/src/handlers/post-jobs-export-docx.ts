import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { Packer } from 'docx';
import { prosemirrorToDocx, type ProseMirrorDoc } from '../lib';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return {
        statusCode: 400,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
      };
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'invalid_request_body', message: 'The request body is malformed or missing required fields.' }),
      };
    }

    const doc = body.doc as ProseMirrorDoc | undefined;
    if (!doc) {
      return {
        statusCode: 400,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'missing_document', message: 'No document provided in the request.' }),
      };
    }

    // Look up the job
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return {
        statusCode: 404,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }),
      };
    }

    // Convert ProseMirror to docx Document
    const document = prosemirrorToDocx(doc);

    // Serialize to buffer
    const buffer = await Packer.toBuffer(document);

    // Return base64-encoded binary response
    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event.headers?.['origin']),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="demand-letter.docx"',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('export docx error', err);
    return {
      statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error' }),
    };
  }
};

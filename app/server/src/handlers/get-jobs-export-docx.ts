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

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return {
        statusCode: 404,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }),
      };
    }
    if (!job.output) {
      return {
        statusCode: 422,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'output_not_ready', message: 'No generated output found for this job.' }),
      };
    }

    // Parse stored output as ProseMirror JSON; fall back to a plain paragraph wrapper
    let doc: ProseMirrorDoc;
    try {
      doc = JSON.parse(job.output) as ProseMirrorDoc;
    } catch {
      doc = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: job.output }] }],
      };
    }

    const document = prosemirrorToDocx(doc);
    const buffer = await Packer.toBuffer(document);

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
    console.error('get export docx error', err);
    return {
      statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error' }),
    };
  }
};

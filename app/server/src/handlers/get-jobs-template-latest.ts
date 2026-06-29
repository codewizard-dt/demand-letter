import type { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;

  if (!jobId) {
    return {
      statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
    };
  }

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return {
        statusCode: 404,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }),
      };
    }

    const template = await prisma.template.findFirst({
      where: { jobId },
      orderBy: { ingestedAt: 'desc' },
      select: { id: true, slotCount: true, ingestedAt: true },
    });

    if (!template) {
      return {
        statusCode: 404,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'template_not_found', message: 'No template has been ingested for this job.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        slotCount: template.slotCount,
        ingestedAt: template.ingestedAt.toISOString(),
      }),
    };
  } catch (err) {
    console.error('get-latest-template error', err);
    return {
      statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }),
    };
  }
};

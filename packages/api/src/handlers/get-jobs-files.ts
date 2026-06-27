import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
    };
  }

  try {
    const files = await prisma.file.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    };
  } catch (err) {
    console.error('get-jobs-files error', err);
    return {
      statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }),
    };
  }
};

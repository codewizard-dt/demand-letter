import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { getCorsHeaders } from '../lib/cors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  const refinements = await prisma.refinement.findMany({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      instruction: true,
      scope: true,
      accepted: true,
      createdAt: true,
    },
  });

  return {
    statusCode: 200,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify({ refinements }),
  };
  } catch (err) {
    console.error('refinements error', err);
    return { statusCode: 500, headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

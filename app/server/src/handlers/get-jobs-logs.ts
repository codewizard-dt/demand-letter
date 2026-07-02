import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';
import { errorResponse } from '../lib/error-response';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
    };
  }

  try {
    const logs = await prisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      statusCode: 200,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs }),
    };
  } catch (err) {
    console.error('get-jobs-logs error', err);
    return errorResponse(event, 500, 'internal_server_error', err);
  }
};

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { randomUUID } from 'node:crypto';
import { getCorsHeaders } from '../lib/cors';
import { runExtractionJob } from '../lib/extraction-job';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
  const trace = {
    requestId: event.requestContext?.requestId,
    traceId: randomUUID(),
  };
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }

  // userId comes from Cognito authorizer context; fall back to system for now
  const userId =
    ((event.requestContext as unknown as Record<string, unknown>)?.authorizer as Record<string, unknown>)?.['sub'] as string ??
    'system';

  void runExtractionJob({ jobId, userId, trace });

  return {
    statusCode: 202,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      status: 'processing',
      traceId: trace.traceId,
    }),
  };
};

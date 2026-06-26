import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { runGroundedExtraction } from '../lib/extraction-service';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
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

  try {
    await runGroundedExtraction(jobId, userId);

    const fieldCount = await prisma.extractedField.count({ where: { jobId } });
    const nullCount = await prisma.extractedField.count({
      where: { jobId, isNull: true },
    });

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        totalFields: fieldCount,
        filledFields: fieldCount - nullCount,
        nullFields: nullCount,
      }),
    };
  } catch (err) {
    console.error('Extraction failed', err);
    return {
      statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']) },
      body: JSON.stringify({ error: 'Extraction failed', message: (err as Error).message }),
    };
  }
};

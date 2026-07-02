import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { prisma } from '@demand-letter/db';
import { randomUUID } from 'node:crypto';
import { corsHeadersFor } from '../lib/cors';
import { runExtractionJob } from '../lib/extraction-job';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

interface InternalExtractionEvent {
  source: 'demand-letter.extraction';
  jobId: string;
  userId: string;
  trace: {
    requestId?: string;
    traceId?: string;
  };
}

function isInternalExtractionEvent(event: unknown): event is InternalExtractionEvent {
  return Boolean(
    event &&
      typeof event === 'object' &&
      (event as { source?: unknown }).source === 'demand-letter.extraction' &&
      typeof (event as { jobId?: unknown }).jobId === 'string',
  );
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (isInternalExtractionEvent(event)) {
    await runExtractionJob({
      jobId: event.jobId,
      userId: event.userId,
      trace: event.trace,
    });

    return {
      statusCode: 202,
      body: JSON.stringify({ status: 'accepted' }),
    };
  }

  const jobId = event.pathParameters?.id;
  const trace = {
    requestId: event.requestContext?.requestId,
    traceId: randomUUID(),
  };
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }

  // userId comes from Cognito authorizer context; fall back to system for now
  const userId =
    ((event.requestContext as unknown as Record<string, unknown>)?.authorizer as Record<string, unknown>)?.['sub'] as string ??
    'system';

  await lambda.send(new InvokeCommand({
    FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify({
      source: 'demand-letter.extraction',
      jobId,
      userId,
      trace,
    } satisfies InternalExtractionEvent)),
  }));

  return {
    statusCode: 202,
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      status: 'processing',
      traceId: trace.traceId,
    }),
  };
};

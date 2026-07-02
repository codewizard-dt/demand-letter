import { APIGatewayProxyHandler } from 'aws-lambda';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { prisma } from '@demand-letter/db';
import { randomUUID } from 'node:crypto';
import { corsHeadersFor } from '../lib/cors';
import { runTemplateClassificationJob } from '../lib/template-classification-job';

const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

interface InternalClassificationEvent {
  source: 'demand-letter.template-classification';
  jobId: string;
  templateId: string;
  trace: {
    requestId?: string;
    traceId?: string;
  };
}

function isInternalClassificationEvent(event: unknown): event is InternalClassificationEvent {
  return Boolean(
    event &&
      typeof event === 'object' &&
      (event as { source?: unknown }).source === 'demand-letter.template-classification' &&
      typeof (event as { jobId?: unknown }).jobId === 'string' &&
      typeof (event as { templateId?: unknown }).templateId === 'string',
  );
}

export const handler: APIGatewayProxyHandler = async (event) => {
  if (isInternalClassificationEvent(event)) {
    await runTemplateClassificationJob({
      jobId: event.jobId,
      templateId: event.templateId,
      userId: 'system',
      trace: event.trace,
    });

    return {
      statusCode: 202,
      body: JSON.stringify({ status: 'accepted' }),
    };
  }

  const jobId = event.pathParameters?.id;
  const templateId = event.pathParameters?.templateId;
  const trace = {
    requestId: event.requestContext?.requestId,
    traceId: randomUUID(),
  };

  if (!jobId || !templateId) {
    return { statusCode: 400,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both jobId and templateId are required.' }) };
  }

  const zoneCount = await prisma.zone.count({ where: { templateId } });
  if (zoneCount === 0) {
    return { statusCode: 404,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'no_zones_found', message: 'The template has no classified zones. Run classify first.' }) };
  }

  await lambda.send(new InvokeCommand({
    FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify({
      source: 'demand-letter.template-classification',
      jobId,
      templateId,
      trace,
    } satisfies InternalClassificationEvent)),
  }));

  return {
    statusCode: 202,
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, templateId, status: 'processing', traceId: trace.traceId }),
  };
};

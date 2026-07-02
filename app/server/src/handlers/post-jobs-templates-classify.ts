import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { randomUUID } from 'node:crypto';
import { corsHeadersFor } from '../lib/cors';
import { runTemplateClassificationJob } from '../lib/template-classification-job';

export const handler: APIGatewayProxyHandler = async (event) => {
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

  void runTemplateClassificationJob({ jobId, templateId, userId: 'system', trace });

  return {
    statusCode: 202,
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, templateId, status: 'processing', traceId: trace.traceId }),
  };
};

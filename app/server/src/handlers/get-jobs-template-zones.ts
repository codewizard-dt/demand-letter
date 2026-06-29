import { prisma } from '@demand-letter/db';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
  const jobId = event.pathParameters?.id;
  const templateId = event.pathParameters?.templateId;

  if (!jobId || !templateId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both jobId and templateId are required.' }) };
  }

  const zones = await prisma.zone.findMany({
    where: { templateId },
    orderBy: { zoneIndex: 'asc' },
  });

  return {
    statusCode: 200,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify(zones),
  };
  } catch (err) {
    console.error('template-zones error', err);
    return { statusCode: 500, headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

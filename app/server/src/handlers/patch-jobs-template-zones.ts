import { prisma } from '@demand-letter/db';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { getCorsHeaders } from '../lib/cors';

type ZonePatch = {
  id: string;
  type: string;
  suggestedFieldName: string | null;
  confirmed: boolean;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  const templateId = event.pathParameters?.templateId;

  if (!jobId || !templateId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both jobId and templateId are required.' }) };
  }

  let zones: ZonePatch[];
  try {
    const body = JSON.parse(event.body ?? '{}');
    zones = body.zones;
    if (!Array.isArray(zones)) throw new Error('zones must be an array');
  } catch {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'invalid_request_body', message: 'The request body is malformed or missing required fields.' }) };
  }

  const updated = await Promise.all(
    zones.map((z) =>
      prisma.zone.update({
        where: { id: z.id },
        data: {
          type: z.type as 'boilerplate_verbatim' | 'variable_populated' | null,
          suggestedFieldName: z.suggestedFieldName,
          confirmed: z.confirmed,
          confirmedBy: 'attorney',
          confirmedAt: new Date(),
        },
      }),
    ),
  );

  return {
    statusCode: 200,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  };
};

import { prisma } from '@demand-letter/db';
import { APIGatewayProxyHandler } from 'aws-lambda';

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
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing jobId or templateId' }) };
  }

  let zones: ZonePatch[];
  try {
    const body = JSON.parse(event.body ?? '{}');
    zones = body.zones;
    if (!Array.isArray(zones)) throw new Error('zones must be an array');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  };
};

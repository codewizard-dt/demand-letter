import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { classifyZones } from '../lib/zone-classifier';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  const templateId = event.pathParameters?.templateId;

  if (!jobId || !templateId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing jobId or templateId' }) };
  }

  const zones = await prisma.zone.findMany({
    where: { templateId },
    orderBy: { zoneIndex: 'asc' },
  });

  if (!zones.length) {
    return { statusCode: 404, body: JSON.stringify({ error: 'No zones found for template' }) };
  }

  let classifications;
  try {
    classifications = await classifyZones(zones, 'system');
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { statusCode: 502, body: JSON.stringify({ error: 'LLM returned invalid JSON' }) };
    }
    throw err;
  }

  const zoneMap = new Map(zones.map(z => [z.zoneIndex, z.id]));

  const updated = await Promise.all(
    classifications.map(c => {
      const id = zoneMap.get(c.zoneIndex);
      if (!id) return null;
      return prisma.zone.update({
        where: { id },
        data: { type: c.type, suggestedFieldName: c.suggestedFieldName },
      });
    }),
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated.filter(Boolean)),
  };
};

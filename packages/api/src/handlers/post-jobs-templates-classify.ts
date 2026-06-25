import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { classifyZones } from '../lib/zone-classifier';
import { corsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  const templateId = event.pathParameters?.templateId;

  if (!jobId || !templateId) {
    return { statusCode: 400,
      headers: { ...corsHeaders }, body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both jobId and templateId are required.' }) };
  }

  const zones = await prisma.zone.findMany({
    where: { templateId },
    orderBy: { zoneIndex: 'asc' },
  });

  if (!zones.length) {
    return { statusCode: 404,
      headers: { ...corsHeaders }, body: JSON.stringify({ error: 'no_zones_found', message: 'The template has no classified zones. Run classify first.' }) };
  }

  let classifications;
  try {
    classifications = await classifyZones(zones, 'system');
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { statusCode: 502,
      headers: { ...corsHeaders }, body: JSON.stringify({ error: 'llm_invalid_json', message: 'The LLM returned an unparseable response. Please retry.' }) };
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(updated.filter(Boolean)),
  };
};

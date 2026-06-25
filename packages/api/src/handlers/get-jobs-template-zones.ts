import { prisma } from '@demand-letter/db';
import { APIGatewayProxyHandler } from 'aws-lambda';

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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zones),
  };
};

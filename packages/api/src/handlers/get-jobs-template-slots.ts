import type { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async (event) => {
  const templateId = event.pathParameters?.templateId;
  const jobId = event.pathParameters?.id;

  if (!templateId || !jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing path parameters' }) };
  }

  try {
    // Verify template belongs to job
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, jobId: true, slotCount: true },
    });

    if (!template || template.jobId !== jobId) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Template not found' }) };
    }

    const slots = await prisma.templateSlot.findMany({
      where: { templateId },
      orderBy: { slotName: 'asc' },
      select: { slotName: true, required: true },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotCount: template.slotCount ?? slots.length,
        slots,
      }),
    };
  } catch (err) {
    console.error('get-slots error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

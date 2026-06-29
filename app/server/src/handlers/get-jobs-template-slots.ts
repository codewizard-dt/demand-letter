import type { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { getCorsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  const templateId = event.pathParameters?.templateId;
  const jobId = event.pathParameters?.id;

  if (!templateId || !jobId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_path_parameters', message: 'Required path parameters are missing.' }) };
  }

  try {
    // Verify template belongs to job
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, jobId: true, slotCount: true },
    });

    if (!template || template.jobId !== jobId) {
      return { statusCode: 404,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'template_not_found', message: 'The requested template does not exist.' }) };
    }

    const slots = await prisma.templateSlot.findMany({
      where: { templateId },
      orderBy: { slotName: 'asc' },
      select: { slotName: true, required: true },
    });

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotCount: template.slotCount ?? slots.length,
        slots,
      }),
    };
  } catch (err) {
    console.error('get-slots error', err);
    return { statusCode: 500,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

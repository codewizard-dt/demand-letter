import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeaders } from '../lib/cors';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return { statusCode: 400,
        headers: { ...corsHeaders }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
    }
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { statusCode: 404,
        headers: { ...corsHeaders }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
    }
    const fields = await prisma.extractedField.findMany({
    where: { jobId },
    select: {
      fieldName: true,
      value: true,
      blockIds: true,
      confidence: true,
      isNull: true,
      source: true,
      nullReason: true,
      acceptMissing: true,
    },
    orderBy: { fieldName: 'asc' },
  });
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  };
  } catch (err) {
    console.error('fields error', err);
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

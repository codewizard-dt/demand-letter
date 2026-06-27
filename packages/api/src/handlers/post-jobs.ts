import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeaders } from '../lib/cors';
import { errorResponse } from '../lib/error-response';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const job = await prisma.job.create({ data: {} });
    return {
      statusCode: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id }),
    };
  } catch (err) {
    console.error('post-jobs error', err);
    return errorResponse(undefined, 500, 'internal_server_error', err);
  }
};

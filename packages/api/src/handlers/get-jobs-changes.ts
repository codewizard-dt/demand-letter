import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeaders } from '../lib/cors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
    };
  }

  const changes = await prisma.collaborativeChange.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      userName: true,
      operationType: true,
      contentDelta: true,
      createdAt: true,
    },
  });

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes }),
  };
};

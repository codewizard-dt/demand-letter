import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeaders } from '../lib/cors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobId = event.pathParameters?.id;
  const changeId = event.pathParameters?.changeId;

  if (!jobId || !changeId) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both job ID and change ID are required.' }),
    };
  }

  await prisma.collaborativeChange.delete({
    where: { id: changeId, jobId },
  });

  return {
    statusCode: 204,
    headers: { ...corsHeaders },
    body: '',
  };
};

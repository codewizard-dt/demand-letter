import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const jobId = event.pathParameters?.id;
    const changeId = event.pathParameters?.changeId;

    if (!jobId || !changeId) {
      return {
        statusCode: 400,
        headers: { ...corsHeadersFor(event) },
        body: JSON.stringify({ error: 'missing_path_parameters', message: 'Both job ID and change ID are required.' }),
      };
    }

    const change = await prisma.collaborativeChange.findUnique({
      where: { id: changeId },
    });

    if (!change) {
      return {
        statusCode: 404,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'change_not_found', message: 'The requested change does not exist.' }),
      };
    }

    if (change.jobId !== jobId) {
      return {
        statusCode: 403,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'change_job_mismatch', message: 'This change does not belong to the specified job.' }),
      };
    }

    await prisma.collaborativeChange.delete({
      where: { id: changeId },
    });

    return {
      statusCode: 200,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('delete-jobs-changes error', err);
    return {
      statusCode: 500,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }),
    };
  }
};

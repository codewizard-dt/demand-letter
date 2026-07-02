import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        createdAt: true,
        files: {
          select: { fileName: true, mimeType: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return {
      statusCode: 200,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs }),
    };
  } catch (err) {
    console.error('get-jobs error', err);
    return { statusCode: 500, headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

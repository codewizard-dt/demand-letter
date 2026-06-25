import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  if (job.status === 'processing' || job.status === 'pending') {
    return { statusCode: 202, body: JSON.stringify({ status: job.status }) };
  }
  if (job.status === 'failed') {
    return { statusCode: 500, body: JSON.stringify({ error: 'Generation failed' }) };
  }
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="demand-letter-${jobId}.txt"`,
    },
    body: job.output ?? '',
  };
};

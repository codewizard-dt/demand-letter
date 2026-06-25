import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async () => {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, status: true, createdAt: true },
  });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobs }),
  };
};

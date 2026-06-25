import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async () => {
  const job = await prisma.job.create({ data: {} });
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: job.id }),
  };
};

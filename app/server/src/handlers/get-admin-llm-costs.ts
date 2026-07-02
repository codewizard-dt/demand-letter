import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
  const days = parseInt(event.queryStringParameters?.days ?? '30', 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [aggregates, recentRows] = await Promise.all([
    prisma.llmAuditLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: cutoff } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      orderBy: { _sum: { estimatedCostUsd: 'desc' } },
    }),
    prisma.llmAuditLog.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        feature: true,
        model: true,
        provider: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        durationMs: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    statusCode: 200,
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({ aggregates, recentRows }),
  };
  } catch (err) {
    console.error('llm-costs error', err);
    return { statusCode: 500, headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

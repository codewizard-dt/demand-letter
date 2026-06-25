import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Prisma } from '@prisma/client';
import { prisma } from '@demand-letter/db';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };
  }

  // Verify job exists
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  }

  // Parse query parameters
  const qs = event.queryStringParameters ?? {};
  const page = Math.max(1, parseInt(qs['page'] ?? '1', 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(qs['limit'] ?? '100', 10) || 100));
  const filterType = qs['type'];
  const filterPage = qs['page_num'] ? parseInt(qs['page_num'], 10) : undefined;

  // Build where clause
  const where: Prisma.BlockWhereInput = {
    sourceFile: { jobId },
  };
  if (filterType) where.type = filterType;
  if (filterPage !== undefined && !isNaN(filterPage)) where.page = filterPage;

  const [blocks, totalCount] = await prisma.$transaction([
    prisma.block.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        sourceFileId: true,
        type: true,
        text: true,
        page: true,
        bbox: true,
        confidence: true,
        createdAt: true,
      },
    }),
    prisma.block.count({ where }),
  ]);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks,
      page,
      limit,
      totalCount,
      hasMore: page * limit < totalCount,
    }),
  };
};

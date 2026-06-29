import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { Prisma } from '@prisma/client';
import { prisma } from '@demand-letter/db';
import { redactText, type RedactableEntity } from '../lib/redact-text';
import { getCorsHeaders } from '../lib/cors';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  // Verify job exists
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
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
        phiOffsets: true,
      },
    }),
    prisma.block.count({ where }),
  ]);

  const callerRole = (event.headers?.['x-caller-role'] ?? event.headers?.['X-Caller-Role'] ?? 'developer').toLowerCase();
  const isAttorney = callerRole === 'attorney';

  const responseBlocks = blocks.map((block) => {
    const entities = (block.phiOffsets as RedactableEntity[] | null) ?? [];
    const text = isAttorney ? block.text : redactText(block.text, entities);
    const { phiOffsets: _omit, ...rest } = block;
    return { ...rest, text };
  });

  return {
    statusCode: 200,
    headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: responseBlocks,
      page,
      limit,
      totalCount,
      hasMore: page * limit < totalCount,
    }),
  };
  } catch (err) {
    console.error('blocks error', err);
    return { statusCode: 500, headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'internal_server_error', message: 'An unexpected error occurred.' }) };
  }
};

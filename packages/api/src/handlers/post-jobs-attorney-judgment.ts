import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

interface JudgmentBody {
  fields: { fieldName: string; value: string }[];
  acceptMissing?: string[];
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing job ID' }) };
  }
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  }

  let body: JudgmentBody;
  try {
    body = JSON.parse(event.body ?? '{}') as JudgmentBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // Upsert attorney-judgment fields
  for (const { fieldName, value } of body.fields ?? []) {
    await prisma.extractedField.upsert({
      where: { jobId_fieldName: { jobId, fieldName } },
      create: {
        jobId,
        fieldName,
        value,
        blockIds: [],
        confidence: 1.0,
        isNull: false,
        nullReason: null,
        source: 'attorney-judgment',
        acceptMissing: false,
      },
      update: {
        value,
        blockIds: [],
        confidence: 1.0,
        isNull: false,
        nullReason: null,
        source: 'attorney-judgment',
        updatedAt: new Date(),
      },
    });
  }

  // Mark accept-missing slots
  for (const fieldName of body.acceptMissing ?? []) {
    await prisma.extractedField.upsert({
      where: { jobId_fieldName: { jobId, fieldName } },
      create: {
        jobId,
        fieldName,
        value: null,
        blockIds: [],
        confidence: 0,
        isNull: true,
        nullReason: 'attorney accepted as missing',
        source: null,
        acceptMissing: true,
      },
      update: {
        acceptMissing: true,
        updatedAt: new Date(),
      },
    });
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};

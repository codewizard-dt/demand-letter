import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { corsHeadersFor } from '../lib/cors';

interface JudgmentBody {
  fields: { fieldName: string; value: string }[];
  acceptMissing?: string[];
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }

  let body: JudgmentBody;
  try {
    body = JSON.parse(event.body ?? '{}') as JudgmentBody;
  } catch {
    return { statusCode: 400,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'invalid_json_body', message: 'Request body must be valid JSON.' }) };
  }

  // Upsert user-provided fields
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
        source: 'user-provided',
        acceptMissing: false,
      },
      update: {
        value,
        blockIds: [],
        confidence: 1.0,
        isNull: false,
        nullReason: null,
        source: 'user-provided',
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
    headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { LlmFeature, prisma } from '@demand-letter/db';
import { invokeModelStream } from '../lib/ai-provider';
import { getCorsHeaders } from '../lib/cors';
import { errorResponse } from '../lib/error-response';

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? '';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  let instruction: string;
  let scope: string | undefined;
  try {
    const body = JSON.parse(event.body ?? '{}');
    instruction = body.instruction;
    scope = body.scope;
  } catch {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'invalid_json_body', message: 'Request body must be valid JSON.' }) };
  }

  if (!instruction) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_instruction', message: 'A refinement instruction is required.' }) };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }) };
  }
  if (!job.output) {
    return { statusCode: 422,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'Job output not yet generated' }) };
  }

  const relevantText = job.output;

  const extractedFields = await prisma.extractedField.findMany({ where: { jobId } });

  const system =
    'You are a legal writer refining a personal injury demand letter. Apply the attorney\'s instruction precisely. Every factual claim must reference only information present in the extracted fields provided. Return only the revised text — no explanation or preamble.';

  const scopeSuffix =
    scope && scope !== 'all'
      ? `\n\nScope: return only the revised text for the "${scope}" section.`
      : '';

  const userMessage =
    `## Current Letter Text\n${relevantText}\n\n` +
    `## Extracted Fields (grounding context)\n${extractedFields.map((f) => `${f.fieldName}: ${f.value ?? '(not found)'}`).join('\n')}\n\n` +
    `## Attorney Instruction\n${instruction}${scopeSuffix}\n\nApply the instruction and return the revised text now.`;

  try {
    const stream = await invokeModelStream({
      modelId: MODEL_ID,
      feature: LlmFeature.refinement,
      userId: 'system',
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const afterText = chunks.join('');

    const refinement = await prisma.refinement.create({
      data: {
        jobId,
        instruction,
        scope: scope ?? 'all',
        beforeText: job.output,
        afterText,
        accepted: false,
      },
    });

    const sseBody =
      chunks.map((c) => `data: ${c}\n\n`).join('') +
      `event: complete\ndata: ${JSON.stringify({ refinementId: refinement.id })}\n\n`;

    return {
      statusCode: 200,
      headers: { ...getCorsHeaders(event.headers?.['origin']),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      } as { [header: string]: string },
      body: sseBody,
    };
  } catch (err) {
    console.error('refine handler error', err);
    return errorResponse(event.headers?.['origin'], 500, 'internal_server_error', err);
  }
};

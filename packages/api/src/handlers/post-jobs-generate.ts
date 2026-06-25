import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { LlmFeature, prisma } from '@demand-letter/db';
import { invokeModelStream } from '../lib/ai-provider';
import { computeGapReport } from '../lib/sufficiency-gate';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;
const MODEL_ID = process.env.BEDROCK_MODEL_ID!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };
  }

  const files = await prisma.file.findMany({ where: { jobId } });
  if (!files.length) {
    return { statusCode: 422, body: JSON.stringify({ error: 'No files uploaded for this job' }) };
  }

  const gapReport = await computeGapReport(jobId);
  if (gapReport.gaps.length > 0) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'gap_report_not_cleared',
        message: `${gapReport.gaps.length} slot(s) remain uncovered. Fill or accept-missing all gaps before generating.`,
        gaps: gapReport.gaps,
      }),
    };
  }

  await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } });

  try {
    // Fetch all files from S3 and base64-encode as Anthropic document blocks
    const fileContents = await Promise.all(
      files.map(async (f) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: f.s3Key }));
        const bytes = await obj.Body?.transformToByteArray();
        return {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: f.mimeType as
              | 'application/pdf'
              | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: Buffer.from(bytes!).toString('base64'),
          },
        };
      }),
    );

    const userId = 'system'; // no auth at skeleton stage
    const stream = await invokeModelStream({
      modelId: MODEL_ID,
      feature: LlmFeature.skeleton_generation,
      userId,
      messages: [
        {
          role: 'user',
          content: [
            ...fileContents,
            {
              type: 'text',
              text: 'Generate a demand letter matching the provided template exactly, using the case documents as the source of facts.',
            },
          ],
        },
      ],
    });

    // Collect streamed output
    let output = '';
    for await (const chunk of stream) {
      output += chunk;
    }

    await prisma.job.update({ where: { id: jobId }, data: { status: 'done', output } });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: output,
    };
  } catch (err) {
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
    throw err;
  }
};

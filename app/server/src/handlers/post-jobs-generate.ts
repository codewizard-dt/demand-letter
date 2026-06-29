import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { renderTemplate, TemplateRenderError, buildDataObject } from '../lib';
import { generateMedicalNarrative } from '../lib/medical-narrative';
import { computeGapReport } from '../lib/sufficiency-gate';
import { getCorsHeaders } from '../lib/cors';
import { logJobError } from '../lib/job-logger';
import { getBasicModelId } from '../lib/ai-provider';

const MODEL_ID = getBasicModelId();
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
  }

  const files = await prisma.file.findMany({ where: { jobId } });
  if (!files.length) {
    return { statusCode: 422,
      headers: { ...getCorsHeaders(event.headers?.['origin']) }, body: JSON.stringify({ error: 'no_files_uploaded', message: 'This job has no uploaded files yet.' }) };
  }

  const gapReport = await computeGapReport(jobId);
  if (gapReport.gaps.length > 0) {
    return {
      statusCode: 400,
      headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'sufficiency_precheck_failed',
        message: `${gapReport.gaps.length} required slot(s) are not covered. Run /jobs/:id/gap-report to see details.`,
        gaps: gapReport.gaps,
      }),
    };
  }

  await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } });

  try {
    const userId = 'system';
    const { text: narrativeText, groundingReport } = await generateMedicalNarrative(
      jobId, MODEL_ID, userId
    );

    console.log('Grounding report:', JSON.stringify(groundingReport));

    // Assemble docxtemplater data object and inject the AI-generated narrative
    const data = await buildDataObject(jobId);
    (data as Record<string, unknown>).medicalNarrative = narrativeText;

    // Render DOCX from tagged template
    const docxBuffer = await renderTemplate(jobId, data);

    // Upload rendered DOCX to S3
    const outputS3Key = `${jobId}/output/demand-letter.docx`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: outputS3Key,
      Body: docxBuffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }));

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'complete', output: narrativeText, outputS3Key },
    });

    // Emit each ~80-char chunk as a separate SSE data event for streaming effect
    const chunks = narrativeText.match(/.{1,80}/gs) ?? [narrativeText];
    const sseBody = chunks.map(c => `data: ${c}\n\n`).join('') + 'event: complete\ndata: \n\n';

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
    if (err instanceof TemplateRenderError) {
      await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
      return {
        statusCode: 500,
        headers: { ...getCorsHeaders(event.headers?.['origin']), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'template_render_failed',
          errors: err.errors,
        }),
      };
    }
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
    await logJobError(jobId, 'post-jobs-generate', err);
    throw err;
  }
};

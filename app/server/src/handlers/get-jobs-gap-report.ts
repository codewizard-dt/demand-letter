import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { computeGapReport } from '../lib/sufficiency-gate';
import { corsHeadersFor } from '../lib/cors';
import { errorResponse } from '../lib/error-response';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return { statusCode: 400, headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }) };
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return { statusCode: 404, headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'job_not_found', message: `Job ${jobId} does not exist.` }) };
    }

    const template = await prisma.template.findFirst({
      where: { jobId },
      orderBy: { ingestedAt: 'desc' },
      select: { id: true },
    });
    if (!template) {
      return { statusCode: 404, headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'template_not_ready', message: 'No template has been classified for this job yet. Upload a .docx template and run classify first.' }) };
    }

    const report = await computeGapReport(jobId);
    return {
      statusCode: 200,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    };
  } catch (err) {
    console.error('gap-report error', err);
    return errorResponse(event, 500, 'internal_server_error', err);
  }
};

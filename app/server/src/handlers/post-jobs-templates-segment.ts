import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Prisma } from '@prisma/client';
import { prisma } from '@demand-letter/db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { enumerateSlots } from '../lib/docx-inspect';
import { extractParagraphZones } from '../lib/docx-zone-extractor';
import { corsHeadersFor } from '../lib/cors';
import { logJobEvent, logJobError } from '../lib/job-logger';
import { errorResponse } from '../lib/error-response';

const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';
const s3 = new S3Client({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_job_id', message: 'Job ID is required.' }),
    };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return {
      statusCode: 404,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'job_not_found', message: 'The requested job does not exist.' }),
    };
  }

  const file = await prisma.file.findFirst({
    where: {
      jobId,
      role: 'template',
      mimeType: { contains: 'wordprocessingml' },
    },
  });

  if (!file) {
    return {
      statusCode: 422,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'no_template_file', message: 'No DOCX template file found for this job.' }),
    };
  }

  try {
    // Download DOCX buffer from S3
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: file.s3Key });
    const s3Obj = await s3.send(getCmd);

    if (!s3Obj.Body) {
      return {
        statusCode: 502,
        headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 's3_empty_response', message: 'The S3 object returned no content.' }),
      };
    }

    const bodyBytes = await s3Obj.Body.transformToByteArray();
    const buffer = Buffer.from(bodyBytes);

    // Enumerate existing {field} slots in the document
    const slots = enumerateSlots(buffer);

    // Create Template record
    const template = await prisma.template.create({
      data: {
        jobId,
        s3KeyOriginal: file.s3Key,
        s3KeyTagged: slots.length > 0 ? file.s3Key : null,
        slotCount: slots.length,
      },
    });

    // Bulk-create TemplateSlot records if slots found
    if (slots.length > 0) {
      await prisma.templateSlot.createMany({
        data: slots.map((slotName) => ({
          templateId: template.id,
          slotName,
          required: true,
        })),
        skipDuplicates: true,
      });
    }

    // Extract paragraph zones for AI classification
    const paragraphZones = extractParagraphZones(buffer);
    if (paragraphZones.length > 0) {
      await prisma.zone.createMany({
        data: paragraphZones.map((z) => ({
          templateId: template.id,
          zoneIndex: z.zoneIndex,
          textContent: z.textContent,
          runPath: z.runPath as unknown as Prisma.InputJsonValue,
          part: z.runPath.source?.part ?? 'body',
          stationaryVariant: z.runPath.source?.variant ?? null,
        })),
        skipDuplicates: true,
      });
    }

    await logJobEvent(jobId, 'post-jobs-templates-segment', 'info',
      `Template segmented: ${slots.length} slots, ${paragraphZones.length} zones`, { context: { templateId: template.id } });

    return {
      statusCode: 200,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, slotCount: slots.length }),
    };
  } catch (err) {
    await logJobError(jobId, 'post-jobs-templates-segment', err);
    return errorResponse(event, 500, 'internal_server_error', err);
  }
};

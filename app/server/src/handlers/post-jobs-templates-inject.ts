import type { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma, ZoneType } from '@demand-letter/db';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { injectDelimiters } from '../lib/docx-injector';
import { enumerateSlotsWithContext } from '../lib/docx-inspect';
import { corsHeadersFor } from '../lib/cors';
import { logJobError, logJobEvent } from '../lib/job-logger';
import { errorResponse } from '../lib/error-response';

const s3 = new S3Client({});
const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';

export const handler: APIGatewayProxyHandler = async (event) => {
  const templateId = event.pathParameters?.templateId;
  const jobId = event.pathParameters?.id;

  if (!templateId || !jobId) {
    return { statusCode: 400,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'missing_path_parameters', message: 'Required path parameters are missing.' }) };
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { zones: true },
    });

    if (!template || template.jobId !== jobId) {
      return { statusCode: 404,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 'template_not_found', message: 'The requested template does not exist.' }) };
    }

    // Only inject into confirmed variable_populated zones that have a field name
    const confirmedZones = template.zones
      .filter(z => z.confirmed && z.type === ZoneType.variable_populated && (z.templateText || z.suggestedFieldName))
      .map(z => ({
        zoneIndex: z.zoneIndex,
        suggestedFieldName: z.suggestedFieldName as string,
        templateText: z.templateText,
        paragraphSpan: (z.runPath as { paragraphSpan?: number } | null)?.paragraphSpan,
      }));

    // Download original DOCX from S3
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal });
    const s3Obj = await s3.send(getCmd);

    if (!s3Obj.Body) {
      return { statusCode: 502,
      headers: { ...corsHeadersFor(event) }, body: JSON.stringify({ error: 's3_empty_response', message: 'The S3 object returned no content.' }) };
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of s3Obj.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const originalBuffer = Buffer.concat(chunks);

    // Inject delimiter tags
    const taggedBuffer = injectDelimiters(originalBuffer, confirmedZones);

    // Upload tagged DOCX to S3
    const s3KeyTagged = `templates/${templateId}/tagged.docx`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3KeyTagged,
      Body: taggedBuffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }));

    // Enumerate slots (with surrounding template text) from the tagged document
    const slotsWithCtx = enumerateSlotsWithContext(taggedBuffer);
    const slots = slotsWithCtx.map(s => s.slotName);

    // Update template record with tagged key and slot count
    await prisma.template.update({
      where: { id: templateId },
      data: { s3KeyTagged, slotCount: slots.length },
    });

    // Rebuild the slot set to mirror the tagged document: refresh defaultValue on
    // existing slots, create newly added variables, and drop removed ones.
    await Promise.all(
      slotsWithCtx.map(({ slotName, paragraphText }) =>
        prisma.templateSlot.upsert({
          where: { templateId_slotName: { templateId, slotName } },
          update: { defaultValue: paragraphText },
          create: { templateId, slotName, required: true, defaultValue: paragraphText },
        }),
      ),
    );
    await prisma.templateSlot.deleteMany({
      where: { templateId, slotName: { notIn: slots } },
    });
    const body = event.body ? JSON.parse(event.body) as { confirmed?: boolean } : {};
    if (body.confirmed === true) {
      await logJobEvent(jobId, 'post-jobs-templates-inject', 'info',
        `Template confirmed: ${slots.length} variable slots`, {
          context: {
            templateId,
            slotCount: slots.length,
            slots,
          },
        });
    }

    return {
      statusCode: 200,
      headers: { ...corsHeadersFor(event), 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3KeyTagged, slotCount: slots.length, slots }),
    };
  } catch (err) {
    console.error('inject error', err);
    await logJobError(jobId, 'post-jobs-templates-inject', err);
    return errorResponse(event, 500, 'internal_server_error', err);
  }
};

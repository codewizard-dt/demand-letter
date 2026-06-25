import type { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma, ZoneType } from '@demand-letter/db';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { injectDelimiters } from '../lib/docx-injector';
import { enumerateSlots } from '../lib/docx-inspect';

const s3 = new S3Client({});
const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';

export const handler: APIGatewayProxyHandler = async (event) => {
  const templateId = event.pathParameters?.templateId;
  const jobId = event.pathParameters?.id;

  if (!templateId || !jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing path parameters' }) };
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: { zones: true },
    });

    if (!template || template.jobId !== jobId) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Template not found' }) };
    }

    // Only inject into confirmed variable_populated zones that have a field name
    const confirmedZones = template.zones
      .filter(z => z.confirmed && z.type === ZoneType.variable_populated && z.suggestedFieldName)
      .map(z => ({ zoneIndex: z.zoneIndex, suggestedFieldName: z.suggestedFieldName as string }));

    // Download original DOCX from S3
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal });
    const s3Obj = await s3.send(getCmd);

    if (!s3Obj.Body) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Empty response from S3' }) };
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

    // Enumerate slots from the tagged document
    const slots = enumerateSlots(taggedBuffer);

    // Update template record with tagged key and slot count
    await prisma.template.update({
      where: { id: templateId },
      data: { s3KeyTagged, slotCount: slots.length },
    });

    // Upsert slot rows
    await Promise.all(
      slots.map(slotName =>
        prisma.templateSlot.upsert({
          where: { templateId_slotName: { templateId, slotName } },
          update: {},
          create: { templateId, slotName, required: true },
        }),
      ),
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3KeyTagged, slotCount: slots.length, slots }),
    };
  } catch (err) {
    console.error('inject error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

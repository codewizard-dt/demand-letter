import Docxtemplater from 'docxtemplater';
// @ts-ignore – no official types for pizzip
import PizZip from 'pizzip';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@demand-letter/db';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export class TemplateRenderError extends Error {
  constructor(public readonly errors: unknown[]) {
    super('docxtemplater render failed');
  }
}

export async function renderTemplate(
  jobId: string,
  data: Record<string, string | Array<Record<string, string>>>,
): Promise<Buffer> {
  // Fetch template record from DB
  const template = await prisma.template.findFirst({
    where: { jobId },
    orderBy: { ingestedAt: 'desc' },
    select: { s3KeyTagged: true },
  });
  if (!template?.s3KeyTagged) throw new Error(`No tagged template for job ${jobId}`);

  // Fetch the DOCX from S3
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyTagged }));
  const bytes = await obj.Body?.transformToByteArray();
  if (!bytes) throw new Error('Empty S3 response for template');

  // Load with PizZip and Docxtemplater
  const zip = new PizZip(bytes);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part: { value: string }) => {
      throw new TemplateRenderError([`Unexpected missing tag: {${part.value}}`]);
    },
  });

  // Render
  try {
    doc.render(data);
  } catch (err: any) {
    if (err.properties?.errors) {
      throw new TemplateRenderError(err.properties.errors);
    }
    throw err;
  }

  // Return output buffer
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Prisma } from '@prisma/client';
import { prisma, ZoneType, LlmFeature } from '@demand-letter/db';
import Busboy from 'busboy';
import PizZip from 'pizzip';
import { createHash, randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Request, Router as ExpressRouter } from 'express';
import { Packer } from 'docx';
import mammoth from 'mammoth';
import { asyncHandler, errorJson, internalError, json, sendDocx, writeSseData } from '../http';
import { renderTemplate, TemplateRenderError, buildDataObject, prosemirrorToDocx, type ProseMirrorDoc } from '../lib';
import { splitAddressLines } from '../lib/generation-data-builder';
import { applyLiteralReplacements, buildLiteralReplacements } from '../lib/docx-literal-replace';
import { computeGapReport } from '../lib/sufficiency-gate';
import { generateMedicalNarrative } from '../lib/medical-narrative';
import { getBasicModelId, getLogicModelId, invokeModel, invokeModelStream, invokeModelWithTools } from '../lib/ai-provider';
import {
  extractBodyParagraphs,
  applyProofreadEdits,
  parseProofreadEdits,
  buildProofreadUserMessage,
  PROOFREAD_TOOL,
  PROOFREAD_SYSTEM,
} from '../lib/letter-proofread';
import { dbNameToTagName, tagNameToDbName } from '../lib/field-schema';
import { redactText, type RedactableEntity } from '../lib/redact-text';
import { extractDocxStationaries } from '../lib/docx-stationary';
import { runExtractionJob } from '../lib/extraction-job';
import { detectDocumentType } from '../lib/document-type-detector';
import { parseDocx, parsePdfNative } from '../lib/structured-parser';
import { startTextractAnalysis } from '../lib/textract-client';
import { runTemplateClassificationJob } from '../lib/template-classification-job';
import { injectDelimiters } from '../lib/docx-injector';
import { enumerateSlotsWithContext } from '../lib/docx-inspect';
import { extractParagraphZones } from '../lib/docx-zone-extractor';
import { logJobError, logJobEvent } from '../lib/job-logger';
import { EventEmitter } from 'node:events';

export const restRouter: ExpressRouter = Router();

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';
const MODEL_ID = getBasicModelId();
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ALLOWED_MIME = new Set([DOCX_MIME, 'application/pdf']);

const DOCX_STYLE_MAP = [
  "p[style-name='Boilerplate'] => p.boilerplate-zone:fresh",
  "r[style-name='Boilerplate'] => span.boilerplate-zone",
  "p[style-name='Normal'] => p.docx-paragraph:fresh",
  "p[style-name='List Paragraph'] => p.docx-list-paragraph:fresh",
  "p[style-name='Title'] => h1.docx-title:fresh",
  "p[style-name='Heading 1'] => h1.docx-heading-1:fresh",
  "p[style-name='Heading 2'] => h2.docx-heading-2:fresh",
  "p[style-name='Heading 3'] => h3.docx-heading-3:fresh",
];

const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(100);
const jobEventBuffers = new Map<string, object[]>();
const STREAM_BUFFER_TTL_MS = 5 * 60_000;

type UploadedFile = {
  filename: string;
  contentType: string;
  content: Buffer;
};

function renderZoneContent(
  templateText: string | null,
  suggestedFieldName: string | null,
  data: Record<string, unknown>,
): string {
  const tmpl = templateText ?? (suggestedFieldName ? `{${suggestedFieldName}}` : '');
  if (!tmpl) return '';
  return tmpl.replace(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (_, field: string) => {
    const val =
      (data as Record<string, unknown>)[field] ??
      (data as Record<string, unknown>)[dbNameToTagName(field) ?? ''] ??
      '';
    return typeof val === 'string' ? val : String(val);
  });
}

function emitJobEvent(jobId: string, event: object): void {
  const events = jobEventBuffers.get(jobId) ?? [];
  events.push(event);
  jobEventBuffers.set(jobId, events.slice(-500));
  jobEvents.emit(jobId, event);

  const type = (event as { type?: string }).type;
  if (type === 'complete' || type === 'error') {
    setTimeout(() => jobEventBuffers.delete(jobId), STREAM_BUFFER_TTL_MS).unref?.();
  }
}

function extractEventChannel(jobId: string): string {
  return `extract:${jobId}`;
}

function templateClassificationEventChannel(jobId: string, templateId: string): string {
  return `classify:${jobId}:${templateId}`;
}

async function rerenderAcceptedRefinement(jobId: string, afterText: string): Promise<string> {
  const data = await buildDataObject(jobId);
  (data as Record<string, unknown>).medicalNarrative = afterText;
  const docxBuffer = await renderTemplate(jobId, data);
  const outputS3Key = `${jobId}/output/demand-letter.docx`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: outputS3Key, Body: docxBuffer, ContentType: DOCX_MIME }));
  return outputS3Key;
}

function firstQuery(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

async function requireJob(jobId: string | undefined) {
  if (!jobId) return null;
  return prisma.job.findUnique({ where: { id: jobId } });
}

function parseMultipart(req: Request): Promise<UploadedFile[]> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const files: UploadedFile[] = [];

    busboy.on('file', (_fieldname, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => {
        files.push({
          filename: info.filename,
          contentType: info.mimeType,
          content: Buffer.concat(chunks),
        });
      });
    });
    busboy.on('error', reject);
    busboy.on('finish', () => resolve(files));
    req.pipe(busboy);
  });
}

restRouter.get('/jobs', asyncHandler(async (_req, res) => {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      files: {
        select: { fileName: true, mimeType: true, role: true },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  });
  json(res, 200, { jobs });
}));

restRouter.post('/jobs', asyncHandler(async (_req, res) => {
  const job = await prisma.job.create({ data: {} });
  json(res, 201, { id: job.id });
}));

restRouter.get('/jobs/:id', asyncHandler(async (req, res) => {
  const job = await requireJob(req.params.id);
  if (!job) return errorJson(res, 404, 'job_not_found', 'Job not found.');
  json(res, 200, { id: job.id, status: job.status, outputS3Key: job.outputS3Key ?? null });
}));

restRouter.get('/admin/llm-costs', asyncHandler(async (req, res) => {
  const days = parseInt(firstQuery(req.query.days) ?? '30', 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [aggregates, recentRows] = await Promise.all([
    prisma.llmAuditLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: cutoff } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      orderBy: { _sum: { estimatedCostUsd: 'desc' } },
    }),
    prisma.llmAuditLog.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        feature: true,
        model: true,
        provider: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        durationMs: true,
        createdAt: true,
      },
    }),
  ]);
  json(res, 200, { aggregates, recentRows });
}));

restRouter.post('/jobs/:id/files', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');

  const files = await parseMultipart(req);
  if (!files.length) return errorJson(res, 400, 'no_files_uploaded', 'At least one file is required.');

  const created = [];
  for (const file of files) {
    const mime = file.contentType;
    if (!ALLOWED_MIME.has(mime)) {
      return errorJson(res, 415, 'unsupported_file_type', `File type '${mime}' is not accepted. Only PDF and DOCX files are allowed.`);
    }

    const role = mime.includes('wordprocessingml') ? ('template' as const) : ('case_doc' as const);
    const contentHash = createHash('sha256').update(file.content).digest('hex');
    const reusableFile = await prisma.file.findFirst({ where: { contentHash }, orderBy: { createdAt: 'asc' } });

    if (reusableFile) {
      const record = await prisma.file.create({
        data: { jobId, contentHash, s3Key: reusableFile.s3Key, mimeType: mime, role, fileName: file.filename },
      });
      if (role === 'case_doc') {
        await logJobEvent(jobId, 'post-jobs-files', 'info', `Case document uploaded: ${file.filename}`, {
          context: {
            fileId: record.id,
            s3Key: record.s3Key,
            mimeType: mime,
            reusedContent: true,
          },
        });
      }
      created.push(record);
      continue;
    }

    const fileId = randomUUID();
    const s3Key = `${jobId}/${fileId}-${file.filename}`;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: file.content, ContentType: mime }));
    const record = await prisma.file.create({
      data: { jobId, contentHash, s3Key, mimeType: mime, role, fileName: file.filename },
    });
    if (role === 'case_doc') {
      await logJobEvent(jobId, 'post-jobs-files', 'info', `Case document uploaded: ${file.filename}`, {
        context: {
          fileId: record.id,
          s3Key: record.s3Key,
          mimeType: mime,
          reusedContent: false,
        },
      });
    }
    created.push(record);
  }

  json(res, 201, { files: created });
}));

restRouter.get('/jobs/:id/files', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const files = await prisma.file.findMany({ where: { jobId }, orderBy: { createdAt: 'asc' } });
  json(res, 200, { files });
}));

restRouter.post('/jobs/:id/templates/segment', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');

  const file = await prisma.file.findFirst({
    where: { jobId, role: 'template', mimeType: { contains: 'wordprocessingml' } },
  });
  if (!file) return errorJson(res, 422, 'no_template_file', 'No DOCX template file found for this job.');

  try {
    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: file.s3Key }));
    const bodyBytes = await s3Obj.Body?.transformToByteArray();
    if (!bodyBytes) return errorJson(res, 502, 's3_empty_response', 'The S3 object returned no content.');

    const buffer = Buffer.from(bodyBytes);
    const slotsWithCtx = enumerateSlotsWithContext(buffer);
    const slots = slotsWithCtx.map(s => s.slotName);
    const template = await prisma.template.create({
      data: {
        jobId,
        s3KeyOriginal: file.s3Key,
        s3KeyTagged: slots.length > 0 ? file.s3Key : null,
        slotCount: slots.length,
      },
    });

    if (slotsWithCtx.length > 0) {
      await prisma.templateSlot.createMany({
        data: slotsWithCtx.map(({ slotName, paragraphText }) => ({
          templateId: template.id,
          slotName,
          required: true,
          defaultValue: paragraphText,
        })),
        skipDuplicates: true,
      });
    }

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
    json(res, 200, { templateId: template.id, slotCount: slots.length });
  } catch (err) {
    await logJobError(jobId, 'post-jobs-templates-segment', err);
    internalError(res, err);
  }
}));

restRouter.get('/jobs/:id/templates/:templateId/zones', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const template = await prisma.template.findUnique({ where: { id: templateId }, select: { jobId: true } });
  if (!template || template.jobId !== jobId) return errorJson(res, 404, 'template_not_found', 'The requested template does not exist.');

  const zones = await prisma.zone.findMany({ where: { templateId }, orderBy: { zoneIndex: 'asc' } });
  if (!zones.length) return errorJson(res, 404, 'no_zones_found', 'The template has no classified zones. Run classify first.');
  json(res, 200, zones);
}));

restRouter.get('/jobs/:id/templates/:templateId/original.docx', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { jobId: true, s3KeyOriginal: true },
  });
  if (!template || template.jobId !== jobId) return errorJson(res, 404, 'template_not_found', 'The requested template does not exist.');

  const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
  const bodyBytes = await s3Obj.Body?.transformToByteArray();
  if (!bodyBytes) return errorJson(res, 502, 's3_empty_response', 'The S3 object returned no content.');

  res.status(200)
    .setHeader('Content-Type', DOCX_MIME)
    .setHeader('Content-Disposition', 'inline; filename="template.docx"')
    .send(Buffer.from(bodyBytes));
}));

restRouter.get('/jobs/:id/templates/:templateId/original/preview', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { jobId: true, s3KeyOriginal: true },
  });
  if (!template || template.jobId !== jobId) return errorJson(res, 404, 'template_not_found', 'The requested template does not exist.');

  const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
  const bodyBytes = await s3Obj.Body?.transformToByteArray();
  if (!bodyBytes) return errorJson(res, 502, 's3_empty_response', 'The S3 object returned no content.');

  const buffer = Buffer.from(bodyBytes);
  const stationaries = extractDocxStationaries(buffer);
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    { ignoreEmptyParagraphs: false, styleMap: DOCX_STYLE_MAP },
  );
  json(res, 200, { html, stationaries });
}));

restRouter.patch('/jobs/:id/templates/:templateId/zones', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const zones = req.body?.zones;
  const removeZoneIds = req.body?.removeZoneIds;
  if (!Array.isArray(zones)) return errorJson(res, 400, 'invalid_request_body', 'The request body is malformed or missing required fields.');
  if (removeZoneIds !== undefined && !Array.isArray(removeZoneIds)) return errorJson(res, 400, 'invalid_request_body', 'The request body is malformed or missing required fields.');
  const updated = await Promise.all(
    zones.map((z) => prisma.zone.update({
      where: { id: z.id },
      data: {
        type: z.type as 'boilerplate_verbatim' | 'variable_populated' | null,
        ...(typeof z.textContent === 'string' ? { textContent: z.textContent } : {}),
        templateText: z.templateText !== undefined
          ? (z.templateText ?? (
              z.type === 'variable_populated' && z.suggestedFieldName
                ? `{${z.suggestedFieldName}}`
                : null
            ))
          : undefined,
        suggestedFieldName: z.suggestedFieldName,
        confirmed: z.confirmed,
        confirmedBy: 'attorney',
        confirmedAt: new Date(),
      },
    })),
  );
  if (removeZoneIds?.length > 0) {
    await prisma.zone.deleteMany({
      where: {
        templateId,
        id: { in: removeZoneIds },
      },
    });
  }
  // Re-tag the document and resync slots so the gap report reflects the saved
  // zones automatically. Injection is an internal side-effect of saving — a
  // failure here should not fail the save, so log and continue.
  try {
    const rebuild = await rebuildTaggedTemplate(jobId, templateId);
    if (!rebuild.ok) {
      await logJobError(jobId, 'patch-jobs-template-zones', new Error(`slot resync failed: ${rebuild.code}`));
    }
  } catch (err) {
    await logJobError(jobId, 'patch-jobs-template-zones', err);
  }
  json(res, 200, updated);
}));

restRouter.post('/jobs/:id/templates/:templateId/classify', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const trace = { requestId: req.header('x-request-id') ?? randomUUID(), traceId: randomUUID() };
  const zoneCount = await prisma.zone.count({ where: { templateId } });
  if (zoneCount === 0) return errorJson(res, 404, 'no_zones_found', 'The template has no classified zones. Run classify first.');

  const channel = templateClassificationEventChannel(jobId, templateId);
  emitJobEvent(channel, { type: 'progress', message: 'Template classification queued...' });
  void runTemplateClassificationJob({
    jobId,
    templateId,
    userId: 'system',
    trace,
    emit: (event) => emitJobEvent(channel, event),
  });

  json(res, 202, { jobId, templateId, status: 'processing', traceId: trace.traceId });
}));

restRouter.get('/jobs/:id/templates/:templateId/classify/stream', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'Job not found.');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const channel = templateClassificationEventChannel(jobId, templateId);
  const send = (event: object) => writeSseData(res, event);
  const listener = (event: object) => {
    send(event);
    const type = (event as { type?: string }).type;
    if (type === 'complete' || type === 'error') res.end();
  };

  jobEvents.on(channel, listener);
  for (const event of jobEventBuffers.get(channel) ?? []) {
    listener(event);
    const type = (event as { type?: string }).type;
    if (type === 'complete' || type === 'error') {
      jobEvents.off(channel, listener);
      return;
    }
  }

  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    jobEvents.off(channel, listener);
    clearInterval(ping);
  });
}));

/**
 * Re-tag the original DOCX from the current confirmed zones and rebuild the
 * template's slot set so it exactly mirrors the tagged document. This is the
 * single source of the tagged template + `TemplateSlot` rows; call it whenever
 * zones change so downstream views (gap report, slots) stay in sync without a
 * separate, user-visible inject step.
 */
async function rebuildTaggedTemplate(
  jobId: string,
  templateId: string,
): Promise<
  | { ok: true; s3KeyTagged: string; slots: string[] }
  | { ok: false; status: number; code: string; message: string }
> {
  const template = await prisma.template.findUnique({ where: { id: templateId }, include: { zones: true } });
  if (!template || template.jobId !== jobId) {
    return { ok: false, status: 404, code: 'template_not_found', message: 'The requested template does not exist.' };
  }

  const confirmedZones = template.zones
    .filter((z) => z.confirmed && z.type === ZoneType.variable_populated && (z.templateText || z.suggestedFieldName))
    .map((z) => ({
      zoneIndex: z.zoneIndex,
      suggestedFieldName: z.suggestedFieldName as string,
      templateText: z.templateText,
      paragraphSpan: (z.runPath as { paragraphSpan?: number } | null)?.paragraphSpan,
    }));

  const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
  const bodyBytes = await s3Obj.Body?.transformToByteArray();
  if (!bodyBytes) {
    return { ok: false, status: 502, code: 's3_empty_response', message: 'The S3 object returned no content.' };
  }

  const taggedBuffer = injectDelimiters(Buffer.from(bodyBytes), confirmedZones);
  const s3KeyTagged = `templates/${templateId}/tagged.docx`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3KeyTagged, Body: taggedBuffer, ContentType: DOCX_MIME }));

  const slotsWithCtxTagged = enumerateSlotsWithContext(taggedBuffer);
  const slots = slotsWithCtxTagged.map((s) => s.slotName);
  await prisma.template.update({ where: { id: templateId }, data: { s3KeyTagged, slotCount: slots.length } });
  // Rebuild the slot set to mirror the tagged document: refresh defaultValue on
  // existing slots, create newly added variables, and drop removed ones.
  await Promise.all(slotsWithCtxTagged.map(({ slotName, paragraphText }) => prisma.templateSlot.upsert({
    where: { templateId_slotName: { templateId, slotName } },
    update: { defaultValue: paragraphText },
    create: { templateId, slotName, required: true, defaultValue: paragraphText },
  })));
  await prisma.templateSlot.deleteMany({
    where: { templateId, slotName: { notIn: slots } },
  });

  return { ok: true, s3KeyTagged, slots };
}

restRouter.post('/jobs/:id/templates/:templateId/inject', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  try {
    const result = await rebuildTaggedTemplate(jobId, templateId);
    if (!result.ok) return errorJson(res, result.status, result.code, result.message);
    if (req.body?.confirmed === true) {
      await logJobEvent(jobId, 'post-jobs-templates-inject', 'info',
        `Template confirmed: ${result.slots.length} variable slots`, {
          context: {
            templateId,
            slotCount: result.slots.length,
            slots: result.slots,
          },
        });
    }
    json(res, 200, { s3KeyTagged: result.s3KeyTagged, slotCount: result.slots.length, slots: result.slots });
  } catch (err) {
    await logJobError(jobId, 'post-jobs-templates-inject', err);
    internalError(res, err);
  }
}));

// Replace an embedded image (e.g. the letterhead) in the template. The `target`
// query param is the media path reported on a zone image (word/media/imageN.png).
restRouter.post('/jobs/:id/templates/:templateId/images/replace', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const target = firstQuery(req.query.target);
  if (!target || !target.startsWith('word/media/') || target.includes('..')) {
    return errorJson(res, 400, 'invalid_target', 'A valid image target is required.');
  }
  try {
    const template = await prisma.template.findUnique({ where: { id: templateId }, select: { jobId: true, s3KeyOriginal: true } });
    if (!template || template.jobId !== jobId) return errorJson(res, 404, 'template_not_found', 'The requested template does not exist.');

    const files = await parseMultipart(req);
    const file = files[0];
    if (!file || file.content.length === 0) return errorJson(res, 400, 'no_image', 'No image was uploaded.');
    if (!file.contentType?.startsWith('image/')) return errorJson(res, 400, 'not_an_image', 'The uploaded file is not an image.');

    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
    const bytes = await s3Obj.Body?.transformToByteArray();
    if (!bytes) return errorJson(res, 502, 's3_empty_response', 'The S3 object returned no content.');

    const zip = new PizZip(Buffer.from(bytes));
    if (!zip.file(target)) return errorJson(res, 404, 'image_not_found', 'The target image does not exist in the template.');
    zip.file(target, file.content);
    const updated = Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal, Body: updated, ContentType: DOCX_MIME }));

    // Re-tag so the tagged template and previews pick up the new image.
    await rebuildTaggedTemplate(jobId, templateId);
    json(res, 200, { target });
  } catch (err) {
    await logJobError(jobId, 'post-jobs-templates-images-replace', err);
    internalError(res, err);
  }
}));

restRouter.get('/jobs/:id/templates/:templateId/slots', asyncHandler(async (req, res) => {
  const { id: jobId, templateId } = req.params;
  if (!jobId || !templateId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const template = await prisma.template.findUnique({ where: { id: templateId }, select: { id: true, jobId: true, slotCount: true } });
  if (!template || template.jobId !== jobId) return errorJson(res, 404, 'template_not_found', 'The requested template does not exist.');
  const slots = await prisma.templateSlot.findMany({
    where: { templateId },
    orderBy: { slotName: 'asc' },
    select: { slotName: true, required: true, defaultValue: true },
  });
  json(res, 200, { slotCount: template.slotCount ?? slots.length, slots });
}));

restRouter.get('/jobs/:id/templates/latest', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');

  const template = await prisma.template.findFirst({
    where: { jobId },
    orderBy: { ingestedAt: 'desc' },
    select: { id: true, slotCount: true, ingestedAt: true },
  });
  if (!template) return errorJson(res, 404, 'template_not_found', 'No template has been ingested for this job.');

  json(res, 200, {
    templateId: template.id,
    slotCount: template.slotCount,
    ingestedAt: template.ingestedAt.toISOString(),
  });
}));

restRouter.post('/jobs/:id/documents/ingest', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  const force = req.body?.force === true;

  if (force) {
    await prisma.extractedField.deleteMany({ where: { jobId } });
    await prisma.sourceFile.deleteMany({ where: { jobId } });
    await logJobEvent(jobId, 'post-jobs-documents-ingest', 'info', 'Reprocessing all uploaded case documents from scratch');
  }

  const [existingSourceFiles, caseFiles] = await Promise.all([
    prisma.sourceFile.findMany({
      where: { jobId },
      select: { s3Key: true, status: true },
    }),
    prisma.file.findMany({
      where: { jobId, role: 'case_doc' },
      select: { s3Key: true, fileName: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const processedS3Keys = new Set(existingSourceFiles.map((sourceFile) => sourceFile.s3Key));

  let processed = 0;
  let pending = existingSourceFiles.filter((sourceFile) => sourceFile.status === 'processing').length;
  let totalBlocks = 0;

  for (const file of caseFiles) {
    const s3Key = file.s3Key;
    if (processedS3Keys.has(s3Key)) continue;
    const filename = file.fileName;
    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    const bodyBytes = await s3Obj.Body?.transformToByteArray();
    if (!bodyBytes) continue;
    const buffer = Buffer.from(bodyBytes);

    let docType: Awaited<ReturnType<typeof detectDocumentType>>;
    try {
      docType = await detectDocumentType(buffer, filename);
    } catch (err) {
      await logJobEvent(jobId, 'post-jobs-documents-ingest', 'warn',
        `Skipped file ${filename}: ${(err as Error).message}`, { context: { s3Key } });
      await prisma.sourceFile.create({
        data: { jobId, s3Key, type: 'unknown', status: 'error', errorMessage: (err as Error).message },
      }).catch(() => {});
      continue;
    }

    if (docType === 'pdf-scanned') {
      const sourceFile = await prisma.sourceFile.create({ data: { jobId, s3Key, type: docType, status: 'processing' } });
      processedS3Keys.add(s3Key);
      const textractJobId = await startTextractAnalysis(BUCKET, s3Key, sourceFile.id);
      await prisma.sourceFile.update({ where: { id: sourceFile.id }, data: { textractJobId } });
      pending++;
      continue;
    }

    const blocks = docType === 'docx' ? await parseDocx(buffer) : await parsePdfNative(buffer);
    const sourceFile = await prisma.sourceFile.create({ data: { jobId, s3Key, type: docType, status: 'complete' } });
    processedS3Keys.add(s3Key);
    if (blocks.length > 0) {
      await prisma.block.createMany({
        data: blocks.map((b) => ({
          sourceFileId: sourceFile.id,
          type: b.type,
          text: b.text,
          page: b.page,
          confidence: b.confidence ?? null,
          bbox: b.bbox ?? { left: 0, top: 0, width: 0, height: 0 },
          phiOffsets: Prisma.JsonNull,
        })),
      });
      totalBlocks += blocks.length;
    }
    processed++;
  }

  json(res, 200, { processed, pending, blocks: totalBlocks });
}));

restRouter.post('/jobs/:id/extract', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const trace = { requestId: req.header('x-request-id') ?? randomUUID(), traceId: randomUUID() };
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');

  const channel = extractEventChannel(jobId);
  emitJobEvent(channel, { type: 'progress', message: 'Extraction queued...' });
  void runExtractionJob({
    jobId,
    userId: 'system',
    trace,
    emit: (event) => emitJobEvent(channel, event),
  });

  json(res, 202, { jobId, status: 'processing', traceId: trace.traceId });
}));

restRouter.get('/jobs/:id/extract/stream', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'Job not found.');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event: object) => writeSseData(res, event);
  const listener = (event: object) => {
    send(event);
    const type = (event as { type?: string }).type;
    if (type === 'complete' || type === 'error') res.end();
  };

  const channel = extractEventChannel(jobId);
  jobEvents.on(channel, listener);
  for (const event of jobEventBuffers.get(channel) ?? []) {
    listener(event);
    const type = (event as { type?: string }).type;
    if (type === 'complete' || type === 'error') {
      jobEvents.off(channel, listener);
      return;
    }
  }

  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    jobEvents.off(channel, listener);
    clearInterval(ping);
  });
}));

restRouter.get('/jobs/:id/gap-report', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', `Job ${jobId} does not exist.`);
  const template = await prisma.template.findFirst({ where: { jobId }, orderBy: { ingestedAt: 'desc' }, select: { id: true } });
  if (!template) return errorJson(res, 404, 'template_not_ready', 'No template has been classified for this job yet. Upload a .docx template and run classify first.');
  json(res, 200, await computeGapReport(jobId));
}));

restRouter.get('/jobs/:id/fields', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  const fields = await prisma.extractedField.findMany({
    where: { jobId },
    select: {
      fieldName: true,
      value: true,
      blockIds: true,
      confidence: true,
      isNull: true,
      source: true,
      nullReason: true,
      acceptMissing: true,
    },
    orderBy: { fieldName: 'asc' },
  });
  // Surface per-line entries for multi-line addresses (e.g. insurer_address_1/_2)
  // so the gap report shows and can edit each line, unless the attorney has already
  // saved an explicit value for that line.
  const existing = new Set(fields.map((f) => f.fieldName));
  const derived = fields.flatMap((f) => {
    if (!f.value || f.isNull || !f.fieldName.endsWith('_address')) return [];
    const lines = splitAddressLines(f.value);
    if (lines.length <= 1) return [];
    return lines.flatMap((line, index) => {
      const name = `${f.fieldName}_${index + 1}`;
      if (existing.has(name)) return [];
      return [{ ...f, fieldName: name, value: line }];
    });
  });
  json(res, 200, { fields: [...fields, ...derived] });
}));

restRouter.post('/jobs/:id/save-values', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');

  for (const { fieldName, value } of req.body?.fields ?? []) {
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

  for (const fieldName of req.body?.acceptMissing ?? []) {
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
      update: { acceptMissing: true, updatedAt: new Date() },
    });
  }

  json(res, 200, { ok: true });
}));

restRouter.get('/jobs/:id/blocks', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');

  const page = Math.max(1, parseInt(firstQuery(req.query.page) ?? '1', 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(firstQuery(req.query.limit) ?? '100', 10) || 100));
  const filterType = firstQuery(req.query.type);
  const filterPage = firstQuery(req.query.page_num) ? parseInt(firstQuery(req.query.page_num)!, 10) : undefined;
  const where: Prisma.BlockWhereInput = { sourceFile: { jobId } };
  if (filterType) where.type = filterType;
  if (filterPage !== undefined && !isNaN(filterPage)) where.page = filterPage;

  const [blocks, totalCount] = await prisma.$transaction([
    prisma.block.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        sourceFileId: true,
        sourceFile: { select: { s3Key: true } },
        type: true,
        text: true,
        page: true,
        bbox: true,
        confidence: true,
        createdAt: true,
        phiOffsets: true,
      },
    }),
    prisma.block.count({ where }),
  ]);

  const isAttorney = String(req.header('x-caller-role') ?? 'developer').toLowerCase() === 'attorney';
  const responseBlocks = blocks.map((block) => {
    const entities = (block.phiOffsets as RedactableEntity[] | null) ?? [];
    const text = isAttorney ? block.text : redactText(block.text, entities);
    const { phiOffsets: _omit, ...rest } = block;
    return { ...rest, text };
  });

  json(res, 200, { blocks: responseBlocks, page, limit, totalCount, hasMore: page * limit < totalCount });
}));

async function runGenerationJob(jobId: string): Promise<void> {
  const trace = { traceId: randomUUID() };
  const emit = (event: object) => emitJobEvent(jobId, event);
  try {
    // Step 1: fetch template + zones immediately, emit boilerplate zones
    emit({ type: 'progress', message: 'Loading template…' });
    const template = await prisma.template.findFirst({
      where: { jobId },
      orderBy: { ingestedAt: 'desc' },
      include: {
        zones: { orderBy: { zoneIndex: 'asc' } },
        slots: { select: { slotName: true } },
      },
    });
    const zones = template?.zones ?? [];
    for (const z of zones) {
      if (z.type === 'boilerplate_verbatim') {
        emit({ type: 'zone', zoneIndex: z.zoneIndex, content: z.textContent });
      }
    }

    // Step 2: build data object from extracted fields (fast), emit non-narrative variable zones
    emit({ type: 'progress', message: 'Preparing template data…' });
    const data = await buildDataObject(jobId);
    for (const z of zones) {
      if (
        z.type === 'variable_populated' &&
        z.suggestedFieldName !== 'medicalNarrative' &&
        !z.templateText?.includes('{medicalNarrative}') &&
        (z.templateText || z.suggestedFieldName)
      ) {
        const content = renderZoneContent(z.templateText, z.suggestedFieldName, data);
        if (content) emit({ type: 'zone', zoneIndex: z.zoneIndex, content });
      }
    }

    // Step 3: generate narrative with token streaming
    emit({ type: 'progress', message: 'Analyzing medical records…' });
    const logicModelId = getLogicModelId();
    const narrativeZone = zones.find(
      (z) =>
        z.suggestedFieldName === 'medicalNarrative' ||
        z.templateText?.includes('{medicalNarrative}'),
    );
    const { text: narrativeText, groundingReport } = await generateMedicalNarrative(
      jobId,
      logicModelId,
      'system',
      narrativeZone
        ? (chunk) => emit({ type: 'zone-chunk', zoneIndex: narrativeZone.zoneIndex, chunk })
        : undefined,
      trace,
    );
    console.log('Grounding report:', JSON.stringify(groundingReport));

    // Emit canonical narrative zone (replaces accumulated zone-chunk events)
    (data as Record<string, unknown>).medicalNarrative = narrativeText;
    if (narrativeZone) {
      const content = renderZoneContent(narrativeZone.templateText, narrativeZone.suggestedFieldName, data);
      emit({ type: 'zone', zoneIndex: narrativeZone.zoneIndex, content: content || narrativeText });
    }

    // Step 4: fill any missing template slots via LLM, emit their zones too
    const allSlotNames = (template?.slots ?? []).map((s) => s.slotName);
    const missingSlots = allSlotNames.filter((name) => !(name in data));
    if (missingSlots.length > 0) {
      emit({ type: 'progress', message: 'Filling missing fields…' });
      const contextRows = await prisma.extractedField.findMany({
        where: { jobId, isNull: false },
        select: { fieldName: true, value: true },
      });
      const context = contextRows
        .filter((r) => r.value)
        .map((r) => `${r.fieldName}: ${r.value}`)
        .join('\n');
      for (const slotName of missingSlots) {
        const generated = await invokeModel({
          modelId: logicModelId,
          feature: LlmFeature.skeleton_generation,
          userId: 'system',
          jobId,
          traceId: trace.traceId,
          temperature: 0,
          system:
            'You are a legal assistant completing a personal injury demand letter. ' +
            'Generate a concise, appropriate value for the requested field. ' +
            'Return only the field value — no explanation, no quotes, no preamble.',
          messages: [
            {
              role: 'user',
              content: `Generate a value for the field "${slotName}" based on the following case information:\n\n${context}\n\nReturn only the value.`,
            },
          ],
        });
        const value = generated.trim();
        data[slotName] = value;
        const tagName = dbNameToTagName(slotName);
        if (tagName && tagName !== slotName) data[tagName] = value;
        // Persist the AI-filled value so a re-generation reuses it instead of
        // calling the LLM again. Real extraction re-runs will overwrite it.
        if (value) {
          const fieldName = tagNameToDbName(slotName) ?? slotName;
          try {
            await prisma.extractedField.upsert({
              where: { jobId_fieldName: { jobId, fieldName } },
              create: { jobId, fieldName, value, blockIds: [], confidence: 1.0, isNull: false, nullReason: null, source: 'ai-generated' },
              update: { value, isNull: false, source: 'ai-generated', updatedAt: new Date() },
            });
          } catch (err) {
            await logJobError(jobId, 'post-jobs-generate', err);
          }
        }
        const matchingZone = zones.find(
          (z) => z.suggestedFieldName === slotName || z.templateText?.includes(`{${slotName}}`),
        );
        if (matchingZone) {
          const content = renderZoneContent(matchingZone.templateText, matchingZone.suggestedFieldName, data);
          emit({ type: 'zone', zoneIndex: matchingZone.zoneIndex, content: content || value });
        }
      }
    }

    // Step 5: render DOCX + upload
    emit({ type: 'progress', message: 'Rendering document…' });
    const rendered = await renderTemplate(jobId, data);
    // Propagate each field's value to untagged literal occurrences (e.g. a claimant
    // name the template author typed directly into a boilerplate paragraph).
    const docxBuffer = applyLiteralReplacements(rendered, buildLiteralReplacements(zones, data));

    // Step 6: proofread the finished letter — fix grammar and reconnect/remove the
    // detached fragments variable injection can leave behind, without changing
    // names, numbers, or legal substance. Best-effort: fall back on any failure.
    let finalBuffer = docxBuffer;
    try {
      const paragraphs = extractBodyParagraphs(docxBuffer).filter((p) => p.text.length > 0);
      if (paragraphs.length > 0) {
        emit({ type: 'progress', message: 'Proofreading letter…' });
        const result = (await invokeModelWithTools({
          modelId: logicModelId,
          feature: LlmFeature.refinement,
          userId: 'system',
          jobId,
          traceId: trace.traceId,
          temperature: 0,
          system: PROOFREAD_SYSTEM,
          messages: [{ role: 'user', content: buildProofreadUserMessage(paragraphs) }],
          tools: [PROOFREAD_TOOL],
          tool_choice: { type: 'tool', name: PROOFREAD_TOOL.name },
        }));
        const edits = parseProofreadEdits(result);
        await logJobEvent(jobId, 'post-jobs-generate', 'info', `Proofread applied ${edits.length} edit(s)`, {
          context: { edits: edits.map((e) => ({ index: e.index, action: e.action })) },
        });
        if (edits.length > 0) finalBuffer = applyProofreadEdits(docxBuffer, edits);
      }
    } catch (err) {
      await logJobError(jobId, 'post-jobs-generate', err);
    }

    emit({ type: 'progress', message: 'Uploading document…' });
    const outputS3Key = `${jobId}/output/demand-letter.docx`;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: outputS3Key, Body: finalBuffer, ContentType: DOCX_MIME }));
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'complete', output: narrativeText, outputS3Key },
    });

    emit({ type: 'complete' });
  } catch (err) {
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } }).catch(() => {});
    if (err instanceof TemplateRenderError) {
      emit({ type: 'error', message: 'Template render failed' });
    } else {
      await logJobError(jobId, 'post-jobs-generate', err);
      emit({ type: 'error', message: err instanceof Error ? err.message : 'Generation failed' });
    }
  }
}

restRouter.post('/jobs/:id/generate', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const files = await prisma.file.findMany({ where: { jobId } });
  if (!files.length) return errorJson(res, 422, 'no_files_uploaded', 'This job has no uploaded files yet.');
  await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } });
  jobEventBuffers.delete(jobId);
  json(res, 202, { status: 'processing' });
  void runGenerationJob(jobId);
}));

restRouter.get('/jobs/:id/generate/stream', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'Job not found.');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event: object) => writeSseData(res, event);

  if (job.status === 'complete') {
    const template = await prisma.template.findFirst({
      where: { jobId },
      orderBy: { ingestedAt: 'desc' },
      include: { zones: { orderBy: { zoneIndex: 'asc' } } },
    });
    const data = await buildDataObject(jobId);
    (data as Record<string, unknown>).medicalNarrative = job.output ?? '';
    for (const zone of template?.zones ?? []) {
      let content: string;
      if (zone.type === 'boilerplate_verbatim') {
        content = zone.textContent;
      } else if (zone.templateText || zone.suggestedFieldName) {
        content = renderZoneContent(zone.templateText, zone.suggestedFieldName, data);
      } else {
        content = '';
      }
      send({ type: 'zone', zoneIndex: zone.zoneIndex, content });
    }
    send({ type: 'complete' });
    res.end();
    return;
  }

  if (job.status === 'failed') {
    send({ type: 'error', message: 'Generation failed' });
    res.end();
    return;
  }

  const listener = (event: object) => {
    send(event);
    const t = (event as { type: string }).type;
    if (t === 'complete' || t === 'error') res.end();
  };
  jobEvents.on(jobId, listener);
  for (const event of jobEventBuffers.get(jobId) ?? []) {
    listener(event);
    const t = (event as { type?: string }).type;
    if (t === 'complete' || t === 'error') {
      jobEvents.off(jobId, listener);
      return;
    }
  }
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    jobEvents.off(jobId, listener);
    clearInterval(ping);
  });
}));

restRouter.post('/jobs/:id/refine', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const trace = { requestId: req.header('x-request-id') ?? randomUUID(), traceId: randomUUID() };
  const instruction = req.body?.instruction;
  const scope = req.body?.scope;
  if (!instruction) return errorJson(res, 400, 'missing_instruction', 'A refinement instruction is required.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  if (!job.output) return json(res, 422, { error: 'Job output not yet generated' });

  try {
    const extractedFields = await prisma.extractedField.findMany({ where: { jobId } });
    const system =
      'You are a legal writer refining a personal injury demand letter. Apply the attorney\'s instruction precisely. Every factual claim must reference only information present in the extracted fields provided. Return only the revised text -- no explanation or preamble.';
    const scopeSuffix = scope && scope !== 'all' ? `\n\nScope: return only the revised text for the "${scope}" section.` : '';
    const userMessage =
      `## Current Letter Text\n${job.output}\n\n` +
      `## Extracted Fields (grounding context)\n${extractedFields.map((f) => `${f.fieldName}: ${f.value ?? '(not found)'}`).join('\n')}\n\n` +
      `## Attorney Instruction\n${instruction}${scopeSuffix}\n\nApply the instruction and return the revised text now.`;
    const stream = await invokeModelStream({
      modelId: MODEL_ID,
      feature: LlmFeature.refinement,
      userId: 'system',
      jobId,
      requestId: trace.requestId,
      traceId: trace.traceId,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      writeSseData(res, { type: 'chunk', text: chunk });
    }
    const afterText = chunks.join('');
    const refinement = await prisma.refinement.create({
      data: { jobId, instruction, scope: scope ?? 'all', beforeText: job.output, afterText, accepted: false },
    });
    writeSseData(res, { refinementId: refinement.id }, 'complete');
    res.end();
  } catch (err) {
    console.error('refine handler error', err);
    await logJobError(jobId, 'post-jobs-refine', err);
    if (res.headersSent) {
      writeSseData(res, { message: err instanceof Error ? err.message : 'Refinement failed' }, 'error');
      res.end();
      return;
    }
    internalError(res, err);
  }
}));

restRouter.get('/jobs/:id/output', asyncHandler(async (req, res) => {
  const job = await requireJob(req.params.id);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  if (!job.outputS3Key) return errorJson(res, 404, 'output_not_ready', 'Document generation has not completed yet.');
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key }), { expiresIn: 900 });
  json(res, 200, { url });
}));

restRouter.get('/jobs/:id/output/docx', asyncHandler(async (req, res) => {
  const job = await requireJob(req.params.id);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  if (!job.outputS3Key) return errorJson(res, 404, 'output_not_ready', 'Document generation has not completed yet.');
  const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key }));
  const bytes = await s3Obj.Body?.transformToByteArray();
  if (!bytes) return errorJson(res, 500, 'output_empty', 'The generated DOCX has no content.');
  sendDocx(res, Buffer.from(bytes));
}));

restRouter.get('/jobs/:id/output/docx/preview', asyncHandler(async (req, res) => {
  const job = await requireJob(req.params.id);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  if (!job.outputS3Key) return errorJson(res, 404, 'output_not_ready', 'Document generation has not completed yet.');
  const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key }));
  const bytes = await s3Obj.Body?.transformToByteArray();
  if (!bytes) return errorJson(res, 500, 'output_empty', 'The generated DOCX has no content.');
  const buffer = Buffer.from(bytes);
  const stationaries = extractDocxStationaries(buffer);
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    { ignoreEmptyParagraphs: false, styleMap: DOCX_STYLE_MAP },
  );
  json(res, 200, { html, stationaries });
}));

restRouter.post('/jobs/:id/export/docx', asyncHandler(async (req, res) => {
  const doc = req.body?.doc as ProseMirrorDoc | undefined;
  if (!doc) return errorJson(res, 400, 'missing_document', 'No document provided in the request.');
  const job = await requireJob(req.params.id);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  const document = prosemirrorToDocx(doc);
  sendDocx(res, await Packer.toBuffer(document));
}));

restRouter.post('/jobs/:id/editor/save', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const doc = req.body?.doc as ProseMirrorDoc | undefined;
  if (!doc) return errorJson(res, 400, 'missing_document', 'No document provided in the request.');
  const job = await requireJob(jobId);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  const document = prosemirrorToDocx(doc);
  const docxBuffer = await Packer.toBuffer(document);
  const outputS3Key = `${jobId}/output/demand-letter.docx`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: outputS3Key, Body: docxBuffer, ContentType: DOCX_MIME }));
  await prisma.job.update({ where: { id: jobId }, data: { outputS3Key } });
  json(res, 200, { ok: true });
}));

restRouter.get('/jobs/:id/export/docx', asyncHandler(async (req, res) => {
  const job = await requireJob(req.params.id);
  if (!job) return errorJson(res, 404, 'job_not_found', 'The requested job does not exist.');
  if (!job.output) return errorJson(res, 422, 'output_not_ready', 'No generated output found for this job.');
  let doc: ProseMirrorDoc;
  try {
    doc = JSON.parse(job.output) as ProseMirrorDoc;
  } catch {
    doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: job.output }] }] };
  }
  sendDocx(res, await Packer.toBuffer(prosemirrorToDocx(doc)));
}));

restRouter.get('/jobs/:id/refinements', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const refinements = await prisma.refinement.findMany({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, instruction: true, scope: true, accepted: true, createdAt: true },
  });
  json(res, 200, { refinements });
}));

restRouter.patch('/jobs/:id/refine/:refinement_id/accept', asyncHandler(async (req, res) => {
  const { id: jobId, refinement_id: refinementId } = req.params;
  if (!jobId || !refinementId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const refinement = await prisma.refinement.findUnique({ where: { id: refinementId } });
  if (!refinement) return errorJson(res, 404, 'refinement_not_found', 'The requested refinement does not exist.');
  if (refinement.jobId !== jobId) return errorJson(res, 403, 'refinement_job_mismatch', 'This refinement does not belong to the specified job.');
  const outputS3Key = await rerenderAcceptedRefinement(jobId, refinement.afterText);
  await prisma.$transaction([
    prisma.refinement.update({ where: { id: refinementId }, data: { accepted: true } }),
    prisma.job.update({ where: { id: jobId }, data: { output: refinement.afterText, outputS3Key } }),
  ]);
  json(res, 200, { ok: true });
}));

restRouter.patch('/jobs/:id/refine/:refinement_id/reject', asyncHandler(async (req, res) => {
  const { id: jobId, refinement_id: refinementId } = req.params;
  if (!jobId || !refinementId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const refinement = await prisma.refinement.findUnique({ where: { id: refinementId } });
  if (!refinement) return errorJson(res, 404, 'refinement_not_found', 'The requested refinement does not exist.');
  if (refinement.jobId !== jobId) return errorJson(res, 403, 'refinement_job_mismatch', 'This refinement does not belong to the specified job.');
  await prisma.refinement.update({ where: { id: refinementId }, data: { accepted: false } });
  json(res, 200, { ok: true });
}));

restRouter.get('/jobs/:id/changes', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const changes = await prisma.collaborativeChange.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, userName: true, operationType: true, contentDelta: true, createdAt: true },
  });
  json(res, 200, { changes });
}));

restRouter.delete('/jobs/:id/changes/:changeId', asyncHandler(async (req, res) => {
  const { id: jobId, changeId } = req.params;
  if (!jobId || !changeId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const change = await prisma.collaborativeChange.findUnique({ where: { id: changeId } });
  if (!change) return errorJson(res, 404, 'change_not_found', 'The requested change does not exist.');
  if (change.jobId !== jobId) return errorJson(res, 403, 'change_job_mismatch', 'This change does not belong to the specified job.');
  await prisma.collaborativeChange.delete({ where: { id: changeId } });
  json(res, 200, { ok: true });
}));

restRouter.get('/jobs/:id/logs', asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId) return errorJson(res, 400, 'missing_params', 'Required route parameters are missing.');
  const logs = await prisma.jobLog.findMany({ where: { jobId }, orderBy: { createdAt: 'desc' }, take: 100 });
  json(res, 200, { logs });
}));

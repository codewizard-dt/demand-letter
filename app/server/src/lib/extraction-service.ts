import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma, LlmFeature } from '@demand-letter/db';
import { getBasicModelId, invokeModelWithTools } from './ai-provider';
import { buildExtractionTool } from './extraction-schema';
import { parseDocxHeaderFooter } from './docx-parser';
import { FIELD_SCHEMA as FIELD_DEFS } from './field-schema';
import { logJobEvent } from './job-logger';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET ?? '';

const FIRM_FIELD_NAMES = ['attorney_name', 'bar_affiliation', 'firm_name', 'firm_address'];

export async function runGroundedExtraction(jobId: string, userId: string): Promise<void> {
  // 1. Fetch LINE blocks only — WORD blocks are a strict subset of LINE blocks and
  //    inflate the input context without adding information.
  const blocks = await prisma.block.findMany({
    where: { sourceFile: { jobId }, type: 'LINE' },
    select: { id: true, text: true, page: true },
    orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
  });

  // 2. Build the context string
  const blockContext = JSON.stringify(
    blocks.map((b) => ({ id: b.id, text: b.text, page: b.page })),
  );

  // 3. Call the provider wrapper
  const result = await invokeModelWithTools({
    modelId: getBasicModelId(),
    feature: LlmFeature.case_extraction,
    userId,
    system: `You are a precise legal document extraction assistant.
Extract the requested fields from the provided medical and legal document blocks.
For every field, cite the exact block IDs that support the value using block_ids.
If a field cannot be found in the blocks, set is_null to true and provide a null_reason.
Never invent or hallucinate values — if uncertain, set confidence below 0.5 and explain in null_reason.
Every block_id you cite MUST appear in the provided block list.`,
    messages: [
      {
        role: 'user',
        content: `Here are all text blocks extracted from the case documents:\n\n${blockContext}\n\nPlease extract all fields using the extract_case_fields tool.`,
      },
    ],
    tools: [buildExtractionTool(FIELD_DEFS.map(f => f.dbName))],
    tool_choice: { type: 'tool', name: 'extract_case_fields' },
    temperature: 0,
  });

  // 4. Upsert each field into extracted_fields
  for (const { dbName: fieldName } of FIELD_DEFS) {
    const fieldData = result[fieldName] as {
      value: string | null;
      block_ids: string[];
      confidence: number;
      is_null: boolean;
      null_reason: string | null;
    } | undefined;
    if (!fieldData) continue;

    await prisma.extractedField.upsert({
      where: { jobId_fieldName: { jobId, fieldName } },
      create: {
        jobId,
        fieldName,
        value: fieldData.value,
        blockIds: fieldData.block_ids,
        confidence: fieldData.confidence,
        isNull: fieldData.is_null,
        nullReason: fieldData.null_reason,
      },
      update: {
        value: fieldData.value,
        blockIds: fieldData.block_ids,
        confidence: fieldData.confidence,
        isNull: fieldData.is_null,
        nullReason: fieldData.null_reason,
        updatedAt: new Date(),
      },
    });
  }
}

export async function extractFirmFieldsFromTemplate(jobId: string, userId: string): Promise<void> {
  const template = await prisma.template.findFirst({
    where: { jobId },
    orderBy: { ingestedAt: 'desc' },
    select: { id: true, s3KeyOriginal: true },
  });
  if (!template?.s3KeyOriginal) return;

  const s3Obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyOriginal }));
  if (!s3Obj.Body) return;

  const chunks: Uint8Array[] = [];
  for await (const chunk of s3Obj.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const headerFooterText = parseDocxHeaderFooter(buffer);
  if (!headerFooterText.trim()) {
    await logJobEvent(jobId, 'post-jobs-extract', 'info', 'Template header/footer is empty — skipping firm field extraction');
    return;
  }

  await logJobEvent(jobId, 'post-jobs-extract', 'info', 'Extracting firm fields from template header/footer');

  const result = await invokeModelWithTools({
    modelId: getBasicModelId(),
    feature: LlmFeature.case_extraction,
    userId,
    system: `You are a precise legal document extraction assistant.
Extract attorney and law firm identity fields from the provided header/footer text of a demand letter template.
For every field, set block_ids to an empty array (this is static template text, not a sourced block).
If a field cannot be found, set is_null to true.
Never invent values.`,
    messages: [
      {
        role: 'user',
        content: `Here is the header and footer text from the law firm's demand letter template:\n\n${headerFooterText}\n\nPlease extract the firm identity fields using the extract_case_fields tool.`,
      },
    ],
    tools: [buildExtractionTool(FIRM_FIELD_NAMES)],
    tool_choice: { type: 'tool', name: 'extract_case_fields' },
  });

  for (const fieldName of FIRM_FIELD_NAMES) {
    const fieldData = result[fieldName] as {
      value: string | null;
      block_ids: string[];
      confidence: number;
      is_null: boolean;
      null_reason: string | null;
    } | undefined;
    if (!fieldData || fieldData.is_null) continue;

    await prisma.extractedField.upsert({
      where: { jobId_fieldName: { jobId, fieldName } },
      create: {
        jobId,
        fieldName,
        value: fieldData.value,
        blockIds: [],
        confidence: fieldData.confidence,
        isNull: false,
        nullReason: null,
      },
      update: {
        value: fieldData.value,
        blockIds: [],
        confidence: fieldData.confidence,
        isNull: false,
        nullReason: null,
        updatedAt: new Date(),
      },
    });

    // Backfill the template slot default value (don't overwrite existing paragraph context)
    await prisma.templateSlot.updateMany({
      where: {
        template: { jobId },
        slotName: fieldName,
        defaultValue: null,
      },
      data: { defaultValue: fieldData.value },
    });
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export async function logCaseDocumentSlotCoverage(jobId: string): Promise<void> {
  const template = await prisma.template.findFirst({
    where: { jobId },
    orderBy: { ingestedAt: 'desc' },
    select: {
      id: true,
      slots: {
        select: { slotName: true },
        orderBy: { slotName: 'asc' },
      },
    },
  });
  const slotNames = template?.slots.map((slot) => slot.slotName) ?? [];
  if (!template || slotNames.length === 0) return;

  const [sourceFiles, extractedFields] = await Promise.all([
    prisma.sourceFile.findMany({
      where: { jobId, status: 'complete' },
      select: {
        id: true,
        s3Key: true,
        blocks: { select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.extractedField.findMany({
      where: {
        jobId,
        fieldName: { in: slotNames },
        isNull: false,
      },
      select: {
        fieldName: true,
        blockIds: true,
      },
    }),
  ]);

  const fieldsByBlockId = new Map<string, Set<string>>();
  for (const field of extractedFields) {
    for (const blockId of asStringArray(field.blockIds)) {
      const fields = fieldsByBlockId.get(blockId) ?? new Set<string>();
      fields.add(field.fieldName);
      fieldsByBlockId.set(blockId, fields);
    }
  }

  for (const sourceFile of sourceFiles) {
    const matchedSlots = new Set<string>();
    for (const block of sourceFile.blocks) {
      const fields = fieldsByBlockId.get(block.id);
      if (!fields) continue;
      for (const fieldName of fields) matchedSlots.add(fieldName);
    }

    const fileName = sourceFile.s3Key.split('/').pop()?.replace(/^[0-9a-f-]+-/i, '') ?? sourceFile.s3Key;
    const matchedSlotNames = [...matchedSlots].sort();
    await logJobEvent(jobId, 'post-jobs-extract', 'info',
      `Case document analyzed: ${fileName}. Matched ${matchedSlotNames.length} of ${slotNames.length} variable slots`, {
        context: {
          sourceFileId: sourceFile.id,
          s3Key: sourceFile.s3Key,
          templateId: template.id,
          matchedVariableSlots: matchedSlotNames.length,
          totalVariableSlots: slotNames.length,
          matchedSlotNames,
        },
      });
  }
}

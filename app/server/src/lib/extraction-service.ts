import { prisma, LlmFeature } from '@demand-letter/db';
import { getBasicModelId, invokeModelWithTools } from './ai-provider';
import { buildExtractionTool, CANONICAL_FIELDS } from './extraction-schema';

export async function runGroundedExtraction(jobId: string, userId: string): Promise<void> {
  // 1. Fetch all blocks for the job
  const blocks = await prisma.block.findMany({
    where: { sourceFile: { jobId } },
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
    tools: [buildExtractionTool()],
    tool_choice: { type: 'tool', name: 'extract_case_fields' },
  });

  // 4. Upsert each field into extracted_fields
  for (const fieldName of CANONICAL_FIELDS) {
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

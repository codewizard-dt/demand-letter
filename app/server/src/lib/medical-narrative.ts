import { LlmFeature, prisma } from '@demand-letter/db';

import { invokeModelStream } from './ai-provider';

const MEDICAL_FIELDS = [
  'diagnoses',
  'treating_providers',
  'examination_findings',
  'imaging_results',
  'future_treatment',
  'first_treatment_date',
  'last_treatment_date',
  'treatment_summary',
];

const SYSTEM_PROMPT = `You are a legal medical narrative writer. Generate the §4 medical narrative for a personal injury demand letter. Every factual claim must be followed by [block-<id>] citing the exact block ID. Never invent diagnoses, medications, or provider names not found in the provided blocks.`;

export async function generateMedicalNarrative(
  jobId: string,
  modelId: string,
  userId: string,
): Promise<{ text: string; groundingReport: { validCitations: number; unknownCitations: string[] } }> {
  const fields = await prisma.extractedField.findMany({
    where: { jobId, fieldName: { in: MEDICAL_FIELDS } },
    select: { fieldName: true, value: true, blockIds: true },
  });

  const allBlockIds = new Set<string>();
  for (const field of fields) {
    const ids = field.blockIds as string[];
    for (const id of ids) {
      allBlockIds.add(id);
    }
  }

  const blocks = await prisma.block.findMany({
    where: { id: { in: [...allBlockIds] } },
    select: { id: true, text: true, page: true },
  });

  const fieldsSection = fields
    .map((f) => `${f.fieldName}: ${f.value ?? '(not found)'}`)
    .join('\n');

  const blocksSection = blocks
    .map((b) => `[block-${b.id}] (page ${b.page}): ${b.text}`)
    .join('\n');

  const userMessage = `## Extracted Medical Fields\n${fieldsSection}\n\n## Supporting Blocks\n${blocksSection}\n\nWrite the §4 medical narrative prose now.`;

  const stream = await invokeModelStream({
    modelId,
    feature: LlmFeature.medical_narrative,
    userId,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Collect full text from stream
  let text = '';
  for await (const chunk of stream) {
    text += chunk;
  }

  // Grounding validation: verify all [block-<id>] citations reference known block IDs
  const CITATION_RE = /\[block-([^\]]+)\]/g;
  const cited = new Set<string>();
  for (const match of text.matchAll(CITATION_RE)) {
    cited.add(match[1]);
  }
  const unknownCitations = [...cited].filter((id) => !allBlockIds.has(id));
  const validCitations = cited.size - unknownCitations.length;
  const groundingReport = { validCitations, unknownCitations };

  if (unknownCitations.length > 0) {
    console.warn(
      `[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}`,
    );
  }

  return { text, groundingReport };
}

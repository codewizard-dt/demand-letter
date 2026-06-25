import { prisma } from '@demand-letter/db';

export interface GapItem {
  fieldName: string;
  nullReason: string | null;
  acceptMissing: boolean;
}

export interface GapReport {
  covered: number;
  total: number;
  gaps: GapItem[];
}

export async function computeGapReport(jobId: string): Promise<GapReport> {
  // 1. Fetch the template for this job (most recently ingested)
  const template = await prisma.template.findFirst({
    where: { jobId },
    orderBy: { ingestedAt: 'desc' },
    select: { id: true },
  });
  if (!template) {
    throw new Error(`No template found for job ${jobId}`);
  }

  const slots = await prisma.templateSlot.findMany({
    where: { templateId: template.id },
    select: { slotName: true },
  });

  // 2. Fetch extracted_fields for this job
  const fields = await prisma.extractedField.findMany({
    where: { jobId },
    select: { fieldName: true, isNull: true, confidence: true, source: true, acceptMissing: true, nullReason: true },
  });
  const fieldMap = new Map(fields.map((f) => [f.fieldName, f]));

  const threshold = parseFloat(process.env.SUFFICIENCY_THRESHOLD ?? '0.80');

  const gaps: GapItem[] = [];
  for (const slot of slots) {
    const f = fieldMap.get(slot.slotName);
    const covered =
      f !== undefined &&
      (
        f.acceptMissing ||
        f.source === 'attorney-judgment' ||
        (!f.isNull && f.confidence >= threshold)
      );
    if (!covered) {
      gaps.push({
        fieldName: slot.slotName,
        nullReason: f?.nullReason ?? null,
        acceptMissing: f?.acceptMissing ?? false,
      });
    }
  }

  return { covered: slots.length - gaps.length, total: slots.length, gaps };
}
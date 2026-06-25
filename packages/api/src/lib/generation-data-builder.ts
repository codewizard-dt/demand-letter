import { prisma } from '@demand-letter/db';
import { dbNameToTagName, FIELD_SCHEMA } from './field-schema';

export type GenerationData = Record<string, string | Array<Record<string, string>>>;

export async function buildDataObject(jobId: string): Promise<GenerationData> {
  const rows = await prisma.extractedField.findMany({
    where: { jobId },
    select: { fieldName: true, value: true, isNull: true, source: true, acceptMissing: true },
  });

  if (rows.length === 0) {
    throw new Error(`No extracted fields found for job ${jobId}`);
  }

  const result: GenerationData = {};

  for (const row of rows) {
    const def = FIELD_SCHEMA.find(f => f.dbName === row.fieldName);
    if (def?.isLoop) continue; // handled separately below

    const key = dbNameToTagName(row.fieldName) ?? row.fieldName;

    if (!row.isNull && row.value !== null) {
      result[key] = row.value;
    } else if (row.acceptMissing) {
      result[key] = '';
    }
    // isNull === true && acceptMissing === false → omit entirely
  }

  // Process loop fields (e.g. specials table)
  for (const row of rows) {
    const def = FIELD_SCHEMA.find(f => f.dbName === row.fieldName);
    if (!def?.isLoop) continue;
    if (!row.value) {
      result[def.tagName] = [];
      continue;
    }
    try {
      result[def.tagName] = JSON.parse(row.value);
    } catch {
      result[def.tagName] = [];
    }
  }

  return result;
}

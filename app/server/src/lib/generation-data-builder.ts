import { prisma } from '@demand-letter/db';
import { dbNameToTagName, FIELD_SCHEMA } from './field-schema';
import { suffixedTemplateSlotName } from './template-slot-names';

export type GenerationData = Record<string, string | Array<Record<string, string>>>;

function setValueWithAlias(
  result: GenerationData,
  dbName: string,
  tagName: string,
  value: string | Array<Record<string, string>>,
): void {
  result[tagName] = value;
  if (dbName !== tagName) {
    result[dbName] = value;
  }
  if (typeof value === 'string') {
    setLineSuffixAliases(result, dbName, tagName, value);
  }
}

function isAddressField(dbName: string): boolean {
  return dbName.endsWith('_address');
}

/**
 * Split an address value into its display lines. Prefers explicit line breaks;
 * for a single-line US address, splits before the trailing "City, ST ZIP" so the
 * street occupies line 1 and the city/state/zip line 2 (address-form style).
 */
export function splitAddressLines(value: string): string[] {
  const byNewline = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  const match = value.match(/^(.+?),\s*([^,]+,\s*[A-Z]{2}\.?\s*\d{5}(?:-\d{4})?)\s*$/);
  if (match?.[1] && match[2]) return [match[1].trim(), match[2].trim()];
  return byNewline;
}

function setLineSuffixAliases(
  result: GenerationData,
  dbName: string,
  tagName: string,
  value: string,
): void {
  const lines = isAddressField(dbName)
    ? splitAddressLines(value)
    : value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return;
  lines.forEach((line, index) => {
    const suffixIndex = index + 1;
    result[suffixedTemplateSlotName(dbName, suffixIndex)] = line;
    if (dbName !== tagName) {
      result[suffixedTemplateSlotName(tagName, suffixIndex)] = line;
    }
  });
}

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
      setValueWithAlias(result, row.fieldName, key, row.value);
    } else if (row.acceptMissing) {
      setValueWithAlias(result, row.fieldName, key, '');
    }
    // isNull === true && acceptMissing === false → omit entirely
  }

  // Process loop fields (e.g. specials table)
  for (const row of rows) {
    const def = FIELD_SCHEMA.find(f => f.dbName === row.fieldName);
    if (!def?.isLoop) continue;
    if (!row.value) {
      setValueWithAlias(result, row.fieldName, def.tagName, []);
      continue;
    }
    try {
      setValueWithAlias(result, row.fieldName, def.tagName, JSON.parse(row.value) as Array<Record<string, string>>);
    } catch {
      // Value isn't a JSON array (extraction returned prose) — expose it as a
      // scalar string so a {loop_field} tag renders the content instead of blank.
      setValueWithAlias(result, row.fieldName, def.tagName, row.value);
    }
  }

  return result;
}

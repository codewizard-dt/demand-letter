import { dbNameToTagName, tagNameToDbName } from './field-schema';
import { isSystemTemplateFieldName } from './docx-system-fields';

const SUFFIX_RE = /^(.+)_([1-9]\d*)$/;

export function baseTemplateSlotName(slotName: string): string {
  const match = SUFFIX_RE.exec(slotName);
  if (!match) return slotName;
  const base = match[1];
  if (!base) return slotName; // should not happen: regex group 1 always captures
  return dbNameToTagName(base) || tagNameToDbName(base) || isSystemTemplateFieldName(base)
    ? base
    : slotName;
}

export function templateSlotFieldCandidates(slotName: string): string[] {
  const base = baseTemplateSlotName(slotName);
  const candidates = [slotName, base];
  const dbName = tagNameToDbName(base);
  const tagName = dbNameToTagName(base);
  if (dbName) candidates.push(dbName);
  if (tagName) candidates.push(tagName);
  return [...new Set(candidates)];
}

export function isSuffixedTemplateSlotName(slotName: string): boolean {
  return baseTemplateSlotName(slotName) !== slotName;
}

export function suffixedTemplateSlotName(slotName: string, index: number): string {
  return `${slotName}_${index}`;
}

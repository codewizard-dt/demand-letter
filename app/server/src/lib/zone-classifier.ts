import { LlmFeature, ZoneType } from '@demand-letter/db';
import { getBasicModelId, invokeModel } from './ai-provider';
import { CANONICAL_FIELDS } from './zone-field-schema';
import { isSystemTemplateFieldName, SYSTEM_TEMPLATE_FIELDS } from './docx-system-fields';
import { suffixedTemplateSlotName } from './template-slot-names';

export interface ZoneClassification {
  zoneIndex: number;
  type: ZoneType;
  suggestedFieldName: string | null;
  templateText?: string | null;
}

const CANONICAL_FIELD_SET = new Set([
  ...CANONICAL_FIELDS.split('\n'),
  ...Object.keys(SYSTEM_TEMPLATE_FIELDS),
]);

function isDeterministicBoilerplateZone(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length === 0 || /^(?:header|footer|document)\s+image$/i.test(trimmed);
}

function normalizeClassification(
  zone: { zoneIndex: number; textContent: string },
  classification: ZoneClassification | undefined,
): ZoneClassification {
  if (isDeterministicBoilerplateZone(zone.textContent)) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null };
  }

  if (!classification) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null };
  }

  if (classification.type !== ZoneType.variable_populated) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null };
  }

  const fieldName = classification.suggestedFieldName?.trim() ?? '';
  if (!CANONICAL_FIELD_SET.has(fieldName) && !isSystemTemplateFieldName(fieldName)) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null };
  }

  return {
    zoneIndex: zone.zoneIndex,
    type: ZoneType.variable_populated,
    suggestedFieldName: fieldName,
    templateText: normalizeTemplateText(zone.textContent, fieldName, classification.templateText),
  };
}

function normalizeTemplateText(
  textContent: string,
  fieldName: string,
  templateText: string | null | undefined,
): string | null {
  const trimmed = templateText?.trim();
  if (trimmed?.includes(`{${fieldName}}`)) return trimmed;
  return inferMixedTemplateText(textContent, fieldName);
}

function inferMixedTemplateText(textContent: string, fieldName: string): string | null {
  if (!isProperNameField(fieldName)) return null;
  const text = textContent.trim();
  const match = /^(.*:\s*)([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,5})$/.exec(text);
  if (!match) return null;
  return `${match[1]}{${fieldName}}`;
}

function isProperNameField(fieldName: string): boolean {
  return fieldName.endsWith('_name') || fieldName.endsWith('Name') || [
    'claimant_name',
    'insured_name',
    'adjuster_name',
    'attorney_name',
    'defendant_name',
    'treating_physician_name',
  ].includes(fieldName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function variableValueForDuplicateCheck(
  zone: { textContent: string },
  classification: ZoneClassification,
): string {
  const fieldName = classification.suggestedFieldName;
  const templateText = classification.templateText;
  if (!fieldName || !templateText?.includes(`{${fieldName}}`)) {
    return normalizeDuplicateValue(zone.textContent);
  }
  const [prefix, suffix] = templateText.split(`{${fieldName}}`);
  const pattern = new RegExp(`^${escapeRegExp(prefix ?? '')}(.*)${escapeRegExp(suffix ?? '')}$`);
  const match = pattern.exec(zone.textContent.trim());
  return normalizeDuplicateValue(match?.[1] ?? zone.textContent);
}

function normalizeDuplicateValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function applyDistinctDuplicateSuffixes(
  zones: Array<{ zoneIndex: number; textContent: string }>,
  classifications: ZoneClassification[],
): ZoneClassification[] {
  const zoneByIndex = new Map(zones.map((zone) => [zone.zoneIndex, zone]));
  const groups = new Map<string, Map<string, number>>();

  for (const classification of classifications) {
    const fieldName = classification.suggestedFieldName;
    if (classification.type !== ZoneType.variable_populated || !fieldName || isSystemTemplateFieldName(fieldName)) {
      continue;
    }
    const zone = zoneByIndex.get(classification.zoneIndex);
    if (!zone) continue;
    const values = groups.get(fieldName) ?? new Map<string, number>();
    const value = variableValueForDuplicateCheck(zone, classification);
    if (!values.has(value)) values.set(value, values.size + 1);
    groups.set(fieldName, values);
  }

  return classifications.map((classification) => {
    const fieldName = classification.suggestedFieldName;
    if (classification.type !== ZoneType.variable_populated || !fieldName) return classification;
    const zone = zoneByIndex.get(classification.zoneIndex);
    const values = groups.get(fieldName);
    if (!zone || !values || values.size <= 1) return classification;

    const suffix = values.get(variableValueForDuplicateCheck(zone, classification));
    if (!suffix) return classification;
    const nextFieldName = suffixedTemplateSlotName(fieldName, suffix);
    return {
      ...classification,
      suggestedFieldName: nextFieldName,
      templateText: classification.templateText?.replace(`{${fieldName}}`, `{${nextFieldName}}`) ?? null,
    };
  });
}

export async function classifyZones(
  zones: Array<{ zoneIndex: number; textContent: string }>,
  userId: string,
  trace?: { jobId?: string; requestId?: string; traceId?: string },
): Promise<ZoneClassification[]> {
  const modelId = getBasicModelId();
  const modelZones = zones.filter((zone) => !isDeterministicBoilerplateZone(zone.textContent));
  if (modelZones.length === 0) {
    return zones.map((zone) => normalizeClassification(zone, undefined));
  }

  const systemPrompt =
    `You are a legal document classifier. Classify each zone of a demand letter template as either "boilerplate_verbatim" (fixed legal language that must never be paraphrased) or "variable_populated" (a fill-in slot). For variable zones, suggest a field name from this canonical schema:\n${CANONICAL_FIELDS}\n\nSystem fields for document pagination:\npageNumber\npageCount\n\n` +
    `A zone is variable_populated only when the exact zone text is case-specific data that should be replaced during generation. Headings, legal prose, labels, law firm branding, spacer/new-line zones, and embedded-image placeholders are boilerplate_verbatim.\n` +
    `If a zone combines fixed label text with a variable value, set templateText to the exact zone text with only the variable value replaced by {field_name}; for a pure variable zone, set templateText to null.\n` +
    `Respond ONLY with a JSON array with exactly one object for each supplied zone: [{"zoneIndex": N, "type": "boilerplate_verbatim"|"variable_populated", "suggestedFieldName": "field_name"|null, "templateText": "literal {field_name} text"|null}]`;

  const userContent = modelZones.map(z => `Zone ${z.zoneIndex}: "${z.textContent}"`).join('\n');

  const text = await invokeModel({
    modelId,
    feature: LlmFeature.zone_classification,
    userId,
    jobId: trace?.jobId,
    requestId: trace?.requestId,
    traceId: trace?.traceId,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0,
  });

  const classificationMap = new Map(parseZoneClassifications(text).map((classification) => [
    classification.zoneIndex,
    classification,
  ]));
  return applyDistinctDuplicateSuffixes(
    zones,
    zones.map((zone) => normalizeClassification(zone, classificationMap.get(zone.zoneIndex))),
  );
}

export function parseZoneClassifications(text: string): ZoneClassification[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleaned) as ZoneClassification[];
}

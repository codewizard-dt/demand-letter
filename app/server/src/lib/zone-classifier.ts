import { LlmFeature, ZoneType } from '@demand-letter/db';
import { getBasicModelId, invokeModel } from './ai-provider';
import { CANONICAL_FIELDS } from './zone-field-schema';

export interface ZoneClassification {
  zoneIndex: number;
  type: ZoneType;
  suggestedFieldName: string | null;
}

const CANONICAL_FIELD_SET = new Set(CANONICAL_FIELDS.split('\n'));

function isDeterministicBoilerplateZone(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length === 0 || /^(?:header|footer|document)\s+image$/i.test(trimmed);
}

function normalizeClassification(
  zone: { zoneIndex: number; textContent: string },
  classification: ZoneClassification | undefined,
): ZoneClassification {
  if (isDeterministicBoilerplateZone(zone.textContent)) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null };
  }

  if (!classification) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null };
  }

  if (classification.type !== ZoneType.variable_populated) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null };
  }

  const fieldName = classification.suggestedFieldName?.trim() ?? '';
  if (!CANONICAL_FIELD_SET.has(fieldName)) {
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null };
  }

  return { zoneIndex: zone.zoneIndex, type: ZoneType.variable_populated, suggestedFieldName: fieldName };
}

export async function classifyZones(
  zones: Array<{ zoneIndex: number; textContent: string }>,
  userId: string,
): Promise<ZoneClassification[]> {
  const modelId = getBasicModelId();
  const modelZones = zones.filter((zone) => !isDeterministicBoilerplateZone(zone.textContent));
  if (modelZones.length === 0) {
    return zones.map((zone) => normalizeClassification(zone, undefined));
  }

  const systemPrompt =
    `You are a legal document classifier. Classify each zone of a demand letter template as either "boilerplate_verbatim" (fixed legal language that must never be paraphrased) or "variable_populated" (a fill-in slot). For variable zones, suggest a field name from this canonical schema:\n${CANONICAL_FIELDS}\n\n` +
    `A zone is variable_populated only when the exact zone text is case-specific data that should be replaced during generation. Headings, legal prose, labels, law firm branding, spacer/new-line zones, and embedded-image placeholders are boilerplate_verbatim.\n` +
    `Respond ONLY with a JSON array with exactly one object for each supplied zone: [{"zoneIndex": N, "type": "boilerplate_verbatim"|"variable_populated", "suggestedFieldName": "field_name"|null}]`;

  const userContent = modelZones.map(z => `Zone ${z.zoneIndex}: "${z.textContent}"`).join('\n');

  const text = await invokeModel({
    modelId,
    feature: LlmFeature.zone_classification,
    userId,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0,
  });

  const classificationMap = new Map(parseZoneClassifications(text).map((classification) => [
    classification.zoneIndex,
    classification,
  ]));
  return zones.map((zone) => normalizeClassification(zone, classificationMap.get(zone.zoneIndex)));
}

export function parseZoneClassifications(text: string): ZoneClassification[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleaned) as ZoneClassification[];
}

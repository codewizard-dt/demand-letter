import { LlmFeature, ZoneType } from '@demand-letter/db';
import { getBasicModelId, invokeModel } from './ai-provider';
import { CANONICAL_FIELDS } from './zone-field-schema';

export interface ZoneClassification {
  zoneIndex: number;
  type: ZoneType;
  suggestedFieldName: string | null;
}

export async function classifyZones(
  zones: Array<{ zoneIndex: number; textContent: string }>,
  userId: string,
): Promise<ZoneClassification[]> {
  const modelId = getBasicModelId();

  const systemPrompt =
    `You are a legal document classifier. Classify each zone of a demand letter template as either "boilerplate_verbatim" (fixed legal language that must never be paraphrased) or "variable_populated" (a fill-in slot). For variable zones, suggest a field name from this canonical schema:\n${CANONICAL_FIELDS}\n\n` +
    `Respond ONLY with a JSON array: [{"zoneIndex": N, "type": "boilerplate_verbatim"|"variable_populated", "suggestedFieldName": "field_name"|null}]`;

  const userContent = zones.map(z => `Zone ${z.zoneIndex}: "${z.textContent}"`).join('\n');

  const text = await invokeModel({
    modelId,
    feature: LlmFeature.zone_classification,
    userId,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  return parseZoneClassifications(text);
}

export function parseZoneClassifications(text: string): ZoneClassification[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleaned) as ZoneClassification[];
}

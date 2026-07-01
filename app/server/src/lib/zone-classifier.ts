import { LlmFeature, ZoneType } from '@demand-letter/db';
import { getBasicModelId, invokeModel } from './ai-provider';
import { CANONICAL_FIELDS } from './zone-field-schema';
import { isSystemTemplateFieldName, SYSTEM_TEMPLATE_FIELDS } from './docx-system-fields';

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

  // Build the normalised templateText (single-variable or multi-variable)
  const rawTemplateText = normalizeTemplateText(
    zone.textContent,
    classification.suggestedFieldName?.trim() ?? '',
    classification.templateText,
  );

  // Strip any {field} tags that are not in the canonical schema
  let cleanedTemplateText = rawTemplateText;
  if (cleanedTemplateText) {
    cleanedTemplateText = cleanedTemplateText.replace(
      /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g,
      (match, field: string) => {
        if (CANONICAL_FIELD_SET.has(field) || isSystemTemplateFieldName(field)) return match;
        // Strip non-canonical field by reverting to the literal token name
        return field;
      },
    );
  }

  // Derive suggestedFieldName as the first canonical {field} in cleanedTemplateText
  const firstFieldMatch = cleanedTemplateText
    ? /\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/.exec(cleanedTemplateText)
    : null;
  const derivedFieldName = firstFieldMatch?.[1] ?? null;

  // Also accept the LLM's suggestedFieldName if it is canonical and present in the template
  const llmFieldName = classification.suggestedFieldName?.trim() ?? '';
  const finalFieldName =
    (CANONICAL_FIELD_SET.has(llmFieldName) || isSystemTemplateFieldName(llmFieldName))
      ? llmFieldName
      : derivedFieldName;

  if (!finalFieldName) {
    // No valid field names remain — treat as boilerplate
    return { zoneIndex: zone.zoneIndex, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null };
  }

  return {
    zoneIndex: zone.zoneIndex,
    type: ZoneType.variable_populated,
    suggestedFieldName: finalFieldName,
    templateText: cleanedTemplateText,
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
    `If a zone contains variable values (case-specific data), set templateText to the FULL zone text with EVERY variable value replaced by the appropriate {field_name} placeholder from the canonical schema. A single zone may contain multiple {field_name} placeholders. Set suggestedFieldName to the first (primary) canonical field name used. For a zone that is a SINGLE pure variable with no surrounding static text, set templateText to null and suggestedFieldName to the field name.\n` +
    `Respond ONLY with a JSON array with exactly one object for each supplied zone: [{"zoneIndex": N, "type": "boilerplate_verbatim"|"variable_populated", "suggestedFieldName": "field_name"|null, "templateText": "full template with {field1} and {field2} etc"|null}]`;

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

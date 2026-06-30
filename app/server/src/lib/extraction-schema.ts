export const CANONICAL_FIELDS = [
  // Claimant / plaintiff
  'claimant_name',
  'claimant_dob',
  'claimant_address',
  'claimant_phone',
  'claimant_email',

  // Incident
  'incident_date',
  'incident_location',
  'incident_description',
  'incident_police_report_number',

  // Defendant / insurer
  'defendant_name',
  'defendant_address',
  'insurer_name',
  'insurer_claim_number',
  'insurer_adjuster_name',
  'insurer_adjuster_phone',
  'insurer_adjuster_email',
  'policy_number',
  'policy_limits',

  // Medical treatment
  'treating_physician_name',
  'treating_facility_name',
  'first_treatment_date',
  'last_treatment_date',
  'diagnosis_codes',
  'treatment_summary',
  'future_treatment_recommended',
  'future_treatment_description',

  // Medical costs
  'total_medical_bills',
  'paid_by_health_insurance',
  'outstanding_balance',
  'future_medical_estimate',

  // Lost wages
  'employer_name',
  'lost_wages_amount',
  'lost_wages_period',
  'return_to_work_date',

  // Damages
  'pain_and_suffering_description',
  'general_damages_estimate',
  'demand_amount',
  'demand_expiry_date',

  // Attorney
  'attorney_name',
  'attorney_bar_number',
  'law_firm_name',
  'law_firm_address',
] as const;

export type FieldName = (typeof CANONICAL_FIELDS)[number];

const FIELD_SCHEMA = {
  type: 'object',
  properties: {
    value: { type: ['string', 'null'] },
    block_ids: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    is_null: { type: 'boolean' },
    null_reason: { type: ['string', 'null'] },
  },
  required: ['value', 'block_ids', 'confidence', 'is_null', 'null_reason'],
} as const;

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export function buildExtractionTool(fieldNames: readonly string[] = CANONICAL_FIELDS): Tool {
  const properties: Record<string, unknown> = {};
  for (const field of fieldNames) {
    properties[field] = FIELD_SCHEMA;
  }

  return {
    name: 'extract_case_fields',
    description:
      'Extract structured fields from legal and medical case documents. For every field, cite the exact block IDs that support the extracted value.',
    input_schema: {
      type: 'object',
      properties,
      required: [...fieldNames],
    },
  };
}

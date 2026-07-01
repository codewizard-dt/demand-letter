export interface FieldDef {
  dbName: string;    // snake_case, matches extracted_fields.fieldName
  tagName: string;   // camelCase, matches docxtemplater {tag}
  required: boolean; // if true, sufficiency gate treats absence as a gap
  isLoop: boolean;   // if true, value is an array (handled by TASK-039)
}

// Union of zone-field-schema.ts (40 template-side fields) and
// extraction-schema.ts (42 extraction-side fields).
// isLoop: true only for per_provider_line_items.
// required: false for fields that are optional in template zones.
export const FIELD_SCHEMA: readonly FieldDef[] = [
  // --- From zone-field-schema.ts (template-side canonical fields) ---
  { dbName: 'letter_date', tagName: 'letterDate', required: true, isLoop: false },
  { dbName: 'delivery_method', tagName: 'deliveryMethod', required: true, isLoop: false },
  { dbName: 'adjuster_name', tagName: 'adjusterName', required: true, isLoop: false },
  { dbName: 'adjuster_title', tagName: 'adjusterTitle', required: true, isLoop: false },
  { dbName: 'insurer_name', tagName: 'insurerName', required: true, isLoop: false },
  { dbName: 'insurer_address', tagName: 'insurerAddress', required: true, isLoop: false },
  { dbName: 'claim_number', tagName: 'claimNumber', required: true, isLoop: false },
  { dbName: 'insured_name', tagName: 'insuredName', required: true, isLoop: false },
  { dbName: 'claimant_name', tagName: 'claimantName', required: true, isLoop: false },
  { dbName: 'date_of_loss', tagName: 'dateOfLoss', required: true, isLoop: false },
  { dbName: 'demand_expiry_date', tagName: 'demandExpiryDate', required: true, isLoop: false },
  { dbName: 'incident_date', tagName: 'incidentDate', required: true, isLoop: false },
  { dbName: 'incident_time', tagName: 'incidentTime', required: false, isLoop: false },
  { dbName: 'incident_location', tagName: 'incidentLocation', required: true, isLoop: false },
  { dbName: 'traffic_conditions', tagName: 'trafficConditions', required: false, isLoop: false },
  { dbName: 'claimant_conduct', tagName: 'claimantConduct', required: false, isLoop: false },
  { dbName: 'at_fault_party', tagName: 'atFaultParty', required: true, isLoop: false },
  { dbName: 'at_fault_conduct', tagName: 'atFaultConduct', required: true, isLoop: false },
  { dbName: 'liability_admission_status', tagName: 'liabilityAdmissionStatus', required: false, isLoop: false },
  { dbName: 'diagnoses', tagName: 'diagnoses', required: true, isLoop: false },
  { dbName: 'treating_providers', tagName: 'treatingProviders', required: true, isLoop: false },
  { dbName: 'examination_findings', tagName: 'examinationFindings', required: false, isLoop: false },
  { dbName: 'imaging_results', tagName: 'imagingResults', required: false, isLoop: false },
  { dbName: 'future_treatment', tagName: 'futureTreatment', required: false, isLoop: false },
  { dbName: 'per_provider_line_items', tagName: 'specials', required: false, isLoop: true },
  { dbName: 'total_medical_specials', tagName: 'totalMedicalSpecials', required: true, isLoop: false },
  { dbName: 'future_medical_reserve', tagName: 'futureMedicalReserve', required: false, isLoop: false },
  { dbName: 'occupational_impact_narrative', tagName: 'occupationalImpactNarrative', required: false, isLoop: false },
  { dbName: 'general_damages_figure', tagName: 'generalDamagesFigure', required: true, isLoop: false },
  { dbName: 'statutory_citation', tagName: 'statutoryCitation', required: false, isLoop: false },
  { dbName: 'demand_amount', tagName: 'demandAmount', required: true, isLoop: false },
  { dbName: 'policy_limits', tagName: 'policyLimits', required: true, isLoop: false },
  { dbName: 'lien_handling_terms', tagName: 'lienHandlingTerms', required: false, isLoop: false },
  { dbName: 'payee_instructions', tagName: 'payeeInstructions', required: false, isLoop: false },
  { dbName: 'release_scope', tagName: 'releaseScope', required: true, isLoop: false },
  { dbName: 'expiry_acceptance_mechanics', tagName: 'expiryAcceptanceMechanics', required: true, isLoop: false },
  { dbName: 'attorney_name', tagName: 'attorneyName', required: true, isLoop: false },
  { dbName: 'bar_affiliation', tagName: 'barAffiliation', required: false, isLoop: false },
  { dbName: 'firm_name', tagName: 'firmName', required: true, isLoop: false },
  { dbName: 'firm_address', tagName: 'firmAddress', required: true, isLoop: false },

  // --- Additional fields from extraction-schema.ts (not in zone-field-schema.ts) ---
  { dbName: 'claimant_dob', tagName: 'claimantDob', required: false, isLoop: false },
  { dbName: 'claimant_address', tagName: 'claimantAddress', required: false, isLoop: false },
  { dbName: 'claimant_phone', tagName: 'claimantPhone', required: false, isLoop: false },
  { dbName: 'claimant_email', tagName: 'claimantEmail', required: false, isLoop: false },
  { dbName: 'incident_description', tagName: 'incidentDescription', required: false, isLoop: false },
  { dbName: 'incident_police_report_number', tagName: 'incidentPoliceReportNumber', required: false, isLoop: false },
  { dbName: 'defendant_name', tagName: 'defendantName', required: false, isLoop: false },
  { dbName: 'defendant_address', tagName: 'defendantAddress', required: false, isLoop: false },
  { dbName: 'insurer_claim_number', tagName: 'insurerClaimNumber', required: false, isLoop: false },
  { dbName: 'insurer_adjuster_name', tagName: 'insurerAdjusterName', required: false, isLoop: false },
  { dbName: 'insurer_adjuster_phone', tagName: 'insurerAdjusterPhone', required: false, isLoop: false },
  { dbName: 'insurer_adjuster_email', tagName: 'insurerAdjusterEmail', required: false, isLoop: false },
  { dbName: 'policy_number', tagName: 'policyNumber', required: false, isLoop: false },
  { dbName: 'treating_physician_name', tagName: 'treatingPhysicianName', required: false, isLoop: false },
  { dbName: 'treating_facility_name', tagName: 'treatingFacilityName', required: false, isLoop: false },
  { dbName: 'first_treatment_date', tagName: 'firstTreatmentDate', required: false, isLoop: false },
  { dbName: 'last_treatment_date', tagName: 'lastTreatmentDate', required: false, isLoop: false },
  { dbName: 'diagnosis_codes', tagName: 'diagnosisCodes', required: false, isLoop: false },
  { dbName: 'treatment_summary', tagName: 'treatmentSummary', required: false, isLoop: false },
  { dbName: 'future_treatment_recommended', tagName: 'futureTreatmentRecommended', required: false, isLoop: false },
  { dbName: 'future_treatment_description', tagName: 'futureTreatmentDescription', required: false, isLoop: false },
  { dbName: 'total_medical_bills', tagName: 'totalMedicalBills', required: false, isLoop: false },
  { dbName: 'paid_by_health_insurance', tagName: 'paidByHealthInsurance', required: false, isLoop: false },
  { dbName: 'outstanding_balance', tagName: 'outstandingBalance', required: false, isLoop: false },
  { dbName: 'future_medical_estimate', tagName: 'futureMedicalEstimate', required: false, isLoop: false },
  { dbName: 'employer_name', tagName: 'employerName', required: false, isLoop: false },
  { dbName: 'lost_wages_amount', tagName: 'lostWagesAmount', required: false, isLoop: false },
  { dbName: 'lost_wages_period', tagName: 'lostWagesPeriod', required: false, isLoop: false },
  { dbName: 'return_to_work_date', tagName: 'returnToWorkDate', required: false, isLoop: false },
  { dbName: 'pain_and_suffering_description', tagName: 'painAndSufferingDescription', required: false, isLoop: false },
  { dbName: 'general_damages_estimate', tagName: 'generalDamagesEstimate', required: false, isLoop: false },
  { dbName: 'attorney_bar_number', tagName: 'attorneyBarNumber', required: false, isLoop: false },
  { dbName: 'law_firm_name', tagName: 'lawFirmName', required: false, isLoop: false },
  { dbName: 'law_firm_address', tagName: 'lawFirmAddress', required: false, isLoop: false },
];

// Fields whose values are standard legal-clause prose. When one of these is
// embedded mid-sentence in a "mixed" zone (literal frame + {field}, e.g.
// "…and not {release_scope}"), the injected value rarely fits the frame
// grammatically, so the injector keeps the template's own clause text instead.
const CLAUSE_PROSE_FIELDS = new Set<string>([
  'release_scope',
  'payee_instructions',
  'lien_handling_terms',
  'expiry_acceptance_mechanics',
]);

export function isClauseProseField(fieldName: string | null | undefined): boolean {
  return !!fieldName && CLAUSE_PROSE_FIELDS.has(fieldName);
}

export function dbNameToTagName(dbName: string): string | undefined {
  return FIELD_SCHEMA.find(f => f.dbName === dbName)?.tagName;
}

export function tagNameToDbName(tagName: string): string | undefined {
  return FIELD_SCHEMA.find(f => f.tagName === tagName)?.dbName;
}

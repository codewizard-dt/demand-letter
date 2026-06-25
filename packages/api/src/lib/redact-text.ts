export interface RedactableEntity {
  type: string;
  startOffset: number;
  endOffset: number;
}

const TOKEN_MAP: Record<string, string> = {
  PATIENT: '[PATIENT_NAME]',
  PERSON: '[PATIENT_NAME]',
  NAME: '[PATIENT_NAME]',
  DATE: '[DATE_OF_BIRTH]',
  DATE_TIME: '[DATE_OF_BIRTH]',
  AGE: '[AGE]',
  SSN: '[SSN]',
  PHONE_NUMBER: '[PHONE]',
  PHONE: '[PHONE]',
  EMAIL: '[EMAIL]',
  ADDRESS: '[ADDRESS]',
  LOCATION: '[ADDRESS]',
  DOCTOR: '[PROVIDER]',
  PROVIDER: '[PROVIDER]',
  HOSPITAL: '[PROVIDER]',
  ORGANIZATION: '[PROVIDER]',
  ID: '[ID]',
  MEDICAL_CONDITION: '[MEDICAL_CONDITION]',
  DIAGNOSIS: '[MEDICAL_CONDITION]',
};

export function redactText(text: string, entities: RedactableEntity[]): string {
  if (!entities.length) return text;
  // Sort descending so replacements don't shift subsequent offsets
  const sorted = [...entities].sort((a, b) => b.startOffset - a.startOffset);
  let result = text;
  for (const entity of sorted) {
    const token = TOKEN_MAP[entity.type] ?? '[PHI_ENTITY]';
    result = result.slice(0, entity.startOffset) + token + result.slice(entity.endOffset);
  }
  return result;
}

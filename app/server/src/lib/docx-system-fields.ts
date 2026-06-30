export const SYSTEM_TEMPLATE_FIELDS = {
  pageNumber: 'PAGE',
  pageCount: 'NUMPAGES',
} as const;

export type SystemTemplateFieldName = keyof typeof SYSTEM_TEMPLATE_FIELDS;

export function isSystemTemplateFieldName(fieldName: string): fieldName is SystemTemplateFieldName {
  return Object.prototype.hasOwnProperty.call(SYSTEM_TEMPLATE_FIELDS, fieldName);
}

export function getSystemFieldCode(fieldName: SystemTemplateFieldName): string {
  return SYSTEM_TEMPLATE_FIELDS[fieldName];
}

export function isSystemTemplateSlot(slotName: string): boolean {
  return isSystemTemplateFieldName(slotName);
}

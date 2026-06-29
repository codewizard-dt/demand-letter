const LOWER_TO_UPPER_WORD_BOUNDARY = /([a-z])([A-Z][a-z])/g;
const LETTER_TO_NUMBER_BOUNDARY = /([A-Za-z])(\d)/g;
const NUMBER_TO_LETTER_BOUNDARY = /(\d)([A-Za-z])/g;

export function repairMissingSpaces(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(LOWER_TO_UPPER_WORD_BOUNDARY, '$1 $2')
    .replace(LETTER_TO_NUMBER_BOUNDARY, '$1 $2')
    .replace(NUMBER_TO_LETTER_BOUNDARY, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ');
}

export function normalizeExtractedText(text: string): string {
  return repairMissingSpaces(text).trim();
}

export function findSpacingConcerns(text: string): string[] {
  const concerns: string[] = [];
  if (LOWER_TO_UPPER_WORD_BOUNDARY.test(text)) {
    concerns.push('Possible missing space between words.');
  }
  LOWER_TO_UPPER_WORD_BOUNDARY.lastIndex = 0;
  if (/[A-Za-z]\d|\d[A-Za-z]/.test(text)) {
    concerns.push('Possible missing space between text and number.');
  }
  return concerns;
}

const LOWER_TO_UPPER_WORD_BOUNDARY = /([a-z])([A-Z][a-z])/g;
const LETTER_TO_NUMBER_BOUNDARY = /([A-Za-z])(\d)/g;
const NUMBER_TO_LETTER_BOUNDARY = /(\d)([A-Za-z])/g;

function collapseExactDuplicateText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 12) return text;

  for (let chunkLength = 1; chunkLength <= Math.floor(trimmed.length / 2); chunkLength++) {
    if (trimmed.length % chunkLength !== 0) continue;
    const chunk = trimmed.slice(0, chunkLength);
    if (chunk.trim().length < 6) continue;
    if (chunk.repeat(trimmed.length / chunkLength) === trimmed) {
      const prefix = text.slice(0, text.indexOf(trimmed));
      const suffixStart = text.indexOf(trimmed) + trimmed.length;
      return `${prefix}${chunk}${text.slice(suffixStart)}`;
    }
  }

  return text;
}

function collapseDuplicateTokenRuns(text: string): string {
  const leading = text.match(/^\s*/)?.[0] ?? '';
  const trailing = text.match(/\s*$/)?.[0] ?? '';
  const body = text.trim();
  if (!body) return text;

  const tokens = body.split(/\s+/);
  if (tokens.length < 6) return text;

  for (let runLength = 3; runLength <= Math.floor(tokens.length / 2); runLength++) {
    if (tokens.length % runLength !== 0) continue;
    const run = tokens.slice(0, runLength);
    const repeats = tokens.length / runLength;
    let duplicated = true;
    for (let repeat = 1; repeat < repeats; repeat++) {
      const offset = repeat * runLength;
      for (let index = 0; index < runLength; index++) {
        if (tokens[offset + index] !== run[index]) {
          duplicated = false;
          break;
        }
      }
      if (!duplicated) break;
    }
    if (duplicated) return `${leading}${run.join(' ')}${trailing}`;
  }

  return text;
}

export function repairMissingSpaces(text: string): string {
  const repaired = collapseExactDuplicateText(text)
    .replace(/\u00a0/g, ' ')
    .replace(LOWER_TO_UPPER_WORD_BOUNDARY, '$1 $2')
    .replace(LETTER_TO_NUMBER_BOUNDARY, '$1 $2')
    .replace(NUMBER_TO_LETTER_BOUNDARY, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ');
  return collapseDuplicateTokenRuns(repaired);
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

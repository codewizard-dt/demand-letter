import { describe, expect, it } from 'vitest';
import { findSpacingConcerns, normalizeExtractedText } from './text-normalization';

describe('text normalization', () => {
  it('repairs obvious missing word boundaries', () => {
    expect(normalizeExtractedText('ChiropracticAndMassage Center: Pending Bill'))
      .toBe('Chiropractic And Massage Center: Pending Bill');
  });

  it('repairs text and number boundaries', () => {
    expect(normalizeExtractedText('Invoice123ABC')).toBe('Invoice 123 ABC');
  });

  it('collapses exactly duplicated extracted text before spacing repair', () => {
    expect(normalizeExtractedText(
      '1327 N. Broadway Santa Ana, CA 92706(310) 954-20001327 N. Broadway Santa Ana, CA 92706(310) 954-2000',
    )).toBe('1327 N. Broadway Santa Ana, CA 92706(310) 954-2000');
  });

  it('collapses duplicated token runs after spacing repair', () => {
    expect(normalizeExtractedText(
      '1327 N. Broadway Santa Ana, CA 92706 (310) 954-2000 1327 N. Broadway Santa Ana, CA 92706 (310) 954-2000',
    )).toBe('1327 N. Broadway Santa Ana, CA 92706 (310) 954-2000');
  });

  it('reports spacing concerns before repair', () => {
    expect(findSpacingConcerns('ChiropracticAndMassage')).toContain('Possible missing space between words.');
  });
});

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

  it('reports spacing concerns before repair', () => {
    expect(findSpacingConcerns('ChiropracticAndMassage')).toContain('Possible missing space between words.');
  });
});

import { describe, it, expect } from 'vitest';
import { redactText } from './redact-text';

describe('redactText', () => {
  it('returns text unchanged when entities array is empty', () => {
    expect(redactText('Hello world', [])).toBe('Hello world');
  });

  it('replaces a PATIENT entity with [PATIENT_NAME]', () => {
    const text = 'John Smith was injured';
    // "John Smith" is at offsets 0–10
    const result = redactText(text, [{ type: 'PATIENT', startOffset: 0, endOffset: 10 }]);
    expect(result).toBe('[PATIENT_NAME] was injured');
  });

  it('replaces an SSN entity with [SSN]', () => {
    const text = 'SSN: 123-45-6789 on file';
    // "123-45-6789" is at offsets 5–16
    const result = redactText(text, [{ type: 'SSN', startOffset: 5, endOffset: 16 }]);
    expect(result).toBe('SSN: [SSN] on file');
  });

  it('replaces an EMAIL entity with [EMAIL]', () => {
    const text = 'Contact me at foo@example.com please';
    // "foo@example.com" is at offsets 14–29
    const result = redactText(text, [{ type: 'EMAIL', startOffset: 14, endOffset: 29 }]);
    expect(result).toBe('Contact me at [EMAIL] please');
  });

  it('handles multiple entities without offset shifts', () => {
    const text = 'Jane Doe called 555-1234 yesterday';
    // "Jane Doe" 0–8, "555-1234" 16–24
    const result = redactText(text, [
      { type: 'PATIENT', startOffset: 0, endOffset: 8 },
      { type: 'PHONE', startOffset: 16, endOffset: 24 },
    ]);
    expect(result).toBe('[PATIENT_NAME] called [PHONE] yesterday');
  });

  it('maps unknown entity types to [PHI_ENTITY]', () => {
    const text = 'CUSTOM_DATA here';
    const result = redactText(text, [{ type: 'UNKNOWN_TYPE', startOffset: 0, endOffset: 11 }]);
    expect(result).toBe('[PHI_ENTITY] here');
  });

  it('maps PERSON alias to [PATIENT_NAME]', () => {
    const text = 'The person is Bob';
    // "Bob" at offsets 14–17
    const result = redactText(text, [{ type: 'PERSON', startOffset: 14, endOffset: 17 }]);
    expect(result).toBe('The person is [PATIENT_NAME]');
  });

  it('maps DOCTOR alias to [PROVIDER]', () => {
    const text = 'Seen by Dr. Adams';
    // "Dr. Adams" at offsets 8–17
    const result = redactText(text, [{ type: 'DOCTOR', startOffset: 8, endOffset: 17 }]);
    expect(result).toBe('Seen by [PROVIDER]');
  });

  it('handles adjacent entities at the start and end of text', () => {
    const text = 'Alice 555-0100';
    const result = redactText(text, [
      { type: 'NAME', startOffset: 0, endOffset: 5 },
      { type: 'PHONE_NUMBER', startOffset: 6, endOffset: 14 },
    ]);
    expect(result).toBe('[PATIENT_NAME] [PHONE]');
  });
});

import { describe, it, expect } from 'vitest';
import { FIELD_SCHEMA, dbNameToTagName, tagNameToDbName } from './field-schema';

describe('dbNameToTagName', () => {
  it('converts letter_date to letterDate', () => {
    expect(dbNameToTagName('letter_date')).toBe('letterDate');
  });

  it('converts per_provider_line_items to specials', () => {
    expect(dbNameToTagName('per_provider_line_items')).toBe('specials');
  });

  it('returns undefined for an unknown dbName', () => {
    expect(dbNameToTagName('unknown_field')).toBeUndefined();
  });
});

describe('tagNameToDbName', () => {
  it('converts letterDate to letter_date', () => {
    expect(tagNameToDbName('letterDate')).toBe('letter_date');
  });

  it('converts specials to per_provider_line_items', () => {
    expect(tagNameToDbName('specials')).toBe('per_provider_line_items');
  });

  it('returns undefined for an unknown tagName', () => {
    expect(tagNameToDbName('unknown')).toBeUndefined();
  });
});

describe('FIELD_SCHEMA', () => {
  it('contains exactly one entry with isLoop: true (per_provider_line_items)', () => {
    const loopFields = FIELD_SCHEMA.filter(f => f.isLoop);
    expect(loopFields).toHaveLength(1);
    expect(loopFields[0].dbName).toBe('per_provider_line_items');
    expect(loopFields[0].tagName).toBe('specials');
  });

  it('contains multiple entries with required: true', () => {
    const requiredFields = FIELD_SCHEMA.filter(f => f.required);
    expect(requiredFields.length).toBeGreaterThan(0);
  });

  it('contains entries with required: false', () => {
    const optionalFields = FIELD_SCHEMA.filter(f => !f.required);
    expect(optionalFields.length).toBeGreaterThan(0);
  });

  it('has no duplicate dbNames', () => {
    const dbNames = FIELD_SCHEMA.map(f => f.dbName);
    const unique = new Set(dbNames);
    expect(unique.size).toBe(dbNames.length);
  });

  it('has no duplicate tagNames', () => {
    const tagNames = FIELD_SCHEMA.map(f => f.tagName);
    const unique = new Set(tagNames);
    expect(unique.size).toBe(tagNames.length);
  });
});

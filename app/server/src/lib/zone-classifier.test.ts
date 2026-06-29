import { describe, expect, it } from 'vitest';
import { parseZoneClassifications } from './zone-classifier';

describe('parseZoneClassifications', () => {
  const classificationJson = JSON.stringify([
    {
      zoneIndex: 1,
      type: 'variable_populated',
      suggestedFieldName: 'claimant_name',
    },
    {
      zoneIndex: 2,
      type: 'boilerplate_verbatim',
      suggestedFieldName: null,
    },
  ]);

  it('parses raw JSON responses', () => {
    expect(parseZoneClassifications(classificationJson)).toEqual([
      {
        zoneIndex: 1,
        type: 'variable_populated',
        suggestedFieldName: 'claimant_name',
      },
      {
        zoneIndex: 2,
        type: 'boilerplate_verbatim',
        suggestedFieldName: null,
      },
    ]);
  });

  it('parses JSON wrapped in markdown fences', () => {
    expect(parseZoneClassifications(`\`\`\`json\n${classificationJson}\n\`\`\``)).toEqual([
      {
        zoneIndex: 1,
        type: 'variable_populated',
        suggestedFieldName: 'claimant_name',
      },
      {
        zoneIndex: 2,
        type: 'boilerplate_verbatim',
        suggestedFieldName: null,
      },
    ]);
  });

  it('still throws SyntaxError for malformed JSON', () => {
    expect(() => parseZoneClassifications('not json')).toThrow(SyntaxError);
  });
});

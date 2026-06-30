import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvokeModel = vi.hoisted(() => vi.fn());

vi.mock('./ai-provider', () => ({
  getBasicModelId: () => 'test-model',
  invokeModel: mockInvokeModel,
}));

import { ZoneType } from '@demand-letter/db';
import { classifyZones, parseZoneClassifications } from './zone-classifier';

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

describe('classifyZones', () => {
  beforeEach(() => {
    mockInvokeModel.mockReset();
  });

  it('uses deterministic settings and normalizes obvious boilerplate zones', async () => {
    mockInvokeModel.mockResolvedValue(JSON.stringify([
      { zoneIndex: 2, type: 'variable_populated', suggestedFieldName: 'claimant_name' },
      { zoneIndex: 3, type: 'variable_populated', suggestedFieldName: 'invented_field' },
    ]));

    const result = await classifyZones([
      { zoneIndex: 1, textContent: '' },
      { zoneIndex: 2, textContent: 'Patrick Donahue' },
      { zoneIndex: 3, textContent: 'Some firm slogan' },
      { zoneIndex: 4, textContent: 'Header image' },
    ], 'system');

    expect(mockInvokeModel).toHaveBeenCalledWith(expect.objectContaining({
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: 'Zone 2: "Patrick Donahue"\nZone 3: "Some firm slogan"',
        },
      ],
    }));
    expect(result).toEqual([
      { zoneIndex: 1, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null },
      { zoneIndex: 2, type: ZoneType.variable_populated, suggestedFieldName: 'claimant_name' },
      { zoneIndex: 3, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null },
      { zoneIndex: 4, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null },
    ]);
  });

  it('does not call the model when every zone is deterministic boilerplate', async () => {
    const result = await classifyZones([
      { zoneIndex: 1, textContent: '' },
      { zoneIndex: 2, textContent: 'Document image' },
    ], 'system');

    expect(mockInvokeModel).not.toHaveBeenCalled();
    expect(result).toEqual([
      { zoneIndex: 1, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null },
      { zoneIndex: 2, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null },
    ]);
  });
});

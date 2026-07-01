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
      templateText: 'Re: {claimant_name}',
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
        templateText: 'Re: {claimant_name}',
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
        templateText: 'Re: {claimant_name}',
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
      { zoneIndex: 1, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null },
      { zoneIndex: 2, type: ZoneType.variable_populated, suggestedFieldName: 'claimant_name', templateText: null },
      { zoneIndex: 3, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null },
      { zoneIndex: 4, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null },
    ]);
  });

  it('infers mixed template text for label plus proper-name zones', async () => {
    mockInvokeModel.mockResolvedValue(JSON.stringify([
      { zoneIndex: 14, type: 'variable_populated', suggestedFieldName: 'adjuster_name', templateText: null },
    ]));

    const result = await classifyZones([
      { zoneIndex: 14, textContent: 'Attn.: Elaine Collins' },
    ], 'system');

    expect(result).toEqual([
      {
        zoneIndex: 14,
        type: ZoneType.variable_populated,
        suggestedFieldName: 'adjuster_name',
        templateText: 'Attn.: {adjuster_name}',
      },
    ]);
  });

  it('does not suffix repeated field names even when values differ between zones', async () => {
    mockInvokeModel.mockResolvedValue(JSON.stringify([
      { zoneIndex: 16, type: 'variable_populated', suggestedFieldName: 'insurer_address', templateText: null },
      { zoneIndex: 17, type: 'variable_populated', suggestedFieldName: 'insurer_address', templateText: null },
    ]));

    const result = await classifyZones([
      { zoneIndex: 16, textContent: 'P.O. Box 25210' },
      { zoneIndex: 17, textContent: 'Santa Ana, CA 92799' },
    ], 'system');

    expect(result).toEqual([
      { zoneIndex: 16, type: ZoneType.variable_populated, suggestedFieldName: 'insurer_address', templateText: null },
      { zoneIndex: 17, type: ZoneType.variable_populated, suggestedFieldName: 'insurer_address', templateText: null },
    ]);
  });

  it('preserves the same field name for multiple zones sharing a field', async () => {
    mockInvokeModel.mockResolvedValue(JSON.stringify([
      { zoneIndex: 19, type: 'variable_populated', suggestedFieldName: 'claimant_name', templateText: 'Re:Our Client:{claimant_name}' },
      { zoneIndex: 20, type: 'variable_populated', suggestedFieldName: 'claimant_name', templateText: null },
    ]));

    const result = await classifyZones([
      { zoneIndex: 19, textContent: 'Re:Our Client:Patrick Donahue' },
      { zoneIndex: 20, textContent: 'Patrick Donahue' },
    ], 'system');

    expect(result).toEqual([
      {
        zoneIndex: 19,
        type: ZoneType.variable_populated,
        suggestedFieldName: 'claimant_name',
        templateText: 'Re:Our Client:{claimant_name}',
      },
      { zoneIndex: 20, type: ZoneType.variable_populated, suggestedFieldName: 'claimant_name', templateText: null },
    ]);
  });

  it('preserves templateText with multiple {field} placeholders across normalizeClassification', async () => {
    mockInvokeModel.mockResolvedValue(JSON.stringify([
      {
        zoneIndex: 1,
        type: 'variable_populated',
        suggestedFieldName: 'incident_date',
        templateText: 'On {incident_date} at {incident_location}, {claimant_name} was injured.',
      },
    ]));

    const result = await classifyZones([
      { zoneIndex: 1, textContent: 'On 2024-01-15 at Main Street, John Smith was injured.' },
    ], 'system');

    expect(result).toEqual([
      {
        zoneIndex: 1,
        type: ZoneType.variable_populated,
        suggestedFieldName: 'incident_date',
        templateText: 'On {incident_date} at {incident_location}, {claimant_name} was injured.',
      },
    ]);
  });

  it('does not call the model when every zone is deterministic boilerplate', async () => {
    const result = await classifyZones([
      { zoneIndex: 1, textContent: '' },
      { zoneIndex: 2, textContent: 'Document image' },
    ], 'system');

    expect(mockInvokeModel).not.toHaveBeenCalled();
    expect(result).toEqual([
      { zoneIndex: 1, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null },
      { zoneIndex: 2, type: ZoneType.boilerplate_verbatim, suggestedFieldName: null, templateText: null },
    ]);
  });
});

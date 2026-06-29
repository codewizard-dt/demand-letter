import { describe, it, expect } from 'vitest';
import { estimateCostUsd, MODEL_PRICING } from './ai';

const HAIKU_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const SONNET_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0';

describe('estimateCostUsd', () => {
  it('calculates cost correctly for 1M input + 1M output with Haiku ($1 + $5 = $6)', () => {
    expect(estimateCostUsd(HAIKU_ID, 1_000_000, 1_000_000)).toBe(6.0);
  });

  it('calculates cost correctly for 1M input + 1M output with Sonnet ($3 + $15 = $18)', () => {
    expect(estimateCostUsd(SONNET_ID, 1_000_000, 1_000_000)).toBe(18.0);
  });

  it('returns 0 when both token counts are 0', () => {
    expect(estimateCostUsd(HAIKU_ID, 0, 0)).toBe(0.0);
  });

  it('returns 0 for an unknown model id', () => {
    expect(estimateCostUsd('unknown-model-xyz', 1_000_000, 1_000_000)).toBe(0);
  });

  it('calculates partial tokens correctly (500K input, 0 output with Haiku = $0.50)', () => {
    expect(estimateCostUsd(HAIKU_ID, 500_000, 0)).toBe(0.5);
  });

  it('rounds result to 6 decimal places', () => {
    // 1 input token with Haiku: 1/1_000_000 * 1.0 = 0.000001
    const result = estimateCostUsd(HAIKU_ID, 1, 0);
    expect(result).toBe(0.000001);
    // Verify it's a number with at most 6 decimal places
    const decimals = result.toString().split('.')[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(6);
  });

  it('calculates output-only cost correctly (0 input, 1M output with Haiku = $5)', () => {
    expect(estimateCostUsd(HAIKU_ID, 0, 1_000_000)).toBe(5.0);
  });
});

describe('MODEL_PRICING', () => {
  it('contains an entry for the Haiku model with inputPerMTok=1 and outputPerMTok=5', () => {
    expect(MODEL_PRICING[HAIKU_ID]).toEqual({ inputPerMTok: 1.0, outputPerMTok: 5.0 });
  });

  it('contains an entry for the Sonnet model with inputPerMTok=3 and outputPerMTok=15', () => {
    expect(MODEL_PRICING[SONNET_ID]).toEqual({ inputPerMTok: 3.0, outputPerMTok: 15.0 });
  });
});

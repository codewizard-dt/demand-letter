import { describe, it, expect } from 'vitest';
import { mergeEntities, MergedEntity } from './merge-entities';

// Both PhiEntity and PiiEntity share the MergedEntity shape, so plain objects
// satisfying that interface are structurally compatible with both.

describe('mergeEntities', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeEntities([], [])).toEqual([]);
  });

  it('returns phi entities sorted by startOffset when pii is empty', () => {
    const phi: MergedEntity[] = [
      { type: 'PATIENT', startOffset: 20, endOffset: 30, confidence: 0.9 },
      { type: 'DATE', startOffset: 0, endOffset: 10, confidence: 0.8 },
    ];
    const result = mergeEntities(phi, []);
    expect(result).toEqual([
      { type: 'DATE', startOffset: 0, endOffset: 10, confidence: 0.8 },
      { type: 'PATIENT', startOffset: 20, endOffset: 30, confidence: 0.9 },
    ]);
  });

  it('returns pii entities sorted by startOffset when phi is empty', () => {
    const pii: MergedEntity[] = [
      { type: 'EMAIL', startOffset: 50, endOffset: 65, confidence: 0.85 },
      { type: 'SSN', startOffset: 5, endOffset: 16, confidence: 0.95 },
    ];
    const result = mergeEntities([], pii);
    expect(result).toEqual([
      { type: 'SSN', startOffset: 5, endOffset: 16, confidence: 0.95 },
      { type: 'EMAIL', startOffset: 50, endOffset: 65, confidence: 0.85 },
    ]);
  });

  it('merges non-overlapping entities from both arrays sorted by startOffset', () => {
    const phi: MergedEntity[] = [
      { type: 'SSN', startOffset: 20, endOffset: 30, confidence: 0.9 },
    ];
    const pii: MergedEntity[] = [
      { type: 'EMAIL', startOffset: 0, endOffset: 15, confidence: 0.8 },
    ];
    const result = mergeEntities(phi, pii);
    expect(result).toEqual([
      { type: 'EMAIL', startOffset: 0, endOffset: 15, confidence: 0.8 },
      { type: 'SSN', startOffset: 20, endOffset: 30, confidence: 0.9 },
    ]);
  });

  it('keeps higher-confidence entity when start and end offsets are both within 5', () => {
    // phi at 0–10 confidence 0.7, pii at 2–12 confidence 0.9 → pii wins
    const phi: MergedEntity[] = [
      { type: 'PATIENT', startOffset: 0, endOffset: 10, confidence: 0.7 },
    ];
    const pii: MergedEntity[] = [
      { type: 'NAME', startOffset: 2, endOffset: 12, confidence: 0.9 },
    ];
    const result = mergeEntities(phi, pii);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'NAME', startOffset: 2, endOffset: 12, confidence: 0.9 });
  });

  it('retains existing entity when it has higher confidence than the overlapping candidate', () => {
    // phi at 0–10 confidence 0.95, pii at 2–12 confidence 0.7 → phi stays
    const phi: MergedEntity[] = [
      { type: 'PATIENT', startOffset: 0, endOffset: 10, confidence: 0.95 },
    ];
    const pii: MergedEntity[] = [
      { type: 'NAME', startOffset: 2, endOffset: 12, confidence: 0.7 },
    ];
    const result = mergeEntities(phi, pii);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: 'PATIENT', startOffset: 0, endOffset: 10, confidence: 0.95 });
  });

  it('keeps both entities when startOffsets overlap but endOffsets differ by more than 5', () => {
    // startOffset diff = 1 (≤5), endOffset diff = 20 (>5) → not considered overlapping
    const phi: MergedEntity[] = [
      { type: 'PATIENT', startOffset: 0, endOffset: 10, confidence: 0.8 },
    ];
    const pii: MergedEntity[] = [
      { type: 'NAME', startOffset: 1, endOffset: 30, confidence: 0.9 },
    ];
    const result = mergeEntities(phi, pii);
    expect(result).toHaveLength(2);
    expect(result[0].startOffset).toBe(0);
    expect(result[1].startOffset).toBe(1);
  });

  it('keeps both entities when endOffsets overlap but startOffsets differ by more than 5', () => {
    // startOffset diff = 10 (>5), endOffset diff = 2 (≤5) → not considered overlapping
    const phi: MergedEntity[] = [
      { type: 'DATE', startOffset: 0, endOffset: 10, confidence: 0.8 },
    ];
    const pii: MergedEntity[] = [
      { type: 'DATE_TIME', startOffset: 10, endOffset: 12, confidence: 0.9 },
    ];
    const result = mergeEntities(phi, pii);
    expect(result).toHaveLength(2);
  });
});

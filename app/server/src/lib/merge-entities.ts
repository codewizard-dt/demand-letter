import { PhiEntity } from './comprehend-medical-client';
import { PiiEntity } from './comprehend-client';

export interface MergedEntity {
  type: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export function mergeEntities(phi: PhiEntity[], pii: PiiEntity[]): MergedEntity[] {
  const combined: MergedEntity[] = [...phi, ...pii];

  combined.sort((a, b) => a.startOffset - b.startOffset);

  const result: MergedEntity[] = [];
  for (const current of combined) {
    const last = result[result.length - 1];
    if (result.length === 0 || !last) {
      result.push(current);
      continue;
    }
    const startOverlap = Math.abs(last.startOffset - current.startOffset) <= 5;
    const endOverlap = Math.abs(last.endOffset - current.endOffset) <= 5;
    if (startOverlap && endOverlap) {
      if (current.confidence > last.confidence) {
        result[result.length - 1] = current;
      }
    } else {
      result.push(current);
    }
  }

  return result;
}

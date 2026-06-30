import { prisma } from '@demand-letter/db';
import { extractFirmFieldsFromTemplate, logCaseDocumentSlotCoverage, runGroundedExtraction } from './extraction-service';
import { logJobError } from './job-logger';

export type ExtractionStreamEvent =
  | { type: 'progress'; message: string }
  | { type: 'complete'; jobId: string; totalFields: number; filledFields: number; nullFields: number }
  | { type: 'error'; message: string };

export interface ExtractionJobTrace {
  requestId?: string;
  traceId?: string;
}

export interface RunExtractionJobOptions {
  jobId: string;
  userId: string;
  trace: ExtractionJobTrace;
  emit?: (event: ExtractionStreamEvent) => void;
}

export async function runExtractionJob({
  jobId,
  userId,
  trace,
  emit,
}: RunExtractionJobOptions): Promise<ExtractionStreamEvent> {
  try {
    emit?.({ type: 'progress', message: 'Extracting case facts...' });
    await runGroundedExtraction(jobId, userId, trace);

    emit?.({ type: 'progress', message: 'Extracting firm fields from template...' });
    await extractFirmFieldsFromTemplate(jobId, userId, trace);

    emit?.({ type: 'progress', message: 'Checking template slot coverage...' });
    await logCaseDocumentSlotCoverage(jobId);

    const fieldCount = await prisma.extractedField.count({ where: { jobId } });
    const nullCount = await prisma.extractedField.count({
      where: { jobId, isNull: true },
    });

    const complete: ExtractionStreamEvent = {
      type: 'complete',
      jobId,
      totalFields: fieldCount,
      filledFields: fieldCount - nullCount,
      nullFields: nullCount,
    };
    emit?.(complete);
    return complete;
  } catch (err) {
    await logJobError(jobId, 'post-jobs-extract', err);
    const error = err instanceof Error ? err : new Error(String(err));
    const event: ExtractionStreamEvent = { type: 'error', message: error.message };
    emit?.(event);
    return event;
  }
}

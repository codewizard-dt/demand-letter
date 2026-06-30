import { prisma } from '@demand-letter/db';
import { classifyZones } from './zone-classifier';
import { logJobError } from './job-logger';

export type TemplateClassificationStreamEvent =
  | { type: 'progress'; message: string }
  | { type: 'complete'; jobId: string; templateId: string; zoneCount: number }
  | { type: 'error'; message: string };

export interface TemplateClassificationTrace {
  requestId?: string;
  traceId?: string;
}

export interface RunTemplateClassificationJobOptions {
  jobId: string;
  templateId: string;
  userId: string;
  trace: TemplateClassificationTrace;
  emit?: (event: TemplateClassificationStreamEvent) => void;
}

export async function runTemplateClassificationJob({
  jobId,
  templateId,
  userId,
  trace,
  emit,
}: RunTemplateClassificationJobOptions): Promise<TemplateClassificationStreamEvent> {
  try {
    emit?.({ type: 'progress', message: 'Loading template zones...' });
    const zones = await prisma.zone.findMany({
      where: { templateId },
      orderBy: { zoneIndex: 'asc' },
    });

    if (!zones.length) {
      throw new Error('The template has no zones to classify.');
    }

    emit?.({ type: 'progress', message: 'Classifying template zones...' });
    const classifications = await classifyZones(zones, userId, { jobId, ...trace });
    const zoneMap = new Map(zones.map((zone) => [zone.zoneIndex, zone.id]));

    emit?.({ type: 'progress', message: 'Saving zone classifications...' });
    const updated = await Promise.all(classifications.map((classification) => {
      const id = zoneMap.get(classification.zoneIndex);
      if (!id) return null;
      return prisma.zone.update({
        where: { id },
        data: {
          type: classification.type,
          suggestedFieldName: classification.suggestedFieldName,
          templateText: classification.templateText ?? null,
          confirmed: classification.type === 'variable_populated',
        },
      });
    }));

    const complete: TemplateClassificationStreamEvent = {
      type: 'complete',
      jobId,
      templateId,
      zoneCount: updated.filter(Boolean).length,
    };
    emit?.(complete);
    return complete;
  } catch (err) {
    await logJobError(jobId, 'post-jobs-templates-classify', err);
    const error = err instanceof Error ? err : new Error(String(err));
    const event: TemplateClassificationStreamEvent = { type: 'error', message: error.message };
    emit?.(event);
    return event;
  }
}

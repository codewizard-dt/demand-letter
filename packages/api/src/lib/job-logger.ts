import { prisma, Prisma } from '@demand-letter/db';

export async function logJobEvent(
  jobId: string,
  handler: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  opts?: { stack?: string; context?: Record<string, unknown> },
): Promise<void> {
  try {
    await prisma.jobLog.create({
      data: {
        jobId,
        handler,
        level,
        message,
        stack: opts?.stack ?? null,
        context: (opts?.context ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    console.error('[job-logger] failed to write log:', message);
  }
}

export async function logJobError(jobId: string, handler: string, err: unknown): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err));
  await logJobEvent(jobId, handler, 'error', error.message, { stack: error.stack });
}

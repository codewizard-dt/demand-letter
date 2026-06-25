import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export type { Prisma, LlmAuditLog, Template, Zone, TemplateSlot, SourceFile, Block, ExtractedField } from '@prisma/client';
export { PrismaClient, LlmFeature, ZoneType } from '@prisma/client';

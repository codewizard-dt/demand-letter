import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@demand-letter/db');
vi.mock('./job-logger');

import type { DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@demand-letter/db';
import { prisma } from '@demand-letter/db';
import { logJobEvent } from './job-logger';
import { logCaseDocumentSlotCoverage } from './extraction-service';

const prismaMock = prisma as DeepMockProxy<PrismaClient>;
const mockLogJobEvent = vi.mocked(logJobEvent);

describe('logCaseDocumentSlotCoverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.template.findFirst.mockReset();
    prismaMock.sourceFile.findMany.mockReset();
    prismaMock.extractedField.findMany.mockReset();
    mockLogJobEvent.mockReset();
  });

  it('logs matched variable slots per source document using cited block IDs', async () => {
    prismaMock.template.findFirst.mockResolvedValue({
      id: 'template-1',
      slots: [
        { slotName: 'claimant_name' },
        { slotName: 'policy_limits' },
        { slotName: 'diagnoses' },
      ],
    } as any);
    prismaMock.sourceFile.findMany.mockResolvedValue([
      {
        id: 'source-1',
        s3Key: 'job-1/11111111-1111-4111-8111-111111111111-medical-records.pdf',
        blocks: [{ id: 'block-1' }, { id: 'block-2' }],
      },
      {
        id: 'source-2',
        s3Key: 'job-1/22222222-2222-4222-8222-222222222222-insurance-declarations.pdf',
        blocks: [{ id: 'block-3' }],
      },
    ] as any);
    prismaMock.extractedField.findMany.mockResolvedValue([
      { fieldName: 'claimant_name', blockIds: ['block-1'] },
      { fieldName: 'diagnoses', blockIds: ['block-2'] },
      { fieldName: 'policy_limits', blockIds: ['block-3'] },
    ] as any);

    await logCaseDocumentSlotCoverage('job-1');

    expect(mockLogJobEvent).toHaveBeenCalledTimes(2);
    expect(mockLogJobEvent).toHaveBeenNthCalledWith(
      1,
      'job-1',
      'post-jobs-extract',
      'info',
      'Case document analyzed: medical-records.pdf. Matched 2 of 3 variable slots',
      expect.objectContaining({
        context: expect.objectContaining({
          sourceFileId: 'source-1',
          matchedVariableSlots: 2,
          totalVariableSlots: 3,
          matchedSlotNames: ['claimant_name', 'diagnoses'],
        }),
      }),
    );
    expect(mockLogJobEvent).toHaveBeenNthCalledWith(
      2,
      'job-1',
      'post-jobs-extract',
      'info',
      'Case document analyzed: insurance-declarations.pdf. Matched 1 of 3 variable slots',
      expect.objectContaining({
        context: expect.objectContaining({
          sourceFileId: 'source-2',
          matchedVariableSlots: 1,
          totalVariableSlots: 3,
          matchedSlotNames: ['policy_limits'],
        }),
      }),
    );
  });
});

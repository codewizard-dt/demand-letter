import type { SNSEvent } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { Prisma } from '@prisma/client';
import { getTextractResults } from '../lib/textract-client';
import { detectPhi } from '../lib/comprehend-medical-client';
import { detectPii } from '../lib/comprehend-client';
import { mergeEntities } from '../lib/merge-entities';
import { normalizeExtractedText } from '../lib/text-normalization';


export const handler = async (event: SNSEvent): Promise<void> => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message) as {
      JobId: string;
      Status: string;
    };
    const { JobId: textractJobId, Status: status } = message;

    if (status !== 'SUCCEEDED') {
      // Mark source file as error if Textract failed
      if (status === 'FAILED') {
        const sourceFile = await prisma.sourceFile.findFirst({
          where: { textractJobId },
        });
        if (sourceFile) {
          await prisma.sourceFile.update({
            where: { id: sourceFile.id },
            data: { status: 'error', errorMessage: 'Textract job failed' },
          });
        }
      }
      continue;
    }

    const sourceFile = await prisma.sourceFile.findFirst({
      where: { textractJobId },
    });

    if (!sourceFile) {
      console.error(`No SourceFile found for Textract job ${textractJobId}`);
      continue;
    }

    try {
      const results = await getTextractResults(textractJobId);
      const blockData: Array<{
        sourceFileId: string;
        type: string;
        text: string;
        page: number;
        confidence: number;
        bbox: Prisma.InputJsonValue;
        phiOffsets: Prisma.InputJsonValue;
      }> = [];

      for (const r of results) {
        const normalizedText = normalizeExtractedText(r.text);
        // Fail-closed: if detection throws, block is NOT inserted (error surfaces via outer catch)
        const phiEntities = await detectPhi(normalizedText);
        const piiEntities = await detectPii(normalizedText);
        const mergedEntities = mergeEntities(phiEntities, piiEntities);
        blockData.push({
          sourceFileId: sourceFile.id,
          type: r.type,
          text: normalizedText,
          page: r.page,
          confidence: r.confidence,
          bbox: r.bbox as Prisma.InputJsonValue,
          phiOffsets: mergedEntities as unknown as Prisma.InputJsonValue,
        });
      }

      if (blockData.length > 0) {
        await prisma.block.createMany({ data: blockData });
      }

      await prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { status: 'complete' },
      });
    } catch (e) {
      await prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { status: 'error', errorMessage: (e as Error).message },
      });
    }
  }
};

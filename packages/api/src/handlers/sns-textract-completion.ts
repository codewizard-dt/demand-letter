import type { SNSEvent } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { Prisma } from '@prisma/client';
import { getTextractResults } from '../lib/textract-client';

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
      const blockData = results.map((r) => ({
        sourceFileId: sourceFile.id,
        type: r.type,
        text: r.text,
        page: r.page,
        confidence: r.confidence,
        bbox: r.bbox,
        phiOffsets: Prisma.JsonNull,
      }));

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

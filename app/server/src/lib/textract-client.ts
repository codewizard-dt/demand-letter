import { TextractClient, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand } from '@aws-sdk/client-textract';

const textractClient = new TextractClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

export async function startTextractAnalysis(
  s3Bucket: string,
  s3Key: string,
  jobTag: string,
): Promise<string> {
  const cmd = new StartDocumentAnalysisCommand({
    ClientRequestToken: jobTag,
    DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
    FeatureTypes: ['LAYOUT', 'TABLES', 'FORMS'],
    JobTag: jobTag,
  });
  const response = await textractClient.send(cmd);
  if (!response.JobId) throw new Error('No JobId returned from Textract');
  return response.JobId;
}

export interface TextractBlock {
  type: string;
  text: string;
  page: number;
  confidence: number;
  bbox: { left: number; top: number; width: number; height: number };
}

export async function getTextractResults(jobId: string): Promise<TextractBlock[]> {
  const blocks: TextractBlock[] = [];
  let nextToken: string | undefined;

  do {
    const cmd = new GetDocumentAnalysisCommand({ JobId: jobId, NextToken: nextToken });
    const response = await textractClient.send(cmd);

    if (response.Blocks) {
      response.Blocks.forEach((block) => {
        if (block.BlockType === 'LINE' || block.BlockType === 'WORD') {
          const geo = block.Geometry?.BoundingBox;
          blocks.push({
            type: block.BlockType,
            text: block.Text ?? '',
            page: block.Page ?? 1,
            confidence: block.Confidence ?? 0.8,
            bbox: {
              left: geo?.Left ?? 0,
              top: geo?.Top ?? 0,
              width: geo?.Width ?? 0,
              height: geo?.Height ?? 0,
            },
          });
        }
      });
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return blocks;
}

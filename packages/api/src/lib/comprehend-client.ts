import { ComprehendClient, DetectPiiEntitiesCommand } from '@aws-sdk/client-comprehend';

const client = new ComprehendClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

export interface PiiEntity {
  type: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export async function detectPii(text: string): Promise<PiiEntity[]> {
  if (!text.trim()) return [];
  const result = await client.send(new DetectPiiEntitiesCommand({ Text: text, LanguageCode: 'en' }));
  return (result.Entities ?? []).map((e) => ({
    type: e.Type ?? 'UNKNOWN',
    startOffset: e.BeginOffset ?? 0,
    endOffset: e.EndOffset ?? 0,
    confidence: e.Score ?? 0,
  }));
}

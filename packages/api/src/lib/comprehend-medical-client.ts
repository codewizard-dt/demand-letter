import { ComprehendMedicalClient, DetectPHICommand } from '@aws-sdk/client-comprehendmedical';

const client = new ComprehendMedicalClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

export interface PhiEntity {
  type: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export async function detectPhi(text: string): Promise<PhiEntity[]> {
  if (!text.trim()) return [];
  const result = await client.send(new DetectPHICommand({ Text: text }));
  return (result.Entities ?? []).map((e) => ({
    type: e.Type ?? 'UNKNOWN',
    startOffset: e.BeginOffset ?? 0,
    endOffset: e.EndOffset ?? 0,
    confidence: e.Score ?? 0,
  }));
}

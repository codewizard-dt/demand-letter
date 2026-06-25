export const MODEL_PRICING: Record<
  string,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  // Claude Haiku 4.5 — $1.00 / $5.00 per MTok
  'anthropic.claude-haiku-4-5-20251001-v1:0':        { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  'us.anthropic.claude-haiku-4-5-20251001-v1:0':     { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  'global.anthropic.claude-haiku-4-5-20251001-v1:0': { inputPerMTok: 1.0, outputPerMTok: 5.0 },

  // Claude Sonnet 4 (deprecated June 2026) — $3.00 / $15.00 per MTok
  'anthropic.claude-sonnet-4-20250514-v1:0':         { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'us.anthropic.claude-sonnet-4-20250514-v1:0':      { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'global.anthropic.claude-sonnet-4-20250514-v1:0':  { inputPerMTok: 3.0, outputPerMTok: 15.0 },

  // Claude Sonnet 4.5 — $3.00 / $15.00 per MTok
  'anthropic.claude-sonnet-4-5-20250929-v1:0':        { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0':     { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'global.anthropic.claude-sonnet-4-5-20250929-v1:0': { inputPerMTok: 3.0, outputPerMTok: 15.0 },

  // Claude Sonnet 4.6 — $3.00 / $15.00 per MTok
  'anthropic.claude-sonnet-4-6':        { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'us.anthropic.claude-sonnet-4-6':     { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'global.anthropic.claude-sonnet-4-6': { inputPerMTok: 3.0, outputPerMTok: 15.0 },

  // Claude Opus 4.x — $5.00 / $25.00 per MTok (all 4.x Opus versions same rate)
  'anthropic.claude-opus-4-1-20250805-v1:0':  { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  'anthropic.claude-opus-4-5-20251101-v1:0':  { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  'anthropic.claude-opus-4-6-v1':             { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  'anthropic.claude-opus-4-7':                { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  'anthropic.claude-opus-4-8':                { inputPerMTok: 5.0, outputPerMTok: 25.0 },

  // Claude Fable 5 — $10.00 / $50.00 per MTok
  'anthropic.claude-fable-5': { inputPerMTok: 10.0, outputPerMTok: 50.0 },

  // Legacy Claude 3.x (inference profiles still active in this account)
  'us.anthropic.claude-3-haiku-20240307-v1:0':   { inputPerMTok: 0.25, outputPerMTok: 1.25 },
  'us.anthropic.claude-3-sonnet-20240229-v1:0':  { inputPerMTok: 3.0,  outputPerMTok: 15.0 },
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0': { inputPerMTok: 3.0,  outputPerMTok: 15.0 },
};

export function estimateCostUsd(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) {
    console.warn(`[ai] No pricing found for model "${modelId}" — recording $0`);
    return 0;
  }
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok;
  return parseFloat(cost.toFixed(6));
}

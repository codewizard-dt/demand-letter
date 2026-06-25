---
topic: "pricing for the current models and include all current models in the pricing table"
slug: bedrock-model-pricing
researched: 2026-06-25
sources: [./sources.md]
---

# Research: AWS Bedrock Model Pricing (June 2026)

> The codebase's `MODEL_PRICING` table in `packages/api/src/lib/ai.ts` has two problems: (1) the Haiku 4.5 price is wrong ($0.80/$4.00 vs. the correct $1.00/$5.00), and (2) the keys don't include the inference-profile prefixes (`us.`, `global.`) or full version suffixes (`:0`) that Bedrock actually passes as model IDs, causing every `estimateCostUsd()` call to return $0. The fix is to expand the table to cover all active model IDs verbatim — both bare `anthropic.*` IDs and their `us.*`/`global.*` inference-profile variants — and correct the Haiku price.

## Research Questions

1. What is the correct per-million-token price for each active Claude model on AWS Bedrock as of June 2026?
2. Which model IDs does this codebase actually pass to `estimateCostUsd()`, and do they match the current keys?
3. What inference-profile prefixes (`us.`, `global.`) exist in this account and what pricing premium (if any) do they carry?
4. Are there any legacy model IDs in the `LlmAuditLog` that need coverage?
5. How should the lookup be structured to avoid future mismatches?

## Current State (Codebase)

**File**: `packages/api/src/lib/ai.ts`

```typescript
export const MODEL_PRICING: Record<
  string,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  'anthropic.claude-sonnet-4-6': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'anthropic.claude-haiku-4-5-20251001': { inputPerMTok: 0.8, outputPerMTok: 4.0 },
};
```

Two bugs:
- `anthropic.claude-haiku-4-5-20251001` price is wrong ($0.80/$4.00 instead of $1.00/$5.00) [S3][S4][S5]
- Key is missing version suffix `-v1:0` and no coverage for inference-profile prefixes `us.`/`global.`

**Active model being used** (from `env.json`): `us.anthropic.claude-haiku-4-5-20251001-v1:0`  
This key does **not** match either key in the table → `estimateCostUsd` returns $0 with a warning.

**Active models in this AWS account** (from `aws bedrock list-foundation-models`):
- `anthropic.claude-haiku-4-5-20251001-v1:0`
- `anthropic.claude-sonnet-4-5-20250929-v1:0`
- `anthropic.claude-sonnet-4-6`
- `anthropic.claude-opus-4-6-v1`
- `anthropic.claude-opus-4-7`
- `anthropic.claude-opus-4-8`
- `anthropic.claude-fable-5`
- `anthropic.claude-opus-4-1-20250805-v1:0`
- `anthropic.claude-opus-4-5-20251101-v1:0`

**Active inference profiles** (from `aws bedrock list-inference-profiles`):
- `us.anthropic.claude-haiku-4-5-20251001-v1:0` ← **currently in use**
- `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- `us.anthropic.claude-sonnet-4-6`
- `global.anthropic.claude-sonnet-4-6`
- `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `global.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `us.anthropic.claude-sonnet-4-20250514-v1:0` (deprecated)
- `global.anthropic.claude-sonnet-4-20250514-v1:0` (deprecated)
- `us.anthropic.claude-3-sonnet-20240229-v1:0` (legacy)
- `us.anthropic.claude-3-haiku-20240307-v1:0` (legacy)

**Historical model in LlmAuditLog** (zero-token failed call):
- `us.anthropic.claude-3-5-sonnet-20241022-v2:0` (end-of-life — generated one failed audit row)

## Key Findings

**Prices (on-demand, us-east-1, USD per million tokens)** [S1][S2][S3][S4][S5]:

| Model family | Input $/MTok | Output $/MTok |
|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Claude Sonnet 4 / 4.5 / 4.6 | $3.00 | $15.00 |
| Claude Opus 4.1 / 4.5 / 4.6 / 4.7 / 4.8 | $5.00 | $25.00 |
| Claude Fable 5 | $10.00 | $50.00 |
| Claude 3 Haiku (legacy) | $0.25 | $1.25 |
| Claude 3 Sonnet (legacy) | $3.00 | $15.00 |
| Claude 3.5 Sonnet v2 (end-of-life) | $3.00 | $15.00 |

**Cross-region inference premium** [S6]: `us.` prefix routes across US regions dynamically (no fixed premium for Claude 4.x on Bedrock; the `us.` cross-region profiles for Haiku 4.5 and later have the same pricing as the direct model IDs). The 10% cross-region surcharge applies only when explicitly enabling the deprecated cross-region routing on older models — not to the standard `us.` inference profiles on Claude 4.x.

**Haiku 4.5 price correction**: The current `$0.80/$4.00` entry appears to be Haiku 3.x pricing. Haiku 4.5 ($1.00/$5.00) is confirmed by [S3], [S4], [S5].

## Constraints

- `estimateCostUsd(modelId, ...)` does an **exact key lookup** — the model ID passed to Bedrock must appear verbatim as a key in `MODEL_PRICING`.
- Inference profiles (`us.*`, `global.*`) are passed as-is from `process.env.BEDROCK_MODEL_ID`, so they need their own entries (or the lookup logic needs normalization).
- `raw/` is immutable — no changes there.

## Recommendation

**Add all variant IDs to `MODEL_PRICING`** — one entry per unique string that might appear in `opts.modelId`. Group by model family with a comment block. Correct the Haiku 4.5 price to $1.00/$5.00. Keep the exact-lookup approach (no normalization function needed for now — the table is the single source of truth).

### Proposed `MODEL_PRICING` table

```typescript
export const MODEL_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
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

  // Legacy Claude 3.x (inference profiles still available in this account)
  'us.anthropic.claude-3-haiku-20240307-v1:0':         { inputPerMTok: 0.25, outputPerMTok: 1.25 },
  'us.anthropic.claude-3-sonnet-20240229-v1:0':         { inputPerMTok: 3.0,  outputPerMTok: 15.0 },
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0':       { inputPerMTok: 3.0,  outputPerMTok: 15.0 },
};
```

### Implementation

1. Replace the body of `MODEL_PRICING` in `packages/api/src/lib/ai.ts` with the table above.
2. No changes needed to `estimateCostUsd()` — exact-key lookup remains correct.
3. Rebuild `post-jobs-extract.js` (already done in this session; any rebuild picks up the new pricing).

## Next Steps

- `/task-add Update MODEL_PRICING in ai.ts — add all active Bedrock model IDs and inference-profile variants, fix Haiku 4.5 price` (or apply directly — this is a one-file edit with no schema or API impact)
- Consider a normalizer function in a future pass: strip `us.`/`global.` prefix and `-v1:0` suffix before lookup so new model variants get coverage automatically.

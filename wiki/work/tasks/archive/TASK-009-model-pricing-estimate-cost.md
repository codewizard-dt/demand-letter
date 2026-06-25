---
id: TASK-009
title: "MODEL_PRICING Map and estimateCostUsd() Utility"
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: []
blocks: []
parallel_safe_with: [TASK-008]
uat: "[[UAT-009]]"
tags: [llm-audit, cost, utilities, phase-2]
---

# TASK-009 — MODEL_PRICING Map and estimateCostUsd() Utility

## Objective

Add a `MODEL_PRICING` map and `estimateCostUsd()` helper to `packages/api/src/lib/ai.ts` (create the file if it does not exist). This utility converts raw Bedrock token counts into a USD cost estimate that gets stored in `LlmAuditLog.estimatedCostUsd`. Starting prices: Sonnet 4.6 = $3.00 input / $15.00 output per MTok; Haiku 4.5 = $0.80 input / $4.00 output per MTok. The map is keyed by Bedrock model ID so pricing is easy to update as rates change.

## Approach

Define the pricing map as a `const` record keyed by model ID string with `{ inputPerMTok: number; outputPerMTok: number }` values. `estimateCostUsd()` takes `(modelId: string, inputTokens: number, outputTokens: number)` and returns a `number` (USD, rounded to 6 decimal places). If the model ID is not in the map, log a warning and return 0 so the audit log still writes. Keep Bedrock pricing note: Bedrock may apply a markup over direct API prices — update values from the Bedrock pricing page when confirmed.

## Steps

### 1. Locate or create `packages/api/src/lib/ai.ts`  <!-- agent: Explore -->

- [x] Use `mcp__serena__find_file` with mask `ai.ts` under `packages/api/src/lib/` <!-- Completed: 2026-06-23 -->
  - If the file exists, read it with `mcp__serena__get_symbols_overview` to understand existing exports
  - If it does not exist, it will be created in Step 2
  <!-- Result: file does not exist; packages/api/src/lib/ directory also does not exist yet -->

### 2. Add `MODEL_PRICING` and `estimateCostUsd()`  <!-- agent: general-purpose -->

- [x] Add or append to `packages/api/src/lib/ai.ts`: <!-- Completed: 2026-06-23 -->

```typescript
export const MODEL_PRICING: Record<
  string,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  // Prices in USD per million tokens (direct API rates — verify Bedrock markup)
  'anthropic.claude-sonnet-4-6': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  'anthropic.claude-haiku-4-5-20251001': { inputPerMTok: 0.8, outputPerMTok: 4.0 },
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
```

### 3. Export from package barrel  <!-- agent: general-purpose -->

- [x] In `packages/api/src/index.ts` (or the package's main barrel), ensure `ai.ts` exports are accessible: <!-- Completed: 2026-06-23 — barrel does not re-export lib files; skipped per task rule -->
  ```typescript
  export { MODEL_PRICING, estimateCostUsd } from './lib/ai';
  ```
  - Only add if a barrel exists and re-exports other lib files — don't create a barrel solely for this

### 4. Verify TypeScript compilation  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the repo root — must pass with zero errors <!-- Completed: 2026-06-23 — zero errors across api, db, web -->
- [x] Confirm `estimateCostUsd('anthropic.claude-sonnet-4-6', 1000, 500)` computes to `0.0105` (1000/1M × $3 + 500/1M × $15 = $0.003 + $0.0075) <!-- Verified: 2026-06-23 -->

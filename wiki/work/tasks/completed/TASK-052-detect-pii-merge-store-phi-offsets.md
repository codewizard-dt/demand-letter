---
id: TASK-052
title: "Detect PII per block, merge with PHI entities, store to blocks.phi_offsets"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-051]
blocks: [TASK-054]
parallel_safe_with: [TASK-055]
uat: "[[UAT-052]]"
tags: [compliance, hipaa, pii, comprehend, lambda, prisma]
---

# TASK-052 — Detect PII per block, merge with PHI entities, store to blocks.phi_offsets

implements::[[ROADMAP-005]]

## Objective

Extend the SNS Textract completion handler — on top of TASK-051's detectPhi() loop — to also call Amazon Comprehend `DetectPiiEntities`, merge the PHI and PII entity arrays (deduplicating overlapping offsets), and persist the merged `{ type, startOffset, endOffset, confidence }[]` array into `blocks.phi_offsets` (JSONB) alongside the full unredacted block text.

## Approach

TASK-051 already refactored the handler to a `for...of` loop and collects `phiEntitySets: PhiEntity[][]`. This task extends that loop to also await `detectPii()`, then calls a `mergeEntities()` function that sorts both arrays by `startOffset`, deduplicates spans where `|a.start - b.start| < 5 && |a.end - b.end| < 5`, and writes the result into `blockData[i].phiOffsets`. The `createMany` call then persists real offset metadata instead of `Prisma.JsonNull`.

## Steps

### 1. Add @aws-sdk/client-comprehend dependency  <!-- agent: general-purpose -->

- [x] In `packages/api/package.json`, add `"@aws-sdk/client-comprehend": "^3.0.0"` to `dependencies` (alphabetically, between `@aws-sdk/client-bedrock-runtime` and `@aws-sdk/client-comprehendmedical`) <!-- Completed: 2026-06-25 -->
- [x] Run `pnpm install` from repo root <!-- Completed: 2026-06-25 -->

### 2. Create comprehend-client.ts  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/comprehend-client.ts`: <!-- Completed: 2026-06-25 -->
  - Import `ComprehendClient` and `DetectPiiEntitiesCommand` from `@aws-sdk/client-comprehend`
  - Module-level singleton: `const client = new ComprehendClient({ region: process.env.AWS_REGION ?? 'us-east-1' })`
  - Export interface `PiiEntity { type: string; startOffset: number; endOffset: number; confidence: number; }`
  - Export async function `detectPii(text: string): Promise<PiiEntity[]>`:
    - Return `[]` if `!text.trim()`
    - Send `new DetectPiiEntitiesCommand({ Text: text, LanguageCode: 'en' })`, let errors propagate
    - Map `result.Entities` → `PiiEntity[]` using `Type`, `BeginOffset`, `EndOffset`, `Score`; safe defaults for undefined

### 3. Create mergeEntities helper  <!-- agent: general-purpose -->

- [x] In `packages/api/src/lib/comprehend-medical-client.ts` (or a new `packages/api/src/lib/merge-entities.ts`), add and export `mergeEntities(phi: PhiEntity[], pii: PiiEntity[]): MergedEntity[]`: <!-- Completed: 2026-06-25 -->
  - Export interface `MergedEntity { type: string; startOffset: number; endOffset: number; confidence: number; }`
  - Combine both arrays into one `MergedEntity[]` (both interfaces are structurally compatible)
  - Sort ascending by `startOffset`
  - Deduplicate: for consecutive pairs where `Math.abs(a.startOffset - b.startOffset) <= 5 && Math.abs(a.endOffset - b.endOffset) <= 5`, keep the one with higher `confidence`
  - Return the deduplicated array

### 4. Extend sns-textract-completion.ts  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/handlers/sns-textract-completion.ts` <!-- Completed: 2026-06-25 -->
- [x] Add imports for `detectPii` from `../lib/comprehend-client` and `mergeEntities` (and `MergedEntity`) from wherever defined in step 3 <!-- Completed: 2026-06-25 -->
- [x] Inside the `for...of` loop (added by TASK-051), after `const phiEntities = await detectPhi(r.text)`: <!-- Completed: 2026-06-25 -->
  ```typescript
  const piiEntities = await detectPii(r.text);
  const mergedEntities = mergeEntities(phiEntities, piiEntities);
  phiEntitySets.push(mergedEntities);  // now stores merged result
  blockData.push({
    sourceFileId: sourceFile.id,
    type: r.type,
    text: r.text,
    page: r.page,
    confidence: r.confidence,
    bbox: r.bbox as Prisma.InputJsonValue,
    phiOffsets: mergedEntities as unknown as Prisma.InputJsonValue,
  });
  ```
- [x] Remove the old `phiEntitySets.push(phiEntities)` line (replaced above) <!-- Completed: 2026-06-25 -->
- [x] The `phiEntitySets` array is no longer needed as a separate structure since offsets are now in `blockData`. Remove the `phiEntitySets` declaration if unused. <!-- Completed: 2026-06-25 -->

### 5. Add IAM permission for DetectPiiEntities  <!-- agent: general-purpose -->

- [x] In `template.yaml`, in `SnsTextractCompletionFunction`, add `comprehend:DetectPiiEntities` to the existing statement: <!-- Completed: 2026-06-25 -->
  ```yaml
  - Effect: Allow
    Action:
      - textract:GetDocumentAnalysis
      - comprehendmedical:DetectPHI
      - comprehend:DetectPiiEntities
    Resource: '*'
  ```

### 6. TypeScript verification  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` <!-- Completed: 2026-06-25 -->
- [x] Fix any type errors (likely around `Prisma.InputJsonValue` cast for `mergedEntities`) <!-- Completed: 2026-06-25 -->

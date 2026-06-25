---
id: TASK-051
title: "Detect PHI entities per block via ComprehendMedical DetectPHI"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: []
parallel_safe_with: []
uat: "[[UAT-051]]"
tags: [compliance, hipaa, phi, comprehend-medical, lambda]
---

# TASK-051 — Detect PHI entities per block via ComprehendMedical DetectPHI

implements::[[ROADMAP-005]]

## Objective

After Textract completion, call `DetectPHI` (AWS Comprehend Medical) on each block's text inside the `SnsTextractCompletionFunction` Lambda handler. Refactor the block-processing loop to collect raw PHI entity arrays per block, threading them forward for the upcoming merge step (TASK-053). IAM permission for `comprehendmedical:DetectPHI` is added to the function in `template.yaml`.

## Approach

Follow the pattern established by `packages/api/src/lib/textract-client.ts`: a module-level singleton client, a single exported async wrapper function. The SNS handler's `results.map(...)` is converted to a sequential `for...of` loop so `detectPhi()` can be awaited per block. Raw PHI entities are collected in a parallel array `phiEntitySets`; the DB write still uses `phiOffsets: Prisma.JsonNull` for now — actual storage happens after merge in TASK-054.

## Steps

### 1. Add @aws-sdk/client-comprehendmedical dependency  <!-- agent: general-purpose -->

- [x] In `packages/api/package.json`, add `"@aws-sdk/client-comprehendmedical": "^3.0.0"` to `dependencies` (alphabetically between `@aws-sdk/client-bedrock-runtime` and `@aws-sdk/client-s3`) <!-- Completed: 2026-06-25 -->
- [x] Run `pnpm install` from the repo root to update `pnpm-lock.yaml` <!-- Completed: 2026-06-25 -->

### 2. Create comprehend-medical-client.ts  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/lib/comprehend-medical-client.ts` with the following structure: <!-- Completed: 2026-06-25 -->
  - Import `ComprehendMedicalClient` and `DetectPHICommand` from `@aws-sdk/client-comprehendmedical`
  - Module-level singleton: `const client = new ComprehendMedicalClient({ region: process.env.AWS_REGION ?? 'us-east-1' })`
  - Export interface `PhiEntity { type: string; startOffset: number; endOffset: number; confidence: number; }`
  - Export async function `detectPhi(text: string): Promise<PhiEntity[]>`:
    - Return `[]` immediately if `!text.trim()`
    - Send `new DetectPHICommand({ Text: text })`, let errors propagate (fail-closed — caller handles)
    - Map `result.Entities` to `PhiEntity[]` using fields `Type`, `BeginOffset`, `EndOffset`, `Score`; default each to safe values (`'UNKNOWN'`, `0`, `0`, `0`) if undefined
    - Return the mapped array

### 3. Refactor sns-textract-completion.ts to call detectPhi per block  <!-- agent: general-purpose -->

- [x] In `packages/api/src/handlers/sns-textract-completion.ts`: <!-- Completed: 2026-06-25 -->
  - Add import: `import { detectPhi, type PhiEntity } from '../lib/comprehend-medical-client';`
  - Replace the existing `results.map(...)` + `createMany` block inside the `try {}` with a sequential `for...of` loop:
    ```typescript
    const phiEntitySets: PhiEntity[][] = [];
    const blockData: Array<{
      sourceFileId: string;
      type: string;
      text: string;
      page: number;
      confidence: number;
      bbox: object;
      phiOffsets: typeof Prisma.JsonNull;
    }> = [];

    for (const r of results) {
      const phiEntities = await detectPhi(r.text);
      phiEntitySets.push(phiEntities);
      blockData.push({
        sourceFileId: sourceFile.id,
        type: r.type,
        text: r.text,
        page: r.page,
        confidence: r.confidence,
        bbox: r.bbox,
        phiOffsets: Prisma.JsonNull,
      });
    }

    if (blockData.length > 0) {
      await prisma.block.createMany({ data: blockData });
    }
    ```
  - `phiEntitySets` is built alongside `blockData` with matching indices; it will be consumed in TASK-053 (merge) and TASK-054 (store). Keep it in scope in the `try` block.
  - Remove the `const blockData = results.map(...)` line that preceded the original `createMany` call.

### 4. Add IAM permission to template.yaml  <!-- agent: general-purpose -->

- [x] In `template.yaml`, locate `SnsTextractCompletionFunction` (around line 468) <!-- Completed: 2026-06-25 -->
- [x] In its `Policies` section, add `comprehendmedical:DetectPHI` to the existing `Statement` alongside `textract:GetDocumentAnalysis`, so the statement becomes: <!-- Completed: 2026-06-25 -->
  ```yaml
  - Effect: Allow
    Action:
      - textract:GetDocumentAnalysis
      - comprehendmedical:DetectPHI
    Resource: '*'
  ```

### 5. Verify TypeScript compilation  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api build` (or `pnpm --filter @demand-letter/api typecheck`) <!-- Completed: 2026-06-25 -->
- [x] Confirm zero TypeScript errors <!-- Completed: 2026-06-25 -->
- [x] If errors exist: fix type issues in `comprehend-medical-client.ts` and/or the handler (likely `bbox` type — cast to `Prisma.InputJsonValue` if needed) <!-- Completed: 2026-06-25 -->

---
id: TASK-040
title: "Medical narrative Bedrock prompt: generate §4 prose from extracted medical blocks"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-036]
blocks: []
parallel_safe_with: [TASK-037, TASK-038, TASK-039]
uat: ""
tags: [generation, bedrock, medical-narrative, llm]
---

# TASK-040 — Medical Narrative Bedrock Prompt

## Objective

Create `packages/api/src/lib/medical-narrative.ts` with a `generateMedicalNarrative(jobId)` function that assembles the extracted medical blocks (diagnoses, providers, imaging, treatment timeline) for a job, sends them to Claude on Bedrock with `feature: "medical_narrative"`, and returns an async iterable of streamed text chunks. The generated prose fills §4 (medical narrative section) of the demand letter, matching the register and style of the template's sample narrative. Every factual claim in the generated text must be grounded in cited block IDs — hallucinated diagnoses, medications, or provider names are disallowed by the prompt.

## Approach

Use `invokeModelStream` from `packages/api/src/lib/ai-provider.ts` (already wraps Bedrock SDK streaming and writes to `LlmAuditLog`). The prompt is a structured user message that includes: (1) a list of extracted field values for medical fields (diagnoses, treating_providers, examination_findings, imaging_results, future_treatment), and (2) the raw block texts with their IDs that support those fields. The system prompt instructs Claude to write narrative prose, cite every factual claim with its block ID in brackets `[block-abc123]`, and refuse to invent any medical details not found in the provided blocks.

## Steps

### 1. Create `packages/api/src/lib/medical-narrative.ts`  <!-- agent: general-purpose -->

- [ ] Create the file with:
  ```ts
  import { prisma } from '@demand-letter/db';
  import { invokeModelStream } from './ai-provider';
  import { LlmFeature } from '@demand-letter/db';

  export async function generateMedicalNarrative(
    jobId: string,
    modelId: string,
    userId: string,
  ): Promise<AsyncIterable<string>> { ... }
  ```
- [ ] Inside `generateMedicalNarrative`:
  - Fetch the medical extracted fields for the job:
    ```ts
    const MEDICAL_FIELDS = [
      'diagnoses', 'treating_providers', 'examination_findings',
      'imaging_results', 'future_treatment', 'first_treatment_date',
      'last_treatment_date', 'treatment_summary',
    ];
    const fields = await prisma.extractedField.findMany({
      where: { jobId, fieldName: { in: MEDICAL_FIELDS } },
      select: { fieldName: true, value: true, blockIds: true },
    });
    ```
  - Fetch the referenced blocks for those field's blockIds:
    - Collect all blockIds from `fields` (parsed from JSON), deduplicate.
    - Query `prisma.block.findMany({ where: { id: { in: allBlockIds } }, select: { id: true, text: true, page: true } })`.
  - Assemble the prompt:
    ```
    SYSTEM: You are a legal medical narrative writer. Generate the §4 medical narrative
    for a personal injury demand letter. Every factual claim must be followed by
    [block-<id>] citing the exact block ID. Never invent diagnoses, medications,
    or provider names not found in the provided blocks.

    USER:
    ## Extracted Medical Fields
    <fieldName>: <value>
    ...

    ## Supporting Blocks
    [block-<id>] (page <N>): <text>
    ...

    Write the §4 medical narrative prose now.
    ```
  - Call `invokeModelStream({ modelId, feature: LlmFeature.medical_narrative, userId, messages })`.
  - Return the resulting `AsyncIterable<string>`.

### 2. Re-export from `packages/api/src/lib/index.ts`  <!-- agent: general-purpose -->

- [ ] Add: `export { generateMedicalNarrative } from './medical-narrative';`

### 3. Typecheck  <!-- agent: general-purpose -->

- [ ] Run `pnpm typecheck` from the repo root.
- [ ] Fix any type errors before marking done.

---
id: TASK-041
title: "Grounding constraint: validate medical narrative citations against provided block IDs"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-040]
blocks: []
parallel_safe_with: []
uat: ""
tags: [generation, grounding, medical-narrative, validation]
---

# TASK-041 — Medical Narrative Grounding Constraint

## Objective

Add a post-generation validation pass in `packages/api/src/lib/medical-narrative.ts` that inspects the completed narrative text for `[block-<id>]` citation markers and verifies that every cited block ID is in the set of block IDs that were passed to the model. Any uncited factual sentence (heuristic: contains a diagnosis, medication, or provider name from the extracted fields) or any citation referencing a block ID not in the provided set is logged as a grounding warning. The function returns both the narrative text and a `groundingReport: { validCitations: number; unknownCitations: string[] }` object.

## Approach

Collect block IDs used in the prompt (the `allBlockIds` set). After streaming completes, parse `[block-<id>]` markers from the full text using a regex. Cross-reference: any `[block-X]` where `X` is not in `allBlockIds` is an unknown citation. Log unknown citations to console (not a hard error — the generate endpoint continues). The grounding report is returned alongside the narrative for the caller to include in the response or log.

## Steps

### 1. Update `generateMedicalNarrative` return type  <!-- agent: general-purpose -->

- [ ] Change the function to return a streaming + report pair. One approach:
  ```ts
  export async function generateMedicalNarrative(
    jobId: string,
    modelId: string,
    userId: string,
  ): Promise<{
    stream: AsyncIterable<string>;
    groundingReport: Promise<{ validCitations: number; unknownCitations: string[] }>;
  }>
  ```
  Alternatively, buffer the full output before returning and return `{ text: string; groundingReport: ... }` if SSE streaming is handled upstream (the caller in `post-jobs-generate.ts` streams its own SSE).

- [ ] Choose the **buffered** approach (simpler): `generateMedicalNarrative` collects all chunks, then validates, then returns `{ text: string; groundingReport: { validCitations: number; unknownCitations: string[] } }`. The caller can then stream the `text` via its own SSE loop.

### 2. Implement grounding validation  <!-- agent: general-purpose -->

- [ ] After collecting the full text from the stream, run:
  ```ts
  const CITATION_RE = /\[block-([^\]]+)\]/g;
  const cited = new Set<string>();
  for (const match of text.matchAll(CITATION_RE)) {
    cited.add(match[1]);
  }
  const unknownCitations = [...cited].filter(id => !allBlockIds.has(id));
  const validCitations = cited.size - unknownCitations.length;
  const groundingReport = { validCitations, unknownCitations };
  ```
- [ ] If `unknownCitations.length > 0`, log a warning:
  ```ts
  console.warn(`[medical-narrative] grounding violation — ${unknownCitations.length} unknown citation(s): ${unknownCitations.join(', ')}`);
  ```
- [ ] Return `{ text, groundingReport }`.

### 3. Update caller in `post-jobs-generate.ts`  <!-- agent: general-purpose -->

- [ ] (This is a forward-reference; actual integration happens in TASK-044 — SSE streaming.) For now, ensure the return type change does not break the module's TypeScript compilation.

### 4. Typecheck  <!-- agent: general-purpose -->

- [ ] Run `pnpm typecheck` from the repo root.
- [ ] Fix any type errors before marking done.

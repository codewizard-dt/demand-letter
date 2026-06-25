---
id: TASK-061
title: "POST /jobs/:id/refine — Lambda handler with SSE streaming, scope filtering, persist, and audit log"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-060]
blocks: [TASK-062, TASK-063]
parallel_safe_with: []
uat: "[[UAT-061]]"
tags: [backend, lambda, sse, refinement, roadmap-006]
---

# TASK-061 — POST /jobs/:id/refine Lambda handler

## Objective

Create the `POST /jobs/:id/refine` Lambda handler that accepts `{ instruction: string, scope?: string }`, performs a second-pass Claude call on the current letter text, streams the refined output via SSE, persists a `Refinement` record on completion, and logs to `LlmAuditLog` via the existing provider wrapper.

## Approach

Follow the same pattern as `post-jobs-generate.ts` and `medical-narrative.ts`:
- Use `invokeModelStream` from `./ai-provider` (which handles `LlmAuditLog` automatically via the provider wrapper)
- If `scope` is provided (e.g. `"medical_narrative"`), extract only the relevant zone text from `jobs.output` to send to Claude; instruct it to return only the replacement zone prose
- If `scope` is `"all"` or omitted, pass the full `jobs.output` text
- Stream SSE chunks using the same `data: <chunk>\n\n` / `event: complete\ndata: \n\n` envelope
- On `event: complete`, create a `Refinement` record with `beforeText = jobs.output`, `afterText = streamed content`, `accepted = false`

## Steps

### 1. Create the handler file  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-refine.ts`
- [x] Import: `APIGatewayProxyHandler` from `aws-lambda`; `prisma` from `@demand-letter/db`; `LlmFeature` from `@demand-letter/db`; `invokeModelStream` from `../lib/ai-provider`
- [x] Parse `event.pathParameters?.id` → `jobId`; return 400 if missing
- [x] Parse `event.body` as JSON to extract `instruction: string` and optional `scope: string`; return 400 if `instruction` is missing
- [x] Fetch `job` from `prisma.job.findUnique({ where: { id: jobId } })`; return 404 if not found; return 422 if `job.output` is null/empty (not yet generated)
- [ ] Build scope-filtered content:
  - [x] If `scope && scope !== 'all'`: set `relevantText` to the portion of `job.output` that corresponds to the scope section name; for now, pass the full text with a note in the prompt instructing Claude to return only the replacement for that section
  - [x] Otherwise: `relevantText = job.output`
- [x] Fetch `extractedFields` from `prisma.extractedField.findMany({ where: { jobId } })` as grounding context
- [x] Build system prompt:
  ```
  You are a legal writer refining a personal injury demand letter. Apply the attorney's instruction precisely. Every factual claim must reference only information present in the extracted fields provided. Return only the revised text — no explanation or preamble.
  ```
- [x] Build user message:
  ```
  ## Current Letter Text
  ${relevantText}

  ## Extracted Fields (grounding context)
  ${extractedFields.map(f => `${f.fieldName}: ${f.value ?? '(not found)'}`).join('\n')}

  ## Attorney Instruction
  ${instruction}${scope && scope !== 'all' ? `\n\nScope: return only the revised text for the "${scope}" section.` : ''}

  Apply the instruction and return the revised text now.
  ```
- [x] Call `invokeModelStream({ modelId: MODEL_ID, feature: LlmFeature.refinement, userId: 'system', system, messages: [{ role: 'user', content: userMessage }] })`
- [x] Collect streamed chunks into `afterText`; build SSE body using `chunks.map(c => \`data: ${c}\n\n\`).join('') + 'event: complete\ndata: \n\n'`
- [x] After stream completes, `prisma.refinement.create({ data: { jobId, instruction, scope: scope ?? 'all', beforeText: job.output, afterText, accepted: false } })`
- [x] Return SSE response (statusCode 200, `Content-Type: text/event-stream`)
- [x] Wrap in try/catch; return 500 on error

### 2. Register in template.yaml  <!-- agent: general-purpose -->

- [x] Add a `PostJobsRefineFunction` SAM resource to `template.yaml` following the pattern of existing function resources (same `CodeUri`, `Runtime`, `Layers: [!Ref DbLayer]`, environment variables including `BEDROCK_MODEL_ID`)
- [x] Add `Events.PostJobsRefineApi`: `Type: Api`, `Path: /jobs/{id}/refine`, `Method: post`
- [x] Add `Policies`: `AWSLambdaBasicExecutionRole` plus `BedrockInvokePolicy` (same as generate function)

### 3. Add API client helper  <!-- agent: general-purpose -->

- [x] In `packages/web/src/lib/api.ts`, add:
  ```typescript
  export async function refineJob(
    jobId: string,
    instruction: string,
    scope: string | undefined,
    onChunk: (text: string) => void,
  ): Promise<string> { ... }
  ```
  — POST to `/jobs/${jobId}/refine`, body `{ instruction, scope }`, consume SSE stream same as `generateJob`, collect and return full `afterText`

### 4. Build and verify  <!-- agent: general-purpose -->

- [x] Run `pnpm build` from the project root (or `pnpm --filter @demand-letter/api build`) to confirm TypeScript compiles without errors
- [x] Confirm `.build/handlers/post-jobs-refine.js` is emitted

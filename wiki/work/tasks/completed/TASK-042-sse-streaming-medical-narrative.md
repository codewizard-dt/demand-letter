---
id: TASK-042
title: "SSE streaming: stream medical narrative tokens to frontend while docxtemplater fill waits"
status: done
created: 2026-06-24
updated: 2026-06-25
depends_on: [TASK-040, TASK-041]
blocks: []
parallel_safe_with: []
uat: "[[UAT-042]]"
tags: [generation, sse, streaming, medical-narrative]
---

# TASK-042 — SSE Streaming for Medical Narrative

## Objective

Update `packages/api/src/handlers/post-jobs-generate.ts` to stream the medical narrative phase via Server-Sent Events (SSE). The Lambda handler sends `Content-Type: text/event-stream` and emits `data: <chunk>\n\n` lines as the medical narrative generates. After streaming completes, the docxtemplater fill (Phase 3 tasks) runs and the final `event: complete\n\n` closes the stream. This gives the frontend a "Building document…" live progress indicator while the only LLM call in the pipeline runs.

## Approach

AWS Lambda with API Gateway does not support true SSE; however, since the existing skeleton already streams via `invokeModelStream` and returns the full body as a `text/plain` response, we simulate SSE by returning the body as an SSE-formatted text response. The frontend reads it with `fetch` + `ReadableStream`. The handler collects chunks in a string and returns once all chunks are received — AWS Lambda response streaming (Response Streaming) is not needed at this stage; the body is the concatenated SSE text, parsed by the frontend as it arrives through the HTTP connection.

Alternatively, if the environment supports Lambda response streaming, use `awslambda.HttpResponseStream.from(responseStream, metadata)`. For this task, use the simpler concatenated-response approach (same as the existing skeleton) and prefix each chunk with `data: ` to make the frontend's `EventSource` or `fetch` reader happy.

## Steps

### 1. Read current `post-jobs-generate.ts`  <!-- agent: general-purpose -->

- [x] Read `packages/api/src/handlers/post-jobs-generate.ts`. <!-- Completed: 2026-06-25 -->
- [x] Identify where `invokeModelStream` is called and chunks are collected. <!-- Completed: 2026-06-25 -->

### 2. Replace naive generation with medical narrative call  <!-- agent: general-purpose -->

- [x] Import `generateMedicalNarrative` from `'../lib/medical-narrative'`. <!-- Completed: 2026-06-25 -->
- [x] Replace the existing `invokeModelStream` call with:
  ```ts
  const userId = 'system';
  const { text: narrativeText, groundingReport } = await generateMedicalNarrative(
    jobId, MODEL_ID, userId
  );
  ```
  <!-- Completed: 2026-06-25 -->
- [x] Log grounding report to console (non-blocking warning already emitted inside the function). <!-- Completed: 2026-06-25 -->

### 3. Format response as SSE  <!-- agent: general-purpose -->

- [x] Build the SSE body:
  ```ts
  // Emit each ~80-char chunk as a separate SSE data event for streaming effect
  const chunks = narrativeText.match(/.{1,80}/gs) ?? [narrativeText];
  const sseBody = chunks.map(c => `data: ${c}\n\n`).join('') + 'event: complete\ndata: \n\n';
  ```
  <!-- Completed: 2026-06-25 -->
- [x] Return:
  ```ts
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
    body: sseBody,
  };
  ```
  <!-- Completed: 2026-06-25 -->
- [x] Update `jobs.status = 'done'` and `jobs.output = narrativeText` (the narrative text without SSE formatting) BEFORE returning the response. The output S3 key is set in TASK-044 (docxtemplater render). <!-- Completed: 2026-06-25 -->

### 4. Typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the repo root. <!-- Completed: 2026-06-25 — PASSED (all 3 packages clean) -->
- [x] Fix any type errors before marking done. <!-- Completed: 2026-06-25 — No errors -->

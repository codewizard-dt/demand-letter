---
id: TASK-010
title: "AI Provider Wrapper with LLM Audit Logging"
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: [TASK-008, TASK-009]
blocks: []
parallel_safe_with: []
uat: "[[UAT-010]]"
tags: [llm-audit, bedrock, streaming, phase-2]
---

# TASK-010 — AI Provider Wrapper with LLM Audit Logging

## Objective

Create `packages/api/src/lib/ai-provider.ts` — a thin wrapper around the AWS Bedrock SDK that handles both streaming and non-streaming Claude invocations, records wall-clock `durationMs`, and fire-and-forgets an `LlmAuditLog` row after every call. All logging errors are swallowed so a failed DB write never breaks the caller's request. Every subsequent feature (zone classification, case extraction, generation, refinement) calls through this wrapper and gets cost/usage tracking for free.

## Approach

Export two functions: `invokeModel()` for non-streaming calls and `invokeModelStream()` for SSE-streamed calls. Both accept `{ modelId, feature, userId, messages, system? }` and return the Bedrock response. Both wrap the actual SDK call in a `try/finally` block: record `Date.now()` before the call, compute `durationMs` in `finally`, then fire `prisma.llmAuditLog.create(...)` with `.catch(() => {})`. Use the `estimateCostUsd()` helper from TASK-009 to populate `estimatedCostUsd`. The Prisma client is imported from the shared `@demand-letter/db` package.

## Steps

### 1. Confirm Bedrock SDK is available  <!-- agent: Explore -->

- [x] Check `packages/api/package.json` for `@aws-sdk/client-bedrock-runtime`
  - Use `mcp__serena__find_file` to locate `package.json` under `packages/api/`
  - Read it; if the SDK is missing, add it: `pnpm --filter @demand-letter/api add @aws-sdk/client-bedrock-runtime`

### 2. Create `packages/api/src/lib/ai-provider.ts`  <!-- agent: general-purpose -->

- [x] Create the file with the following content (use `Write`):

```typescript
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { LlmFeature, prisma } from '@demand-letter/db';
import { estimateCostUsd } from './ai';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

interface InvokeOptions {
  modelId: string;
  feature: LlmFeature;
  userId: string;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function invokeModel(opts: InvokeOptions): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    system: opts.system,
    messages: opts.messages,
  });

  const start = Date.now();
  try {
    const response = await client.send(
      new InvokeModelCommand({
        modelId: opts.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(body),
      }),
    );
    const parsed = JSON.parse(Buffer.from(response.body).toString());
    const inputTokens: number = parsed.usage?.input_tokens ?? 0;
    const outputTokens: number = parsed.usage?.output_tokens ?? 0;
    const text: string = parsed.content?.[0]?.text ?? '';

    logAudit(opts, inputTokens, outputTokens, Date.now() - start);
    return text;
  } catch (err) {
    logAudit(opts, 0, 0, Date.now() - start);
    throw err;
  }
}

export async function invokeModelStream(
  opts: InvokeOptions,
): Promise<AsyncIterable<string>> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    system: opts.system,
    messages: opts.messages,
  });

  const start = Date.now();
  const response = await client.send(
    new InvokeModelWithResponseStreamCommand({
      modelId: opts.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(body),
    }),
  );

  let inputTokens = 0;
  let outputTokens = 0;

  async function* generate(): AsyncIterable<string> {
    for await (const event of response.body ?? []) {
      const chunk = JSON.parse(Buffer.from(event.chunk?.bytes ?? []).toString());
      if (chunk.type === 'content_block_delta') {
        yield chunk.delta?.text ?? '';
      }
      if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage?.output_tokens ?? outputTokens;
      }
      if (chunk.type === 'message_start') {
        inputTokens = chunk.message?.usage?.input_tokens ?? inputTokens;
      }
    }
    logAudit(opts, inputTokens, outputTokens, Date.now() - start);
  }

  return generate();
}

function logAudit(
  opts: InvokeOptions,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
): void {
  prisma.llmAuditLog
    .create({
      data: {
        userId: opts.userId,
        feature: opts.feature,
        model: opts.modelId,
        provider: 'bedrock',
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimateCostUsd(opts.modelId, inputTokens, outputTokens),
        durationMs,
      },
    })
    .catch(() => {});
}
```

### 3. Verify Prisma client exports `prisma` singleton  <!-- agent: Explore -->

- [x] Find `packages/db/src/index.ts` (or equivalent) and confirm it exports a `prisma` singleton instance
  - If it does not, add: `export const prisma = new PrismaClient();`
  - Ensure `LlmFeature` enum is also exported from the DB package (added in TASK-008)

### 4. TypeScript compilation check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the repo root — must pass with zero errors
- [x] Fix any import path issues (e.g., if the DB package name differs from `@demand-letter/db`, check `packages/db/package.json` for the actual name)

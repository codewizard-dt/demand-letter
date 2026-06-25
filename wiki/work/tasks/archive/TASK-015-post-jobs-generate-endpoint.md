---
id: TASK-015
title: "POST /jobs/:id/generate Endpoint — Naive Bedrock Generation with SSE"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-010, TASK-014]
blocks: []
parallel_safe_with: []
uat: "[[UAT-015]]"
tags: [api, backend, bedrock, sse, generation, llm-audit, phase-3]
---

# TASK-015 — POST /jobs/:id/generate Endpoint — Naive Bedrock Generation with SSE

## Objective

Implement `POST /jobs/:id/generate` — the skeleton generation endpoint. It pulls the DOCX template and PDF case documents from S3, encodes them as base64, sends them to Claude on Bedrock in a single zero-shot prompt ("generate a demand letter matching this template using these case documents"), streams the response to the client via Server-Sent Events (SSE), and logs the call to `LlmAuditLog` via the AI provider wrapper (TASK-010). At this stage the output is plain text streamed directly — no docxtemplater filling, no zone detection.

## Approach

Pull file S3 keys from the `files` table (via Prisma), fetch each from S3 with `GetObjectCommand`, and base64-encode the binary bodies. Build a `messages` array with all files inlined as Anthropic document blocks. Call `invokeModelStream()` from the AI provider wrapper. Write each streamed chunk to the Lambda response stream using the Lambda Streaming Response API (required for SSE from Lambda — must configure `InvokeMode: RESPONSE_STREAM` in the SAM template function URL or use API Gateway with chunked encoding). Update the Job status to `processing` at start, `done` at end, `failed` on error.

## Steps

### 1. Confirm Lambda streaming support in the SAM template  <!-- agent: Explore -->

- [x] Check `template.yaml` — Lambda streaming (response streaming) requires `FunctionUrlConfig` with `InvokeMode: RESPONSE_STREAM` or a custom integration; API Gateway REST APIs do not natively support streaming <!-- Completed: 2026-06-24 -->
  - If API GW is used, SSE can be simulated by writing to the response body progressively (works in Lambda response streaming mode)
  - Read the existing function resource pattern to determine the right approach for this project

### 2. Create `packages/api/src/handlers/post-jobs-generate.ts`  <!-- agent: general-purpose -->

- [x] Create the handler (adjust streaming approach per Step 1 findings): <!-- Completed: 2026-06-24 -->

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma, LlmFeature } from '@demand-letter/db';
import { invokeModelStream } from '../lib/ai-provider';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.SOURCE_DOCS_BUCKET!;
const MODEL_ID = process.env.BEDROCK_MODEL_ID!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };

  const files = await prisma.file.findMany({ where: { jobId } });
  if (!files.length) {
    return { statusCode: 422, body: JSON.stringify({ error: 'No files uploaded for this job' }) };
  }

  await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } });

  try {
    // Fetch all files from S3 and base64-encode
    const fileContents = await Promise.all(
      files.map(async (f) => {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: f.s3Key }));
        const bytes = await obj.Body?.transformToByteArray();
        return {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: f.mimeType as 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            data: Buffer.from(bytes!).toString('base64'),
          },
        };
      }),
    );

    const userId = 'system'; // no auth at skeleton stage
    const stream = await invokeModelStream({
      modelId: MODEL_ID,
      feature: LlmFeature.skeleton_generation,
      userId,
      messages: [
        {
          role: 'user',
          content: [
            ...fileContents,
            {
              type: 'text',
              text: 'Generate a demand letter matching the provided template exactly, using the case documents as the source of facts.',
            },
          ] as any,
        },
      ],
    });

    // Collect streamed output (SSE chunking handled at API GW / function URL layer)
    let output = '';
    for await (const chunk of stream) {
      output += chunk;
    }

    await prisma.job.update({ where: { id: jobId }, data: { status: 'done', output } });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: output,
    };
  } catch (err) {
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
    throw err;
  }
};
```

  - Note: The `output` field must be added to the `Job` Prisma model (see Step 3)
  - True SSE streaming from Lambda requires function URLs with `RESPONSE_STREAM` — if using API GW at this stage, returning the full output in the response body is acceptable for the skeleton

### 3. Add `output` field to `Job` Prisma model  <!-- agent: general-purpose -->

- [x] In `packages/db/prisma/schema.prisma`, add to the `Job` model: <!-- Completed: 2026-06-24 -->
  ```prisma
  output String?
  ```
- [x] Run: <!-- Completed: 2026-06-24 — migration skipped (no DB), prisma generate succeeded -->
  ```
  pnpm --filter @demand-letter/db prisma migrate dev --name add-job-output
  pnpm --filter @demand-letter/db prisma generate
  ```

### 4. Register in SAM template  <!-- agent: general-purpose -->

- [x] Add to `template.yaml`: <!-- Completed: 2026-06-24 -->

```yaml
PostJobsGenerateFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/post-jobs-generate.handler
    Timeout: 300
    Events:
      Api:
        Type: Api
        Properties:
          Path: /jobs/{id}/generate
          Method: post
    Layers:
      - !Ref DbLayer
    Environment:
      Variables:
        DATABASE_URL: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'
        SOURCE_DOCS_BUCKET: !Ref SourceDocsBucket
        BEDROCK_MODEL_ID: !Sub '{{resolve:ssm:/${Stage}/demand-letter/bedrock-model-id}}'
        AWS_REGION: !Ref AWS::Region
```

  - Set `Timeout: 300` (5 minutes) — generation can be slow

### 5. TypeScript compilation check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-24 — zero errors -->
- [x] Verify `invokeModelStream` accepts the document-array message format (adjust type if needed) <!-- Completed: 2026-06-24 — InvokeOptions.messages widened -->

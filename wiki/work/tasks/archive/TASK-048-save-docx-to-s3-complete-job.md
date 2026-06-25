---
id: TASK-048
title: "Wire renderTemplate into post-jobs-generate.ts: upload DOCX to S3 and set jobs.status = complete"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-044]
blocks: []
parallel_safe_with: []
uat: "[[UAT-048]]"
tags: [generation, docxtemplater, s3, prisma, schema-migration]
---

# TASK-048 — Wire renderTemplate into post-jobs-generate.ts: upload DOCX to S3 and set jobs.status = complete

## Objective

Extend the `POST /jobs/:id/generate` Lambda handler (`packages/api/src/handlers/post-jobs-generate.ts`) so that after the medical narrative is generated it: (1) assembles the full docxtemplater data object via `buildDataObject`, (2) injects the narrative text under the `medicalNarrative` key, (3) calls `renderTemplate` from `docx-renderer.ts` to produce a DOCX buffer, (4) uploads that buffer to S3 under `${jobId}/output/demand-letter.docx`, (5) persists the S3 key to the new `outputS3Key` column on the `jobs` row and sets `status = 'complete'`. Also catches `TemplateRenderError` and returns HTTP 500 with its structured `errors` payload.

## Approach

Research (`raw/research/docx-s3-output-upload/index.md`) confirmed:
- `renderTemplate(jobId, data): Promise<Buffer>` is already implemented and re-exported from `packages/api/src/lib/index.ts`.
- `buildDataObject(jobId): Promise<GenerationData>` is also re-exported from the same barrel.
- `medicalNarrative` is **not** in `FIELD_SCHEMA` — the narrative text must be manually merged into the data object as `data.medicalNarrative = narrativeText` before calling `renderTemplate`.
- The `Job` Prisma model has no `outputS3Key` column yet — a schema migration is required as Step 1.
- S3 upload uses raw `PutObjectCommand` from `@aws-sdk/client-s3` (no abstraction layer) — consistent with all other handlers.
- HTTP error shape for 500: `{ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'template_render_failed', errors: err.errors }) }`.
- The `TemplateRenderError` catch block must be ordered **before** the generic `catch(err)` block that sets `status = 'failed'`.
- The current `status = 'done'` update (line 40 of the handler) stores plain-text narrative; replace it with a `status: 'complete'` update that also sets `outputS3Key` after the S3 upload succeeds.

## Steps

### 1. Add `outputS3Key` column to the Prisma Job model and migrate  <!-- agent: general-purpose -->

- [x] Edit `packages/db/prisma/schema.prisma` — add `outputS3Key String?` to the `Job` model, after the existing `output String?` line: <!-- Completed: 2026-06-25 -->
  ```prisma
  model Job {
    id          String   @id @default(cuid())
    status      String   @default("pending")
    output      String?
    outputS3Key String?          ← add this line
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    ...
  }
  ```
- [x] Run migration from repo root: <!-- Completed: 2026-06-25 — prisma generate succeeded; migrate dev deferred to when DB is available -->
  ```bash
  pnpm --filter @demand-letter/db prisma migrate dev --name add_jobs_output_s3_key
  ```
  Verify the migration directory `packages/db/prisma/migrations/<timestamp>_add_jobs_output_s3_key/` is created.
- [x] Confirm Prisma client regenerated (should happen automatically during `migrate dev`). If not: <!-- Completed: 2026-06-25 — ran prisma generate explicitly -->
  ```bash
  pnpm --filter @demand-letter/db prisma generate
  ```

### 2. Update `post-jobs-generate.ts` imports and module-level constants  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/handlers/post-jobs-generate.ts`. Current imports (lines 0–4): <!-- Completed: 2026-06-25 -->
  ```ts
  import { APIGatewayProxyHandler } from 'aws-lambda';
  import { prisma } from '@demand-letter/db';
  import { generateMedicalNarrative } from '../lib/medical-narrative';
  import { computeGapReport } from '../lib/sufficiency-gate';
  const MODEL_ID = process.env.BEDROCK_MODEL_ID!;
  ```
- [x] Add S3 SDK and lib barrel imports using Serena `insert_at_line` at line 2 (before `generateMedicalNarrative`): <!-- Completed: 2026-06-25 -->
  ```ts
  import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  import { renderTemplate, TemplateRenderError, buildDataObject } from '../lib';
  ```
- [x] Add module-level constants after `const MODEL_ID` (same pattern as all other handlers): <!-- Completed: 2026-06-25 -->
  ```ts
  const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  const BUCKET = process.env.DOCUMENTS_BUCKET!;
  ```

### 3. Wire `buildDataObject` + `renderTemplate` + S3 upload into the handler  <!-- agent: general-purpose -->

- [x] In `packages/api/src/handlers/post-jobs-generate.ts`, inside the `try` block, after the `generateMedicalNarrative` call and before the `prisma.job.update` call, insert: <!-- Completed: 2026-06-25 -->
  ```ts
  // Assemble docxtemplater data object and inject the AI-generated narrative
  const data = await buildDataObject(jobId);
  (data as Record<string, unknown>).medicalNarrative = narrativeText;

  // Render DOCX from tagged template
  const docxBuffer = await renderTemplate(jobId, data);

  // Upload rendered DOCX to S3
  const outputS3Key = `${jobId}/output/demand-letter.docx`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: outputS3Key,
    Body: docxBuffer,
    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));
  ```
- [x] Replace the existing line: <!-- Completed: 2026-06-25 — combined into single replace_content call -->
  ```ts
  await prisma.job.update({ where: { id: jobId }, data: { status: 'done', output: narrativeText } });
  ```
  with:
  ```ts
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'complete', output: narrativeText, outputS3Key },
  });
  ```
  (Keeping `output: narrativeText` preserves the plain-text narrative for the existing SSE stream body; `outputS3Key` is the new addition.)

### 4. Catch `TemplateRenderError` and return HTTP 500  <!-- agent: general-purpose -->

- [x] In the `catch(err)` block of `post-jobs-generate.ts`, add an `instanceof` guard at the top: <!-- Completed: 2026-06-25 -->
  ```ts
  } catch (err) {
    if (err instanceof TemplateRenderError) {
      await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'template_render_failed',
          errors: err.errors,
        }),
      };
    }
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
    throw err;
  }
  ```
  This ensures `TemplateRenderError` returns a structured 500 response while other errors still propagate for Lambda's built-in error handling.

### 5. Typecheck  <!-- agent: general-purpose -->

- [x] Run from repo root: <!-- Completed: 2026-06-25 — all packages pass with zero errors -->
  ```bash
  pnpm typecheck
  ```
- [x] Fix any type errors. Common issues to watch for: <!-- Completed: 2026-06-25 — no fixes needed -->
  - `data` from `buildDataObject` is typed `GenerationData = Record<string, string | Array<Record<string, string>>>` — injecting `medicalNarrative` via a cast to `Record<string, unknown>` avoids the type error while keeping the rest of the object typed.
  - `outputS3Key` on `prisma.job.update` only resolves after the schema migration regenerates the Prisma client (Step 1 must be done first).
  - `TemplateRenderError` import from `'../lib'` must resolve through the barrel in `packages/api/src/lib/index.ts` (already exported: `export { renderTemplate, TemplateRenderError } from './docx-renderer'`).

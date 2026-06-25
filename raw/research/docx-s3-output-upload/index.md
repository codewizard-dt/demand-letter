---
topic: "How does docx-renderer.ts expose renderTemplate, what is the S3 upload pattern used in the codebase (especially in Lambda handlers), and how does post-jobs-generate.ts currently call the renderer and update the jobs row status? Find the exact function signatures, the AWS S3 client/upload utility pattern, and the Prisma query for jobs status update. Also confirm what TemplateRenderError looks like and the HTTP error response shape used elsewhere in the API."
slug: docx-s3-output-upload
researched: 2026-06-25
sources: [./sources.md]
---

# Research: DOCX Output Upload to S3 — Integration with post-jobs-generate.ts

> `renderTemplate` already exists in `docx-renderer.ts` and returns a `Buffer`. The S3 upload pattern is a raw `PutObjectCommand` via `@aws-sdk/client-s3`, consistent across all Lambda handlers. The `Job` Prisma model lacks an `output_s3_key` column — it must be added via migration. The `post-jobs-generate.ts` handler currently does NOT call `renderTemplate`; it only calls `generateMedicalNarrative`, updates `status = 'done'`, and streams SSE. The task must: (1) add `outputS3Key String?` to the Prisma schema + run migration, (2) call `buildDataObject` + `renderTemplate` after the narrative, (3) upload the buffer to S3 under `${jobId}/output/demand-letter.docx`, (4) update the job row to `status = 'complete'` with the `outputS3Key`, and (5) catch `TemplateRenderError` and return HTTP 500 with its `errors` array.

## Research Questions

1. What is the exact signature of `renderTemplate` and `TemplateRenderError` in `docx-renderer.ts`?
2. What S3 upload pattern does the codebase use (client instantiation, command, content type)?
3. What does `post-jobs-generate.ts` currently do — and what does it NOT yet do?
4. Does the `Job` Prisma model have an `output_s3_key` column, and what migration pattern does the codebase use?
5. What is the HTTP error response shape for 500s in other handlers?

## Current State (Codebase)

### `docx-renderer.ts` — `packages/api/src/lib/docx-renderer.ts` [S1]

```ts
export class TemplateRenderError extends Error {
  constructor(public readonly errors: unknown[]) {
    super('docxtemplater render failed');
  }
}

export async function renderTemplate(
  jobId: string,
  data: Record<string, string | Array<Record<string, string>>>,
): Promise<Buffer>
```

- Fetches the tagged template DOCX from S3 via `prisma.template.findFirst` + `GetObjectCommand`.
- Renders all `{tag}` placeholders and loop sections.
- Throws `TemplateRenderError` on any missing tag or docxtemplater structured error.
- Returns a rendered DOCX buffer (`Buffer`).
- Re-exported from `packages/api/src/lib/index.ts` as `export { renderTemplate, TemplateRenderError } from './docx-renderer'`.

### `post-jobs-generate.ts` — `packages/api/src/handlers/post-jobs-generate.ts` [S2]

Current imports (lines 0–4):
```ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { generateMedicalNarrative } from '../lib/medical-narrative';
import { computeGapReport } from '../lib/sufficiency-gate';
const MODEL_ID = process.env.BEDROCK_MODEL_ID!;
```

Current flow:
1. Validates `jobId`.
2. Checks files exist (`prisma.file.findMany`).
3. Runs sufficiency pre-check (`computeGapReport`), returns 400 if gaps.
4. Updates `status = 'processing'`.
5. Calls `generateMedicalNarrative(jobId, MODEL_ID, userId)` → `{ text: narrativeText, groundingReport }`.
6. Updates `status = 'done', output = narrativeText`.
7. Returns SSE body (chunked text stream).
8. On catch: updates `status = 'failed'`, re-throws.

**Gaps**: No call to `buildDataObject`, no call to `renderTemplate`, no S3 upload of the rendered DOCX, no `outputS3Key` stored, no `TemplateRenderError` catch.

### S3 Upload Pattern [S3]

Consistently across `post-jobs-files.ts` and `post-jobs-templates-inject.ts`:
```ts
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: '<s3-key>',
  Body: buffer,
  ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}));
```

Note: `docx-renderer.ts` already instantiates `s3` and `BUCKET` at module scope with the same pattern. `post-jobs-generate.ts` currently has neither.

### Prisma Job Schema [S4]

```prisma
model Job {
  id        String   @id @default(cuid())
  status    String   @default("pending")
  output    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  files           File[]
  templates       Template[]
  sourceFiles     SourceFile[]
  extractedFields ExtractedField[]
  @@index([status])
  @@index([createdAt])
  @@map("jobs")
}
```

**Critical finding**: No `outputS3Key` or `output_s3_key` column exists. The roadmap references `jobs.output_s3_key` but the column is not yet in the schema. A new migration is required.

### Migration Pattern [S5]

Migrations live in `packages/db/prisma/migrations/`. The naming convention is `YYYYMMDDHHMMSS_<description>/`. After schema edit, run `pnpm --filter @demand-letter/db prisma migrate dev --name <description>` or `prisma migrate deploy` for production.

### HTTP Error Response Shape [S6]

From `post-jobs-generate.ts` and other handlers:
```ts
return {
  statusCode: 400,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    error: 'sufficiency_precheck_failed',
    message: '...',
    gaps: [...],
  }),
};
```

For `TemplateRenderError`, the shape should be:
```ts
return {
  statusCode: 500,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    error: 'template_render_failed',
    errors: (err as TemplateRenderError).errors,
  }),
};
```

### `buildDataObject` [S7]

```ts
export async function buildDataObject(jobId: string): Promise<GenerationData>
```
Returns `Record<string, string | Array<Record<string, string>>>` — exactly what `renderTemplate` accepts as `data`. Already re-exported from `packages/api/src/lib/index.ts`.

## Key Findings

- [S1] `renderTemplate(jobId, data)` returns `Promise<Buffer>` — the buffer is upload-ready.
- [S4] `jobs` table has no `output_s3_key` column; schema + migration must be added as Step 1.
- [S2] `post-jobs-generate.ts` currently does NOT call `renderTemplate` or `buildDataObject`; this wiring is the core of the task.
- [S3] S3 upload uses raw `PutObjectCommand` — no abstraction layer needed, consistent with the rest of the codebase.
- [S6] HTTP 500 errors use `{ error: '<key>', ... }` JSON shape.
- [S2] Current job status after success is `'done'`; the roadmap specifies `'complete'` for post-render. These are different statuses — the handler should set `'complete'` after DOCX upload (distinct from the current `'done'` that only means narrative generated). The existing `get-jobs-output.ts` checks `status === 'processing'` and `status === 'failed'` but not `'complete'` — it will need updating or the final status naming needs to align.

## Constraints

1. Schema migration required before Prisma can write `outputS3Key`.
2. The S3 key convention for output: `${jobId}/output/demand-letter.docx` — consistent with the `${jobId}/` prefix used throughout.
3. DOCX content type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
4. `TemplateRenderError` must be caught *before* the generic `catch(err)` block that currently sets `status = 'failed'`.
5. The rendered DOCX should be uploaded *after* the medical narrative is generated (narrative text goes into `data.medicalNarrative` in the data object before calling `renderTemplate`).
6. `get-jobs-output.ts` currently returns `job.output` (plain text) — once `outputS3Key` exists, it should return a presigned URL or redirect. That is Phase 4 work; this task's scope is only the generate handler + schema.

## Recommendation

**Approach**: Extend the existing `handler` in `post-jobs-generate.ts` in-place.

**Implementation outline**:
1. Add `outputS3Key String?` to `packages/db/prisma/schema.prisma` Job model.
2. Run `pnpm --filter @demand-letter/db prisma migrate dev --name add_jobs_output_s3_key`.
3. In `post-jobs-generate.ts`, add imports: `S3Client`, `PutObjectCommand` from `@aws-sdk/client-s3`; `renderTemplate`, `TemplateRenderError`, `buildDataObject` from `../lib`.
4. Add module-level `s3` and `BUCKET` constants (same pattern as other handlers).
5. After `generateMedicalNarrative`, call `buildDataObject(jobId)` — merge `narrativeText` into the data object under the correct tag key (e.g. `medicalNarrative` or whatever the field-schema maps it to).
6. Call `renderTemplate(jobId, data)` — obtain `docxBuffer`.
7. Construct `outputS3Key = \`${jobId}/output/demand-letter.docx\``.
8. `await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: outputS3Key, Body: docxBuffer, ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))`.
9. `await prisma.job.update({ where: { id: jobId }, data: { status: 'complete', outputS3Key } })`.
10. Catch `TemplateRenderError` and return HTTP 500 with `{ error: 'template_render_failed', errors: err.errors }`.

**Risk**: The medical narrative tag key must match the field-schema mapping. Verify `dbNameToTagName('medical_narrative')` or check the data builder — if the tag isn't in `buildDataObject`'s output, it must be injected manually before calling `renderTemplate`.

## Next Steps

- `pnpm --filter @demand-letter/db prisma migrate dev --name add_jobs_output_s3_key`
- Verify `medicalNarrative` tag key against `FIELD_SCHEMA` in `field-schema.ts`
- Update `get-jobs-output.ts` in Phase 4 to return presigned URL from `outputS3Key`

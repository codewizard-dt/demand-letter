---
topic: "How does docx-renderer.ts expose renderTemplate, what is the S3 upload pattern used in the codebase (especially in Lambda handlers), and how does post-jobs-generate.ts currently call the renderer and update the jobs row status? Find the exact function signatures, the AWS S3 client/upload utility pattern, and the Prisma query for jobs status update. Also confirm what TemplateRenderError looks like and the HTTP error response shape used elsewhere in the API."
slug: docx-s3-output-upload
researched: 2026-06-25
---

# Primary Sources — DOCX Output Upload to S3

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/api/src/lib/docx-renderer.ts::renderTemplate` | 2026-06-25 | Exact signature: `renderTemplate(jobId: string, data: Record<string, string | Array<Record<string, string>>>): Promise<Buffer>`; `TemplateRenderError` class with `errors: unknown[]` |
| S2 | codebase | `packages/api/src/handlers/post-jobs-generate.ts::handler` | 2026-06-25 | Full handler body: current imports, flow (no renderTemplate call), status updates (`'processing'` → `'done'`), SSE return, catch block |
| S3 | codebase | `packages/api/src/handlers/post-jobs-templates-inject.ts` (line 51) | 2026-06-25 | `PutObjectCommand` upload pattern with `Bucket`, `Key`, `Body`, `ContentType` for DOCX |
| S4 | codebase | `packages/db/prisma/schema.prisma::Job` (lines 10–24) | 2026-06-25 | Job model fields: no `outputS3Key` or `output_s3_key` column exists; only `output String?` (plain text) |
| S5 | codebase | `packages/db/prisma/migrations/` (directory listing) | 2026-06-25 | Migration naming convention: `YYYYMMDDHHMMSS_<description>/`; confirms `prisma migrate dev` workflow |
| S6 | codebase | `packages/api/src/handlers/post-jobs-generate.ts` (lines 19–27) | 2026-06-25 | HTTP error shape: `{ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: '<key>', message: '...', ... }) }` |
| S7 | codebase | `packages/api/src/lib/generation-data-builder.ts::buildDataObject` | 2026-06-25 | Signature: `buildDataObject(jobId: string): Promise<GenerationData>` where `GenerationData = Record<string, string | Array<Record<string, string>>>` — exactly matches `renderTemplate`'s `data` param |

## Excerpts

### S1 — docx-renderer.ts renderTemplate and TemplateRenderError
`packages/api/src/lib/docx-renderer.ts` (lines 9–54)
```ts
export class TemplateRenderError extends Error {
  constructor(public readonly errors: unknown[]) {
    super('docxtemplater render failed');
  }
}

export async function renderTemplate(
  jobId: string,
  data: Record<string, string | Array<Record<string, string>>>,
): Promise<Buffer> {
  // ... fetches template from S3, renders with docxtemplater, returns Buffer
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}
```

### S2 — post-jobs-generate.ts current handler body
`packages/api/src/handlers/post-jobs-generate.ts` (lines 0–59)
```ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';
import { generateMedicalNarrative } from '../lib/medical-narrative';
import { computeGapReport } from '../lib/sufficiency-gate';
const MODEL_ID = process.env.BEDROCK_MODEL_ID!;

export const handler: APIGatewayProxyHandler = async (event) => {
  // ... sufficiency check, then:
  await prisma.job.update({ where: { id: jobId }, data: { status: 'processing' } });
  try {
    const { text: narrativeText, groundingReport } = await generateMedicalNarrative(jobId, MODEL_ID, userId);
    await prisma.job.update({ where: { id: jobId }, data: { status: 'done', output: narrativeText } });
    // SSE stream returned
  } catch (err) {
    await prisma.job.update({ where: { id: jobId }, data: { status: 'failed' } });
    throw err;
  }
};
```

### S3 — PutObjectCommand pattern (post-jobs-templates-inject.ts)
`packages/api/src/handlers/post-jobs-templates-inject.ts` (lines 51–56)
```ts
await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: s3KeyTagged,
  Body: taggedBuffer,
  ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}));
```

### S4 — Job Prisma model
`packages/db/prisma/schema.prisma` (lines 10–24)
```prisma
model Job {
  id        String   @id @default(cuid())
  status    String   @default("pending")
  output    String?
  ...
  @@map("jobs")
}
```
No `outputS3Key` column. Column must be added.

### S7 — buildDataObject signature
`packages/api/src/lib/generation-data-builder.ts` (line 5)
```ts
export async function buildDataObject(jobId: string): Promise<GenerationData>
// GenerationData = Record<string, string | Array<Record<string, string>>>
```

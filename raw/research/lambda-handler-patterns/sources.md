---
topic: "How are Lambda handlers structured in this project? Specifically: (1) where do API Lambda handlers live (file path pattern), (2) how does the existing GET/POST Lambda handler for /jobs/:id look (routing, auth, response shape), (3) how is S3 presigned URL generation done anywhere in the codebase (GetObjectCommand + getSignedUrl or presignedGetObject), (4) where does the frontend SSE consumer live and how does it handle the 'complete' event, (5) what is the jobs table schema (output_s3_key column name)."
slug: lambda-handler-patterns
researched: 2026-06-25
---

# Primary Sources — Lambda Handler Patterns

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/api/src/handlers/get-jobs-output.ts` | 2026-06-25 | Entire content of the existing output handler (plain-text blob return, no presigned URL, reads `job.output`) |
| S2 | codebase | `template.yaml` lines 295–317 | 2026-06-25 | SAM function definition for `GetJobsOutputFunction` — handler path, route, policies, missing `DOCUMENTS_BUCKET` env var |
| S3 | codebase | `packages/api/package.json` | 2026-06-25 | Confirms `@aws-sdk/s3-request-presigner` is NOT listed; `@aws-sdk/client-s3` is at `^3.0.0` |
| S4 | codebase | `packages/web/src/lib/api.ts::generateJob`, `packages/web/src/lib/api.ts::downloadOutput`, `packages/web/src/pages/GeneratePage.tsx::handleGenerate`, `packages/web/src/pages/GeneratePage.tsx::handleDownload` | 2026-06-25 | Full SSE consumer and download trigger logic; `done = true` on stream end drives `setIsDone(true)`; `downloadOutput` returns `Blob` from `job.output` |
| S5 | codebase | `packages/db/prisma/schema.prisma` lines 11–25 | 2026-06-25 | Full `Job` model — no `output_s3_key` or `outputS3Key` column present; only `output String?` (plain-text) |
| S6 | codebase | `packages/api/src/handlers/post-jobs-generate.ts` lines 43–55 | 2026-06-25 | SSE emission pattern: `data: ${chunk}\n\n` per ~80-char chunk, terminated by `event: complete\ndata: \n\n` |
| S7 | codebase | `packages/api/src/lib/docx-renderer.ts` | 2026-06-25 | S3Client + GetObjectCommand pattern used for template fetch — reference for presigner instantiation style |
| S8 | codebase | `template.yaml` lines 183–223 | 2026-06-25 | Handler naming convention and SAM registration pattern for `GetJobsFunction` and `PostJobsFunction` |

## Excerpts

### S1 — `get-jobs-output.ts` (full file)
`packages/api/src/handlers/get-jobs-output.ts`
```ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  if (job.status === 'processing' || job.status === 'pending') {
    return { statusCode: 202, body: JSON.stringify({ status: job.status }) };
  }
  if (job.status === 'failed') {
    return { statusCode: 500, body: JSON.stringify({ error: 'Generation failed' }) };
  }
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="demand-letter-${jobId}.txt"`,
    },
    body: job.output ?? '',
  };
};
```

### S4 — `generateJob` and `downloadOutput` in api.ts
`packages/web/src/lib/api.ts`
```ts
export async function generateJob(jobId: string, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/generate failed: ${res.status}`);
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function downloadOutput(jobId: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
  if (res.status === 202) return null; // still processing
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
  return res.blob();
}
```

### S5 — Job model (schema.prisma)
`packages/db/prisma/schema.prisma` lines 11-25
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

### S6 — SSE emission in post-jobs-generate.ts
`packages/api/src/handlers/post-jobs-generate.ts` lines 43-55
```ts
const chunks = narrativeText.match(/.{1,80}/gs) ?? [narrativeText];
const sseBody = chunks.map(c => `data: ${c}\n\n`).join('') + 'event: complete\ndata: \n\n';
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  } as { [header: string]: string },
  body: sseBody,
};
```

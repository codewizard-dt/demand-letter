---
topic: "How are Lambda handlers structured in this project? Specifically: (1) where do API Lambda handlers live (file path pattern), (2) how does the existing GET/POST Lambda handler for /jobs/:id look (routing, auth, response shape), (3) how is S3 presigned URL generation done anywhere in the codebase (GetObjectCommand + getSignedUrl or presignedGetObject), (4) where does the frontend SSE consumer live and how does it handle the 'complete' event, (5) what is the jobs table schema (output_s3_key column name)."
slug: lambda-handler-patterns
researched: 2026-06-25
sources: [./sources.md]
---

# Research: Lambda Handler Patterns, S3 Presigned URLs, and Frontend SSE Consumer

> The project uses a flat-file Lambda handler convention under `packages/api/src/handlers/`, each exporting a single `handler` constant of type `APIGatewayProxyHandler`. No presigned URL generation exists yet — `@aws-sdk/s3-request-presigner` is **not** in `package.json` and must be added. The frontend SSE consumer (`generateJob` in `packages/web/src/lib/api.ts`) streams raw bytes via `ReadableStream` without parsing SSE event types — it never fires on `event: complete`. The `Job` model has no `output_s3_key` column; one must be added via Prisma migration. The existing `get-jobs-output.ts` handler returns a plain-text blob from `job.output` and must be replaced to return a presigned S3 URL once the DOCX render pipeline writes to S3.

## Research Questions

1. Where do API Lambda handlers live, and what is the file naming/export convention?
2. How does the existing GET handler for `/jobs/:id/output` work (routing, response shape)?
3. How is S3 presigned URL generation done in the codebase today?
4. Where does the frontend SSE consumer live and how does it handle the `complete` event?
5. What is the `jobs` table schema — specifically the `output_s3_key` column?

---

## Current State (Codebase)

### 1. Lambda handler location and convention

All handlers live in `packages/api/src/handlers/` with the pattern `{method}-{route-slug}.ts`. Examples:
- `get-jobs-output.ts` → `GET /jobs/{id}/output`
- `post-jobs-generate.ts` → `POST /jobs/{id}/generate`
- `get-jobs.ts` → `GET /jobs`

Each file exports a **single named constant** `handler: APIGatewayProxyHandler`. The SAM template (`template.yaml`) registers each handler file at its route and method:

```yaml
GetJobsOutputFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: .build/handlers/
    Handler: get-jobs-output.handler
    Runtime: nodejs20.x
    Events:
      GetJobsOutputApi:
        Type: Api
        Properties:
          Path: /jobs/{id}/output
          Method: get
```

There is no auth middleware at the Lambda layer — handlers read `event.pathParameters?.id` directly for path params, and return `{ statusCode, headers?, body }` objects.

### 2. Existing `GET /jobs/:id/output` handler

`packages/api/src/handlers/get-jobs-output.ts` — **current implementation** (stale; needs replacement):

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
    headers: { 'Content-Type': 'text/plain', 'Content-Disposition': `attachment; filename="demand-letter-${jobId}.txt"` },
    body: job.output ?? '',
  };
};
```

This returns the raw `job.output` string (plain text narrative from before the docxtemplater render). It does **not** generate a presigned URL and does **not** reference S3.

The SAM template gives it `S3CrudPolicy` but no `DOCUMENTS_BUCKET` environment variable and no explicit `s3:GetObject` presign permission. The function's `Policies` block needs updating too.

### 3. S3 presigned URL generation

**No presigned URL generation exists in the codebase today.** The `@aws-sdk/s3-request-presigner` package is **not** in `packages/api/package.json`. Handlers use `@aws-sdk/client-s3` (version `^3.0.0`) for `GetObjectCommand`, `PutObjectCommand`, and `ListObjectsV2Command`, but only for direct object reads/writes — never presigned URLs.

S3 patterns in use:
- `docx-renderer.ts`: `S3Client` + `GetObjectCommand` → fetch DOCX buffer
- `post-jobs-templates-inject.ts`: `S3Client` + `GetObjectCommand` + `PutObjectCommand`
- `post-jobs-files.ts`: `S3Client` + `PutObjectCommand`
- `post-jobs-documents-ingest.ts`: `S3Client` + `GetObjectCommand` + `ListObjectsV2Command`

**Required addition**: `pnpm --filter @demand-letter/api add @aws-sdk/s3-request-presigner` and use `getSignedUrl(s3Client, new GetObjectCommand({...}), { expiresIn: 900 })` (15 minutes = 900 seconds).

### 4. Frontend SSE consumer

The SSE consumer is in `packages/web/src/lib/api.ts` (`generateJob` function) and the UI is in `packages/web/src/pages/GeneratePage.tsx`.

**`generateJob` — current implementation**:
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
```

This reads raw bytes as they arrive and passes each decoded chunk to `onChunk`. It does **not** parse SSE framing (`data: ...`, `event: complete`). The `event: complete\ndata: \n\n` emitted by `post-jobs-generate.ts` would be visible as a raw string passed to `onChunk` — it is never treated as a signal.

**`GeneratePage.tsx` — current behaviour**: When `generateJob` resolves (stream ends / `done = true`), `setIsDone(true)` is set, which unmounts the Generate button and shows a Download button. This works because the Lambda returns the entire SSE body in a single response (not true streaming), so `done = true` fires when the full body is received. The `event: complete` is effectively unused.

**`downloadOutput` — current implementation** (uses polling, pulls text blob from old `GET /jobs/:id/output`):
```ts
export async function downloadOutput(jobId: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
  if (res.status === 202) return null; // still processing
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
  return res.blob();
}
```

The `handleDownload` function in `GeneratePage.tsx` polls `downloadOutput` every 2s until a non-null Blob is returned, then triggers a browser download as `demand-letter-${id}.txt`.

**Required changes**: The new implementation should call `GET /jobs/:id/output` once (no polling needed, since the button only appears after `isDone = true`), receive `{ url: "https://..." }` JSON, and then do a browser download using `window.location.href = url` or an `<a>` element — replacing the blob approach.

### 5. Jobs table schema

`packages/db/prisma/schema.prisma` — `model Job`:

```prisma
model Job {
  id        String   @id @default(cuid())
  status    String   @default("pending")
  output    String?           // ← old plain-text storage (stale after DOCX render)
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

**There is no `output_s3_key` column.** The roadmap references `jobs.output_s3_key` but it does not exist yet. A Prisma migration is needed to add:

```prisma
outputS3Key   String?   // S3 key of the rendered output DOCX
```

This maps to `output_s3_key` in SQL (Prisma camelCase → snake_case in `@@map` context, but the Prisma accessor will be `job.outputS3Key`).

---

## Key Findings

1. **Handler file already exists at the right path** (`get-jobs-output.ts`) but contains stale logic returning plain-text. It must be **replaced**, not created. [S1]
2. **Handler registered in SAM template** already at `GET /jobs/{id}/output` with `S3CrudPolicy`. The policy needs `DOCUMENTS_BUCKET` env var added; the bedrock permissions in the policy block are cargo-culted from another function and should be replaced with an explicit `s3:GetObject` statement scoped to the output prefix. [S2]
3. **No presigner package installed** — `@aws-sdk/s3-request-presigner` must be added to `packages/api/package.json`. [S3]
4. **Frontend SSE consumer does not parse event types** — the `event: complete` frame is never explicitly handled; stream completion is inferred from stream `done`. No change needed to fire the Download button after generate, since `setIsDone(true)` already fires on stream end. [S4]
5. **`output_s3_key` column does not exist** in the `Job` model — a Prisma schema addition + migration SQL file is needed. [S5]
6. **`downloadOutput` in api.ts returns a Blob** of the old plain-text; it needs to be updated to receive a JSON `{ url }` response and trigger the download from the presigned URL. [S4]

---

## Constraints

- `@aws-sdk/client-s3` is already at `^3.0.0` — `s3-request-presigner` v3 is compatible.
- SAM `template.yaml` needs updating for `DOCUMENTS_BUCKET` env var and IAM permissions on `GetJobsOutputFunction`.
- Presigned URL TTL: 15 minutes (900 seconds) per roadmap spec.
- The Prisma field name is camelCase `outputS3Key`; the roadmap prose says `jobs.output_s3_key` (SQL column name).
- The existing `GetJobsOutputFunction` in `template.yaml` must be updated in-place (no new SAM resource needed).
- TypeScript types for the API response in `api.ts` need updating (`Blob | null` → `{ url: string } | null` or just `string`).

---

## Recommendation

### Implementation Outline

1. **Add presigner package**: `pnpm --filter @demand-letter/api add @aws-sdk/s3-request-presigner`

2. **Add `outputS3Key` to Prisma schema** in `packages/db/prisma/schema.prisma`:
   ```prisma
   outputS3Key String?   // S3 key for rendered output DOCX
   ```
   Write migration SQL under `packages/db/prisma/migrations/YYYYMMDDHHMMSS_add_output_s3_key/migration.sql`:
   ```sql
   ALTER TABLE "jobs" ADD COLUMN "outputS3Key" TEXT;
   ```

3. **Replace `get-jobs-output.ts` handler** with presigned URL logic:
   ```ts
   import { APIGatewayProxyHandler } from 'aws-lambda';
   import { prisma } from '@demand-letter/db';
   import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

   const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
   const BUCKET = process.env.DOCUMENTS_BUCKET!;

   export const handler: APIGatewayProxyHandler = async (event) => {
     const jobId = event.pathParameters?.id;
     if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };
     const job = await prisma.job.findUnique({ where: { id: jobId } });
     if (!job) return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
     if (job.status !== 'complete') {
       return { statusCode: 202, body: JSON.stringify({ status: job.status }) };
     }
     if (!job.outputS3Key) {
       return { statusCode: 500, body: JSON.stringify({ error: 'Output S3 key not set' }) };
     }
     const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key }), { expiresIn: 900 });
     return {
       statusCode: 200,
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ url }),
     };
   };
   ```

4. **Update SAM `template.yaml`** `GetJobsOutputFunction` block to:
   - Add `Environment.Variables.DOCUMENTS_BUCKET: !Ref DocumentsBucket`
   - Replace the `S3CrudPolicy` + bedrock permissions with a targeted `s3:GetObject` policy on the output prefix

5. **Update `downloadOutput` in `packages/web/src/lib/api.ts`** to parse the JSON response:
   ```ts
   export async function downloadOutput(jobId: string): Promise<string | null> {
     const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
     if (res.status === 202) return null;
     if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
     const { url } = await res.json();
     return url;
   }
   ```

6. **Update `handleDownload` in `GeneratePage.tsx`** to use the URL directly:
   ```ts
   async function handleDownload() {
     setIsDownloading(true);
     try {
       const url = await downloadOutput(id!);
       if (!url) return;
       const a = document.createElement('a');
       a.href = url;
       a.download = `demand-letter-${id}.docx`;
       a.click();
     } finally {
       setIsDownloading(false);
     }
   }
   ```

   Note: the polling loop is no longer needed because `handleDownload` is only reachable when `isDone === true` (stream has completed).

---

## Risks and Mitigations

- **Presigned URL expiry**: 15 minutes is generous for a download triggered immediately after generation, but warn users not to bookmark/share the URL.
- **Missing `outputS3Key` on old jobs**: Jobs in the DB that completed before this migration have no `outputS3Key`. The handler returns 500 for those — acceptable since re-generation would be needed anyway.
- **SAM policy scope**: `S3CrudPolicy` grants full CRUD on the bucket; the tighter `s3:GetObject` on `output/*` is better hygiene but requires testing. Keeping `S3CrudPolicy` temporarily is safe if preferred.

---

## Next Steps

- The task being created covers this implementation end-to-end.
- Run `/wiki-ingest raw/research/lambda-handler-patterns/index.md` to synthesize into the knowledge base.

---
topic: "S3 presigned URL generation using @aws-sdk/s3-request-presigner getSignedUrl with GetObjectCommand, 15-minute TTL pattern in Lambda handlers; also EventSource vs fetch SSE complete event handling, browser download via anchor tag with presigned URL in React"
slug: s3-presigned-url-download
researched: 2026-06-25
sources: [./sources.md]
---

# Research: S3 Presigned URL Download + SSE Complete → Download Button

> The codebase already has `@aws-sdk/client-s3` installed and a working `S3Client` + `GetObjectCommand` pattern across all API handlers. The `@aws-sdk/s3-request-presigner` package is **not yet installed** — it must be added as a dependency to `packages/api`. The presigned URL handler pattern is: import `getSignedUrl` from `@aws-sdk/s3-request-presigner`, construct `new GetObjectCommand({ Bucket, Key })`, call `await getSignedUrl(s3, cmd, { expiresIn: 900 })` (900 = 15 min), return `{ url }` as JSON. On the frontend, `GeneratePage.tsx` already has `isDone` state that shows a "Download Demand Letter" button after generation; the existing `downloadOutput` function in `api.ts` polls for a Blob — it must be rewritten to fetch the presigned URL from `GET /jobs/:id/output` (which now returns `{ url }`) and trigger a browser download via `window.location.href = url` or an `<a download>` click. `EventSource` cannot be used because the generate endpoint is POST; the existing `fetch` + `ReadableStream` approach in `generateJob` (being fixed in TASK-046) handles the `event: complete` termination correctly.

## Research Questions

1. What is the correct API for `@aws-sdk/s3-request-presigner` to generate a GET presigned URL with 15-minute TTL?
2. Is `@aws-sdk/s3-request-presigner` already installed in this codebase?
3. What does `get-jobs-output.ts` currently do, and what must it become?
4. How does the `GeneratePage.tsx` currently trigger the download, and what changes are needed for a presigned URL flow?
5. What is the safest browser-side download trigger for a cross-origin S3 presigned URL?

## Current State (Codebase)

### `packages/api/package.json` — dependencies [S1]

`@aws-sdk/client-s3: ^3.0.0` is installed. `@aws-sdk/s3-request-presigner` is **NOT** listed. It must be added.

### `packages/api/src/handlers/get-jobs-output.ts` — current implementation [S2]

```ts
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

**Problems**: Returns plain-text body (the narrative). Does not access S3. Does not generate a presigned URL. The `outputS3Key` column does not exist yet on `Job` (added by TASK-048). Once TASK-048 runs, `job.outputS3Key` will be available.

### `packages/web/src/lib/api.ts` — `downloadOutput` [S3]

```ts
export async function downloadOutput(jobId: string): Promise<Blob | null> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
  if (res.status === 202) return null; // still processing
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
  return res.blob();
}
```

This polls for a `Blob` assuming the endpoint returns binary. It must be replaced to handle the new `{ url }` JSON response and trigger a download via the URL.

### `packages/web/src/pages/GeneratePage.tsx` — download flow [S4]

```tsx
async function handleDownload() {
  setIsDownloading(true);
  try {
    let blob: Blob | null = null;
    while (!blob) {
      blob = await downloadOutput(id!);
      if (!blob) await new Promise((r) => setTimeout(r, 2000));
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demand-letter-${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setIsDownloading(false);
  }
}
```

**Problems**: Polls for 202 (only needed pre-TASK-048). Uses `Blob` but the API now returns JSON. Filename has `.txt` extension — should be `.docx`.

The "Download Demand Letter" button is shown when `isDone === true`. After TASK-046, the `isDone` state is set when the SSE `event: complete` fires, so the button appearance is already correctly tied to SSE completion. No new state variable is needed — rename or update the existing `isDone` pathway.

### S3 upload pattern in other handlers [S5]

All handlers (`post-jobs-files.ts`, `post-jobs-templates-inject.ts`, `post-jobs-documents-ingest.ts`) use:
```ts
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;
```

The presigned URL handler should follow the same pattern, plus the presigner import.

## Key Findings

**Finding 1 — `@aws-sdk/s3-request-presigner` must be installed** [S1, S6]: The package is not in `packages/api/package.json`. It is a separate package from `@aws-sdk/client-s3` in AWS SDK v3's modular architecture. Install with `pnpm --filter @demand-letter/api add @aws-sdk/s3-request-presigner`.

**Finding 2 — getSignedUrl API** [S6]: The canonical usage is:
```ts
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 900 });
```
`expiresIn` is in seconds. 15 minutes = 900 seconds. Default if omitted is also 900 seconds, but explicit is clearer. The URL is valid as long as the signing credentials remain valid (for Lambda, the session token must not expire before `expiresIn`).

**Finding 3 — `ResponseContentDisposition` for forced download** [S6]: Pass `ResponseContentDisposition: 'attachment; filename="demand-letter.docx"'` inside `GetObjectCommand` params to force browser download rather than inline display — useful since DOCX files may otherwise open in browser plugins.

**Finding 4 — browser download from presigned URL** [S7, S8]: The safest pattern for same-origin and cross-origin presigned URLs is:
```ts
const a = document.createElement('a');
a.href = presignedUrl;           // direct S3 URL, not a blob URL
a.download = 'demand-letter.docx';
a.click();
```
`URL.createObjectURL` is **not** needed and should NOT be used for presigned URLs — it wraps a Blob fetched from the URL, doubling bandwidth and adding memory pressure. Simply set `href` to the presigned URL directly. For cross-origin S3 URLs, the `download` attribute is often ignored by browsers (security restriction), but the `ResponseContentDisposition: attachment` header set in Finding 3 covers this case server-side.

**Finding 5 — SSE `event: complete` → show button** [S4, S9]: `GeneratePage.tsx` already sets `isDone = true` when `generateJob` resolves. TASK-046 updates `generateJob` to return early (via `reader.cancel()`) when `event: complete` is received. So the "Download DOCX" button should appear when `isDone === true`, which is already wired. No additional state variable needed — update the existing `handleDownload` and button label.

**Finding 6 — no polling needed post-TASK-048** [S2, S4]: The current 202-based polling loop exists because the old output endpoint might return 202 while processing. After TASK-048, the SSE stream itself signals completion, and `isDone` is only set to `true` after the stream completes. The output endpoint will always return `{ url }` with 200 when `isDone === true` (the job status is `'complete'`). The polling loop in `handleDownload` can be removed.

## Constraints

1. `@aws-sdk/s3-request-presigner` must be added as a prod dependency to `packages/api`.
2. The handler must check `job.outputS3Key` exists (only present after TASK-048 migration); return 404 if null.
3. The frontend `downloadOutput` function signature change must remain compatible with `GeneratePage.tsx`.
4. The presigned URL response shape must be `{ url: string }` — JSON, not binary.
5. The `get-jobs-output.ts` handler's 202 / 404 / 500 paths remain; only the success (200) path changes.

## Solution Comparison

| Criteria | Option A: Presigned URL (redirect) | Option B: Proxy binary through Lambda |
|----------|------------------------------------|---------------------------------------|
| **Approach** | Lambda generates `{ url }` with S3 presigned URL; browser downloads directly from S3 | Lambda fetches DOCX buffer from S3, returns it as base64-encoded body |
| **Pros** | Minimal Lambda cost; no 6 MB Lambda payload limit concern; S3 CDN speed | Single origin; no CORS concern |
| **Cons** | Requires CORS on S3 bucket (or `ResponseContentDisposition` header); `download` attribute may not fire filename in all browsers | Lambda payload limit (~6 MB); doubles transfer cost; extra latency |
| **Complexity** | Low | Medium |
| **Dependencies** | `@aws-sdk/s3-request-presigner` (new) | None new |
| **Codebase fit** | Fits the "return JSON" pattern of all other handlers | Breaks handler pattern; no handler returns binary today |
| **Maintenance** | Standard AWS pattern | Non-standard |

**Option A is strongly recommended.** The presigned URL approach is the standard AWS pattern, avoids Lambda's 6 MB payload cap (DOCX files can exceed this), and is consistent with how S3 downloads are done in production.

## Recommendation

**Implement Option A — presigned URL.**

### Backend: `get-jobs-output.ts`

```ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@demand-letter/db';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.DOCUMENTS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };
  if (job.status === 'pending' || job.status === 'processing') {
    return { statusCode: 202, body: JSON.stringify({ status: job.status }) };
  }
  if (job.status === 'failed') {
    return { statusCode: 500, body: JSON.stringify({ error: 'Generation failed' }) };
  }
  if (!job.outputS3Key) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Output not yet available' }) };
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: job.outputS3Key,
      ResponseContentDisposition: `attachment; filename="demand-letter-${jobId}.docx"`,
    }),
    { expiresIn: 900 }, // 15 minutes
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  };
};
```

### Frontend: `downloadOutput` in `api.ts`

```ts
export async function downloadOutput(jobId: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
  if (res.status === 202) return null;
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/output failed: ${res.status}`);
  const { url } = await res.json() as { url: string };
  return url;
}
```

### Frontend: `handleDownload` in `GeneratePage.tsx`

```ts
async function handleDownload() {
  setIsDownloading(true);
  try {
    const url = await downloadOutput(id!);
    if (!url) return; // shouldn't happen if isDone is true
    const a = document.createElement('a');
    a.href = url;
    a.download = `demand-letter-${id}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    setIsDownloading(false);
  }
}
```

### Risks and mitigations

- **Risk**: S3 CORS blocks the browser request to the presigned URL. Mitigation: `ResponseContentDisposition: attachment` is set in the presigned command, which forces download even if the browser treats the URL as cross-origin. If CORS is still needed, add `AllowedOrigins: ["*"]` to the S3 bucket CORS config (dev) or the specific frontend domain (prod).
- **Risk**: `job.outputS3Key` is `null` when the user clicks "Download" before TASK-048 runs (schema migration). Mitigation: the handler returns 404; `downloadOutput` throws; `handleDownload` catches and sets `error` state.
- **Risk**: Presigned URL expires during a slow download. Mitigation: 15 minutes (900 s) is adequate for any normal DOCX. The URL is generated fresh on every click.
- **Risk**: `download` attribute ignored for cross-origin S3 URL in some browsers. Mitigation: `ResponseContentDisposition: attachment` header overrides this at the S3 level.

## Next Steps

1. Install dependency: `pnpm --filter @demand-letter/api add @aws-sdk/s3-request-presigner`
2. Rewrite `packages/api/src/handlers/get-jobs-output.ts` using the pattern above (depends on TASK-048 for `outputS3Key` column)
3. Update `packages/web/src/lib/api.ts` — rewrite `downloadOutput` to return `string | null` (presigned URL)
4. Update `packages/web/src/pages/GeneratePage.tsx` — rewrite `handleDownload`, update button label/appearance, show "Download DOCX" button on `isDone === true`
5. Typecheck: `pnpm typecheck`

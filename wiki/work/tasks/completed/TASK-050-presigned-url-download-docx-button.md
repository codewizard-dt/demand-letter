---
id: TASK-050
title: "GET /jobs/:id/output presigned URL endpoint and Download DOCX button"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-048]
blocks: []
parallel_safe_with: [TASK-046, TASK-047, TASK-049]
uat: "[[UAT-050]]"
tags: [api, s3, presigned-url, frontend, download, docx]
---

# TASK-050 — GET /jobs/:id/output presigned URL endpoint and Download DOCX button

## Objective

Implement the final download step of the generation pipeline: rewrite `packages/api/src/handlers/get-jobs-output.ts` to generate a 15-minute pre-signed S3 URL for the rendered DOCX stored at `jobs.outputS3Key`, returning `{ url: string }` JSON. On the frontend, update `downloadOutput` in `packages/web/src/lib/api.ts` to return that URL string, and update `GeneratePage.tsx` to trigger a browser file download via an anchor click when the SSE stream emits `event: complete`. Also wire `DOCUMENTS_BUCKET` into the SAM template env block for the output handler function.

## Approach

- Use `@aws-sdk/s3-request-presigner` (`getSignedUrl`) with `GetObjectCommand` and `expiresIn: 900` (15 minutes). This package is already a dependency of `@aws-sdk/client-s3` and does not need a separate `package.json` addition — but we must import it explicitly.
- The handler reads `jobs.outputS3Key` via Prisma, returns 404 if not yet set (job not complete), and 200 with `{ url }` once available.
- The frontend `downloadOutput` function currently issues a `fetch` and probably tries to stream bytes; replace it to simply return the presigned URL string and let the caller trigger the download via a hidden `<a href=url download>` click pattern.
- In `GeneratePage.tsx`, after the SSE stream closes with `event: complete`, call `downloadOutput(jobId)`, create a temporary `<a>` element, set its `href` to the returned URL, click it, then remove it — a pattern that works cross-browser without leaving a memory leak.
- `DOCUMENTS_BUCKET` must be added to the `Environment.Variables` block of the `GetJobsOutputFunction` (or equivalent) in `template.yaml` so the Lambda can reference it at runtime.

## Steps

### 1. Install `@aws-sdk/s3-request-presigner` in the API package  <!-- agent: general-purpose -->

- [x] Check whether `@aws-sdk/s3-request-presigner` is already listed in `packages/api/package.json`:
  - Use Serena `find_symbol` or `get_symbols_overview` to inspect `packages/api/package.json` (or `search_for_pattern` for `s3-request-presigner`).
- [x] If absent, add it. Run from repo root:
  ```bash
  pnpm --filter @demand-letter/api add @aws-sdk/s3-request-presigner
  ```
  Confirm it appears in `packages/api/package.json` under `dependencies`.

### 2. Rewrite `get-jobs-output.ts` — presigned URL generation  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/handlers/get-jobs-output.ts` via Serena `get_symbols_overview`.
- [x] Replace the entire file body with the following implementation using Serena `replace_symbol_body` or `replace_content`:

  ```ts
  import { APIGatewayProxyHandler } from 'aws-lambda';
  import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  import { prisma } from '@demand-letter/db';

  const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  const BUCKET = process.env.DOCUMENTS_BUCKET!;

  export const handler: APIGatewayProxyHandler = async (event) => {
    const jobId = event.pathParameters?.id;
    if (!jobId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'missing_job_id' }),
      };
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'job_not_found' }),
      };
    }
    if (!job.outputS3Key) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'output_not_ready' }),
      };
    }

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: job.outputS3Key });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    };
  };
  ```

  Key details:
  - `expiresIn: 900` = 15-minute TTL.
  - Returns `404` with `error: 'output_not_ready'` when `outputS3Key` is null (job still processing).
  - Uses the same `s3` client + `BUCKET` constant pattern as other handlers in this package.

### 3. Add `DOCUMENTS_BUCKET` to SAM template for the output handler  <!-- agent: general-purpose -->

- [x] Locate `template.yaml` in the repo root (or `packages/api/template.yaml`) using Serena `find_file` with mask `template.yaml`.
- [x] Find the `GetJobsOutputFunction` (or the resource that maps to the `GET /jobs/{id}/output` route) using Serena `search_for_pattern` for `get-jobs-output` or `GetJobsOutput`.
- [x] In that function's `Properties.Environment.Variables` block, add:
  ```yaml
  DOCUMENTS_BUCKET: !Ref DocumentsBucket
  ```
  (Use the same `!Ref` token used by other functions that reference the S3 bucket — confirm the logical resource name by searching for `DocumentsBucket` or `Bucket` in the template.)
- [x] If the function shares a global `Environment` block (`Globals.Function.Environment.Variables`), add `DOCUMENTS_BUCKET` there instead to avoid duplication — but only if `DOCUMENTS_BUCKET` is not already present.

### 4. Update `downloadOutput` in `packages/web/src/lib/api.ts`  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/lib/api.ts` via Serena `get_symbols_overview`.
- [x] Locate the `downloadOutput` function (or equivalent). Use `find_symbol` with `name_path_pattern: downloadOutput` and `include_body: true`.
- [x] Replace its body so it fetches `GET /jobs/:id/output`, parses the `{ url }` JSON response, and returns the URL string:

  ```ts
  export async function downloadOutput(jobId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
    if (!res.ok) throw new Error(`downloadOutput failed: ${res.status}`);
    const { url } = await res.json() as { url: string };
    return url;
  }
  ```

  Adapt variable names (e.g. `API_BASE`) to match the existing convention in `api.ts`.

### 5. Wire the Download DOCX button into `GeneratePage.tsx`  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GeneratePage.tsx` (or equivalent path) via Serena `get_symbols_overview`.
- [x] Find where the SSE stream's `event: complete` is handled (look for `onmessage`, `EventSource`, or `event.type === 'complete'` — use `find_symbol` / `search_for_pattern`).
- [x] After the SSE `complete` event fires:
  1. Call `downloadOutput(jobId)` to get the presigned URL.
  2. Trigger a browser download:
     ```ts
     const url = await downloadOutput(jobId);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'demand-letter.docx';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     ```
  3. Optionally update a local state flag (e.g. `setDownloadReady(true)`) to render a visible "Download DOCX" button so the user can re-download without re-generating.
- [x] If a "Download DOCX" button already exists in the JSX but is hidden or disabled, enable it on `event: complete` by toggling the state flag instead of (or in addition to) the auto-click.

### 6. Typecheck  <!-- agent: general-purpose -->

- [x] Run from repo root:
  ```bash
  pnpm typecheck
  ```
- [x] Fix any type errors. Watch for:
  - `job.outputS3Key` only resolves after TASK-048's Prisma migration regenerates the client — confirm Step 1 of TASK-048 is complete before typechecking.
  - `getSignedUrl` return type is `Promise<string>` — no cast needed.
  - `downloadOutput` return type change from `Promise<void>` (or `Promise<Blob>`) to `Promise<string>` — update any callers that expected the old return type.

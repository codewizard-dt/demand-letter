---
topic: "S3 presigned URL generation using @aws-sdk/s3-request-presigner getSignedUrl with GetObjectCommand, 15-minute TTL pattern in Lambda handlers; also EventSource vs fetch SSE complete event handling, browser download via anchor tag with presigned URL in React"
slug: s3-presigned-url-download
researched: 2026-06-25
---

# Primary Sources — S3 Presigned URL Download

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/api/package.json` | 2026-06-25 | Confirmed `@aws-sdk/client-s3 ^3.0.0` is installed; `@aws-sdk/s3-request-presigner` is absent |
| S2 | codebase | `packages/api/src/handlers/get-jobs-output.ts::handler` | 2026-06-25 | Current handler returns plain-text body, no S3 presigned URL logic |
| S3 | codebase | `packages/web/src/lib/api.ts::downloadOutput` | 2026-06-25 | Current function returns `Promise<Blob | null>` by polling for binary; needs rewrite for `{ url }` JSON |
| S4 | codebase | `packages/web/src/pages/GeneratePage.tsx::GeneratePage` | 2026-06-25 | `isDone` state controls "Download" button visibility; `handleDownload` uses `createObjectURL` + polling; `.download = demand-letter-${id}.txt` |
| S5 | codebase | `packages/api/src/handlers/post-jobs-files.ts`, `post-jobs-templates-inject.ts`, `post-jobs-documents-ingest.ts` | 2026-06-25 | Established `S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })` + `BUCKET = process.env.DOCUMENTS_BUCKET!` pattern used across all handlers |
| S6 | context7 | `/aws/aws-sdk-js-v3` — "s3-request-presigner getSignedUrl GetObjectCommand presigned URL expiresIn TTL Lambda handler TypeScript" | 2026-06-25 | Canonical API: `getSignedUrl(client, new GetObjectCommand(params), { expiresIn: 3600 })`; default TTL is 900 s; `ResponseContentDisposition` can be set in command params |
| S7 | web | https://stackoverflow.com/questions/79190560/download-file-from-aws-s3-presigned-url-in-react | 2026-06-25 | Pattern for triggering download via anchor element with `link.href = presignedUrl` + `document.body.appendChild(link); link.click(); document.body.removeChild(link)` |
| S8 | web | https://stackoverflow.com/questions/50151062/unable-to-download-a-file-from-s3-by-the-url-in-a-browser | 2026-06-25 | Direct anchor href to presigned URL; `download` attribute + `Content-Disposition: attachment` for cross-origin S3 |
| S9 | codebase | `packages/web/src/pages/GeneratePage.tsx::GeneratePage` (handleGenerate) | 2026-06-25 | `setIsDone(true)` is called when `generateJob` resolves; this is the signal for the "Download" button to appear |

## Excerpts

### S6 — AWS SDK JS v3 Context7 — getSignedUrl

> ```javascript
> import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
> import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
> const client = new S3Client(clientParams);
> const command = new GetObjectCommand(getObjectParams);
> const url = await getSignedUrl(client, command, { expiresIn: 3600 });
> ```
> The `expiresIn` configuration parameter is optional; if not specified, the URL will default to expiring in `900` seconds.

### S7 — Stack Overflow: Download file from AWS S3 presigned url in React

> ```js
> downloadFile(payload).then((res) => {
>   const url = URL.createObjectURL(new Blob([res.url]));
>   const link = document.createElement('a');
>   link.href = url;
>   link.setAttribute('download', res.fileName);
>   document.body.appendChild(link);
>   link.click();
>   document.body.removeChild(link);
> });
> ```
> Note: this example wraps the URL in a Blob, which is unnecessary for presigned S3 URLs (use `link.href = presignedUrl` directly).

### S8 — Stack Overflow: Unable to download a file from S3 by the URL in a browser

> ```js
> var element = document.createElement('a');
> element.setAttribute('href', 'https://s3-us-east-1.amazonaws.com/XXX/XXX/XXX?Signature=XXX&Expires=XXX&AWSAccessKeyId=XXX');
> element.setAttribute('download', 'filename.txt');
> document.body.appendChild(element);
> element.click();
> ```
> The `download` attribute specifies the filename; for cross-origin S3 URLs, the server-side `Content-Disposition: attachment` header is the reliable approach.

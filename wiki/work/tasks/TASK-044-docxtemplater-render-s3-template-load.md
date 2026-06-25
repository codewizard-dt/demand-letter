---
id: TASK-044
title: "docxtemplater render: load tagged template DOCX from S3 and render with data object"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-036, TASK-038, TASK-039, TASK-040, TASK-041, TASK-042]
blocks: []
parallel_safe_with: []
uat: ""
tags: [generation, docxtemplater, s3, render]
---

# TASK-044 — docxtemplater Render: Load Tagged Template from S3

## Objective

Create `packages/api/src/lib/docx-renderer.ts` with a `renderTemplate(jobId, data)` function that: (1) fetches the tagged template DOCX from S3 using `templates.s3KeyTagged`, (2) uses `docxtemplater` + `pizzip` to render all `{tag}` placeholders with the values from the data object, (3) resolves loop sections (`{#specials}…{/specials}`) from the array in the data object, (4) sets a strict `nullGetter` that throws on any unexpected missing tag, (5) catches and re-formats docxtemplater structured errors, and (6) returns the rendered DOCX buffer ready for upload to S3.

## Approach

Use `docxtemplater` (version 3.x) with `pizzip` for OOXML zip manipulation. The render is synchronous after the S3 fetch. The `nullGetter` option is set to throw a `TemplateRenderError` for any tag not found in the data object — this enforces fail-closed behavior per the roadmap spec. Docxtemplater structured errors (`unopened_tag`, `unclosed_tag`, `multi_error`) are caught and returned as a structured `TemplateRenderError` object (not re-thrown as-is) so the Lambda handler can return a `500` with a usable error payload.

## Steps

### 1. Install docxtemplater and pizzip  <!-- agent: general-purpose -->

- [ ] Run `pnpm --filter @demand-letter/api add docxtemplater pizzip`.
- [ ] Add `@types/pizzip` if available, otherwise use `// @ts-ignore` for the PizZip import.

### 2. Create `packages/api/src/lib/docx-renderer.ts`  <!-- agent: general-purpose -->

- [ ] Create the file:
  ```ts
  import Docxtemplater from 'docxtemplater';
  import PizZip from 'pizzip';
  import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
  import { prisma } from '@demand-letter/db';

  const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  const BUCKET = process.env.DOCUMENTS_BUCKET!;

  export class TemplateRenderError extends Error {
    constructor(public readonly errors: unknown[]) {
      super('docxtemplater render failed');
    }
  }

  export async function renderTemplate(
    jobId: string,
    data: Record<string, string | Array<Record<string, string>>>,
  ): Promise<Buffer> { ... }
  ```
- [ ] Inside `renderTemplate`:
  - Fetch the template record:
    ```ts
    const template = await prisma.template.findFirst({
      where: { jobId },
      orderBy: { ingestedAt: 'desc' },
      select: { s3KeyTagged: true },
    });
    if (!template?.s3KeyTagged) throw new Error(`No tagged template for job ${jobId}`);
    ```
  - Fetch the DOCX from S3:
    ```ts
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: template.s3KeyTagged }));
    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes) throw new Error('Empty S3 response for template');
    ```
  - Load with PizZip and Docxtemplater:
    ```ts
    const zip = new PizZip(bytes);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: ({ part }) => {
        throw new TemplateRenderError([`Unexpected missing tag: {${part.value}}`]);
      },
    });
    ```
  - Render:
    ```ts
    try {
      doc.render(data);
    } catch (err: any) {
      if (err.properties?.errors) {
        throw new TemplateRenderError(err.properties.errors);
      }
      throw err;
    }
    ```
  - Return output buffer:
    ```ts
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    ```

### 3. Re-export from `packages/api/src/lib/index.ts`  <!-- agent: general-purpose -->

- [ ] Add: `export { renderTemplate, TemplateRenderError } from './docx-renderer';`

### 4. Typecheck  <!-- agent: general-purpose -->

- [ ] Run `pnpm typecheck` from the repo root.
- [ ] Fix any type errors (especially around PizZip types) before marking done.

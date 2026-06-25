---
id: TASK-014
title: "POST /jobs/:id/files Endpoint — Upload Template and Case Docs"
status: done
created: 2026-06-23
updated: 2026-06-23
completed: 2026-06-23
depends_on: [TASK-013]
blocks: []
parallel_safe_with: []
uat: "[[UAT-014]]"
tags: [api, backend, jobs, s3, files, phase-3]
---

# TASK-014 — POST /jobs/:id/files Endpoint — Upload Template and Case Docs

## Objective

Implement `POST /jobs/:id/files` — a Lambda endpoint that accepts a multipart upload of one DOCX template and one or more PDF case documents, streams each file to the S3 source-documents bucket (TASK-004), and inserts a row into the `files` table in PostgreSQL for each uploaded file. File type validation rejects anything that is not `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX) or `application/pdf`. Returns the list of created file records.

## Approach

Use the `@aws-sdk/client-s3` `PutObjectCommand` to upload each file. Parse the multipart body using the `lambda-multipart-parser` (or `busboy`) library — API Gateway base64-encodes binary payloads, so enable `binaryMediaTypes` in the SAM template. Store each file under `{jobId}/{fileId}-{originalName}` in S3. Insert a `File` Prisma model row linking the file to the job with its S3 key, MIME type, and role (`template` | `case_doc`).

## Steps

### 1. Add `File` model to `schema.prisma`  <!-- agent: general-purpose -->

- [x] Check if `File` model already exists (from TASK-002); if so, verify it has the expected fields and skip creation <!-- Completed: 2026-06-23 -->
- [x] If absent, append to `packages/db/prisma/schema.prisma`: <!-- Completed: 2026-06-23 — model existed but was updated with FileRole enum, mimeType, role, fileName fields -->

```prisma
enum FileRole {
  template
  case_doc
}

model File {
  id        String   @id @default(cuid())
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id])
  s3Key     String
  mimeType  String
  role      FileRole
  fileName  String
  createdAt DateTime @default(now())

  @@index([jobId])
}
```

- [x] Add `files File[]` relation to the `Job` model <!-- Completed: 2026-06-23 — already present -->
- [x] Run: <!-- Completed: 2026-06-23 — generate succeeded; migrate dev deferred (no DB in env) -->
  ```
  pnpm --filter @demand-letter/db prisma migrate dev --name add-file
  pnpm --filter @demand-letter/db prisma generate
  ```

### 2. Install multipart parser  <!-- agent: general-purpose -->

- [x] Add the parser to the API package: <!-- Completed: 2026-06-23 -->
  ```
  pnpm --filter @demand-letter/api add lambda-multipart-parser
  pnpm --filter @demand-letter/api add -D @types/busboy
  ```
  - Prefer `lambda-multipart-parser` (simpler API for Lambda binary payloads)

### 3. Create `packages/api/src/handlers/post-jobs-files.ts`  <!-- agent: general-purpose -->

- [x] Create the handler: <!-- Completed: 2026-06-23 -->

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '@demand-letter/db';
import parser from 'lambda-multipart-parser';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const BUCKET = process.env.SOURCE_DOCS_BUCKET!;

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
]);

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing job id' }) };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { statusCode: 404, body: JSON.stringify({ error: 'Job not found' }) };

  const result = await parser.parse(event);
  const files = result.files;

  if (!files?.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No files uploaded' }) };
  }

  const created = [];
  for (const file of files) {
    const mime = file.contentType;
    if (!ALLOWED_MIME.has(mime)) {
      return {
        statusCode: 415,
        body: JSON.stringify({ error: `Unsupported file type: ${mime}` }),
      };
    }
    const role = mime.includes('wordprocessingml') ? 'template' : 'case_doc';
    const fileId = crypto.randomUUID();
    const s3Key = `${jobId}/${fileId}-${file.filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: file.content,
        ContentType: mime,
      }),
    );

    const record = await prisma.file.create({
      data: { jobId, s3Key, mimeType: mime, role, fileName: file.filename },
    });
    created.push(record);
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: created }),
  };
};
```

### 4. Register in SAM template  <!-- agent: general-purpose -->

- [x] Add to `template.yaml`: <!-- Completed: 2026-06-23 -->

```yaml
PostJobsFilesFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/post-jobs-files.handler
    Events:
      Api:
        Type: Api
        Properties:
          Path: /jobs/{id}/files
          Method: post
    Layers:
      - !Ref DbLayer
    Environment:
      Variables:
        DATABASE_URL: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'
        SOURCE_DOCS_BUCKET: !Ref SourceDocsBucket
```

- [x] Ensure `BinaryMediaTypes` is set on the API resource: <!-- Completed: 2026-06-23 -->
  ```yaml
  Globals:
    Api:
      BinaryMediaTypes:
        - multipart/form-data
  ```

### 5. TypeScript and smoke test  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-23 — all 3 packages pass -->
- [x] [DEFERRED-TO-UAT] Smoke test: <!-- Completed: 2026-06-23 — runtime test deferred to UAT phase -->
  ```bash
  curl -X POST http://localhost:3000/jobs/<id>/files \
    -F "files=@sample-template.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
    -F "files=@case-doc.pdf;type=application/pdf"
  ```
  Must return HTTP 201 with `{ files: [...] }`

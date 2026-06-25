---
id: TASK-016
title: "GET /jobs/:id/output Endpoint — Return Generation Output"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-015]
blocks: []
parallel_safe_with: []
uat: "[[UAT-016]]"
tags: [api, backend, jobs, output, phase-3]
---

# TASK-016 — GET /jobs/:id/output Endpoint — Return Generation Output

## Objective

Implement `GET /jobs/:id/output` — a Lambda endpoint that reads the generation output stored on the `Job` record and returns it as plain text. At this skeleton stage, no DOCX conversion is required — returning the raw text string is acceptable. The frontend download button calls this endpoint to get the generated content.

## Approach

Look up the Job by ID, return 404 if not found, 202 if status is still `processing` (not ready yet), and 200 with `Content-Type: text/plain` and the `output` field if `status === 'done'`. Register in the SAM template as a GET on `/jobs/{id}/output`.

## Steps

### 1. Create `packages/api/src/handlers/get-jobs-output.ts`  <!-- agent: general-purpose -->

- [x] Create the handler: <!-- Completed: 2026-06-24 -->

```typescript
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

### 2. Register in SAM template  <!-- agent: general-purpose -->

- [x] Add to `template.yaml`: <!-- Completed: 2026-06-24 -->

```yaml
GetJobsOutputFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/get-jobs-output.handler
    Events:
      Api:
        Type: Api
        Properties:
          Path: /jobs/{id}/output
          Method: get
    Layers:
      - !Ref DbLayer
    Environment:
      Variables:
        DATABASE_URL: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'
```

  - Mirror `CodeUri`, `Runtime`, `MemorySize`, `Timeout` from an existing function resource

### 3. TypeScript compilation check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-24 -->
- [x] Confirm `job.output` is typed as `string | null` on the Job model (added in TASK-015); if not, verify TASK-015's schema migration ran <!-- Completed: 2026-06-24 — confirmed String? in schema.prisma line 12 -->

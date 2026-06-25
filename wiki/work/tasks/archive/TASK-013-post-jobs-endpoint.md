---
id: TASK-013
title: "POST /jobs Endpoint — Create Generation Job"
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: [TASK-008]
blocks: []
parallel_safe_with: [TASK-009, TASK-011]
uat: "[[UAT-013]]"
tags: [api, backend, jobs, phase-3]
---

# TASK-013 — POST /jobs Endpoint — Create Generation Job

## Objective

Implement `POST /jobs` — a Lambda-backed endpoint that creates a new generation job record in PostgreSQL and returns the job `id`. This is the entry point for the generation workflow: the client calls this first to obtain a job ID, then uploads files to `POST /jobs/:id/files`, and finally triggers generation via `POST /jobs/:id/generate`. At this skeleton stage, the job record needs only an `id`, `status` (default `"pending"`), and timestamps.

## Approach

Add a `Job` Prisma model to the shared schema (if not already present from TASK-002's schema bootstrap — check first). Create a Lambda handler at `packages/api/src/handlers/post-jobs.ts` that calls `prisma.job.create()` and returns `{ id }` with a 201 status. Register the function in `template.yaml` under `POST /jobs`. The handler needs no request body at this stage — job metadata (template, case files) comes in the next endpoint.

## Steps

### 1. Check the existing Prisma schema for a `Job` model  <!-- agent: Explore -->

- [x] Use `mcp__serena__find_file` to locate `schema.prisma` under `packages/db/` <!-- Completed: 2026-06-23 -->
- [x] Read the schema — if a `Job` model already exists (from TASK-002), note its fields and skip to Step 3 <!-- Completed: 2026-06-23 — Job model exists with id, status (String), createdAt, updatedAt, files[] — skipping Step 2 -->
- [x] If absent, proceed to Step 2 <!-- N/A — Job model already exists -->

### 2. Add `Job` model to `schema.prisma`  <!-- agent: general-purpose -->

- [ ] Append the model (use `Edit`):

```prisma
enum JobStatus {
  pending
  processing
  done
  failed
}

model Job {
  id        String    @id @default(cuid())
  status    JobStatus @default(pending)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

- [ ] Run migration:
  ```
  pnpm --filter @demand-letter/db prisma migrate dev --name add-job
  ```
- [ ] Run `pnpm --filter @demand-letter/db prisma generate`

### 3. Create `packages/api/src/handlers/post-jobs.ts`  <!-- agent: general-purpose -->

- [x] Create the handler: <!-- Completed: 2026-06-23 -->

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async () => {
  const job = await prisma.job.create({ data: {} });
  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: job.id }),
  };
};
```

### 4. Register in SAM template  <!-- agent: general-purpose -->

- [x] Open `template.yaml` and add: <!-- Completed: 2026-06-23 -->

```yaml
PostJobsFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/post-jobs.handler
    Events:
      Api:
        Type: Api
        Properties:
          Path: /jobs
          Method: post
    Layers:
      - !Ref DbLayer
    Environment:
      Variables:
        DATABASE_URL: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'
```

  - [x] Mirror `CodeUri`, `Runtime`, `MemorySize`, `Timeout` from another function resource <!-- Completed: 2026-06-23 — mirrored from GetAdminLlmCostsFunction -->

### 5. TypeScript and local smoke test  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-23 — all 3 packages pass -->
- [DEFERRED-TO-UAT] `curl -X POST http://localhost:3000/jobs` — must return `{"id":"<cuid>"}` with HTTP 201

---
id: TASK-002
title: "PostgreSQL Schema Bootstrap — jobs and files tables"
status: done
created: 2026-06-23
updated: 2026-06-23 <!-- Updated: 2026-06-23 -->
depends_on: [TASK-001]
blocks: []
parallel_safe_with: [TASK-003, TASK-004, TASK-006, TASK-007]
uat: "[[UAT-002]]"
tags: [db, prisma, postgresql, schema]
---

# TASK-002 — PostgreSQL Schema Bootstrap — jobs and files tables

## Objective

Define the initial Prisma schema for the two Phase 1 tables: `jobs` (generation job lifecycle) and `files` (uploaded template + case documents). This schema is the data backbone for the end-to-end skeleton; subsequent roadmaps extend it with additional models.

## Approach

- Schema lives in `packages/db/prisma/schema.prisma` (stub created by TASK-001)
- Two models only: `Job` and `File` — no relations to unbuilt models
- `Job.status` is a plain string enum managed in application code (not a Prisma enum) to keep the migration simple and allow future status additions without a schema migration
- `File.type` stores the file role: `"template"` | `"case-doc"` | `"output"` — plain string for the same reason
- No seed file at this stage; migrations only
- Prisma Client is generated and re-exported from `packages/db/src/index.ts`

## Steps

### 1. Write the Prisma schema <!-- agent: general-purpose -->

- [x] Edit `packages/db/prisma/schema.prisma` to add the two models: <!-- Completed: 2026-06-23 -->

  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  model Job {
    id        String   @id @default(cuid())
    status    String   @default("pending")
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    files     File[]

    @@index([status])
    @@index([createdAt])
    @@map("jobs")
  }

  model File {
    id        String   @id @default(cuid())
    jobId     String
    job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
    s3Key     String
    type      String
    name      String
    createdAt DateTime @default(now())

    @@index([jobId])
    @@map("files")
  }
  ```

### 2. Create the initial migration <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/db db:generate` to generate the Prisma Client <!-- Completed: 2026-06-23 -->
- [x] Run `pnpm --filter @demand-letter/db exec prisma migrate dev --name init` to create the first migration file at `packages/db/prisma/migrations/` <!-- Completed: 2026-06-23 — no live DB; used prisma migrate diff to generate SQL manually -->
  - Note: this requires `DATABASE_URL` to be set; source `.env` first (`source .env && pnpm ...`) or set it inline
  - If no live DB is available (TASK-003 not yet done), run `prisma migrate diff --from-empty --to-schema-datamodel packages/db/prisma/schema.prisma --script > packages/db/prisma/migrations/0001_init.sql` to generate the SQL file without a live DB, then create a manual migration directory structure
- [x] Verify `packages/db/prisma/migrations/` exists with at least one `.sql` file <!-- Completed: 2026-06-23 -->

### 3. Export types from the db package <!-- agent: general-purpose -->

- [x] Edit `packages/db/src/index.ts` to ensure Prisma Client singleton export: <!-- Completed: 2026-06-23 -->

  ```ts
  import { PrismaClient } from '@prisma/client';

  declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
  }

  export const prisma = globalThis.__prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
  }

  export type { Prisma } from '@prisma/client';
  export { PrismaClient } from '@prisma/client';
  ```

### 4. Verify typecheck <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/db typecheck` and confirm it passes with no errors <!-- Completed: 2026-06-23 -->

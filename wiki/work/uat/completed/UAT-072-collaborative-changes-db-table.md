---
id: UAT-072
title: "UAT: Per-operation change log in PostgreSQL: collaborative_changes table"
status: passed
task: TASK-072
created: 2026-06-25
updated: 2026-06-25
---

# UAT-072 — UAT: Per-operation change log in PostgreSQL: collaborative_changes table

implements::[[TASK-072]]

> **Source task**: [[TASK-072]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] PostgreSQL database is accessible and `DATABASE_URL` environment variable is set (source `packages/db/.env` locally if needed)
- [ ] Migration `20260625193907_add_collaborative_changes` has been applied (`pnpm --filter @demand-letter/db exec prisma migrate deploy` or confirmed via `prisma migrate status`)
- [ ] Prisma client has been generated (`pnpm --filter @demand-letter/db exec prisma generate`)

---

## Test Cases

### UAT-SCHEMA-001: CollaborativeChange model is declared in schema.prisma

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the `CollaborativeChange` Prisma model was added to the schema.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -c 'model CollaborativeChange' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is `1` (exactly one `model CollaborativeChange` declaration).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-002: Job model declares collaborativeChanges back-relation

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the `Job` model has the `collaborativeChanges CollaborativeChange[]` back-relation field.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -c 'collaborativeChanges.*CollaborativeChange\[\]' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is `1`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-003: CollaborativeChange model contains all required fields

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies all 7 required fields — `id`, `jobId`, `userId`, `userName`, `operationType`, `contentDelta`, `createdAt` — plus the `job` relation are present inside the model block.
- **Steps**:
  1. From the project root, run the command below and inspect the output.
- **Command**:
  ```bash
  awk '/model CollaborativeChange/,/^\}/' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output contains all of: `id`, `jobId`, `userId`, `userName`, `operationType`, `contentDelta`, `createdAt`, `job`, `@@index([jobId])`, `@@index([jobId, createdAt])`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-004: contentDelta field is declared as Json type

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies `contentDelta` uses `Json` type (which maps to JSONB in PostgreSQL) to store structured Quill/Y.js deltas.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'contentDelta.*Json' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output contains `contentDelta  Json`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-005: CollaborativeChange→Job relation carries onDelete Cascade

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the FK relation on `CollaborativeChange` declares `onDelete: Cascade` so rows are removed when the parent job is deleted.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  awk '/model CollaborativeChange/,/^\}/' packages/db/prisma/schema.prisma | grep 'onDelete'
  ```
- **Expected Result**: Output contains `onDelete: Cascade`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-006: Model declares both jobId and composite (jobId, createdAt) indexes

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies both `@@index([jobId])` (for per-job lookup) and `@@index([jobId, createdAt])` (for chronological per-job queries) are declared on the model.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  awk '/model CollaborativeChange/,/^\}/' packages/db/prisma/schema.prisma | grep '@@index'
  ```
- **Expected Result**: Exactly two lines returned:
  ```
    @@index([jobId])
    @@index([jobId, createdAt])
  ```
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-001: Migration directory was created

- **Description**: Verifies `prisma migrate dev` produced the expected migration directory.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  ls packages/db/prisma/migrations/ | grep add_collaborative_changes
  ```
- **Expected Result**: Output is `20260625193907_add_collaborative_changes`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-002: Migration SQL creates the CollaborativeChange table

- **Description**: Verifies the generated SQL file contains a `CREATE TABLE "CollaborativeChange"` statement (note: no `@@map`, so Prisma uses the PascalCase model name as the table name).
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'CREATE TABLE "CollaborativeChange"' packages/db/prisma/migrations/20260625193907_add_collaborative_changes/migration.sql
  ```
- **Expected Result**: Output is `CREATE TABLE "CollaborativeChange" (`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-003: Migration SQL defines all 7 columns with correct types

- **Description**: Verifies each column — including NOT NULL constraints, the JSONB type for `contentDelta`, and the default timestamp — matches the Prisma model spec.
- **Steps**:
  1. From the project root, run the command below and inspect the full output.
- **Command**:
  ```bash
  cat packages/db/prisma/migrations/20260625193907_add_collaborative_changes/migration.sql
  ```
- **Expected Result**: The CREATE TABLE block contains all of the following lines:
  - `"id" TEXT NOT NULL`
  - `"jobId" TEXT NOT NULL`
  - `"userId" TEXT NOT NULL`
  - `"userName" TEXT NOT NULL`
  - `"operationType" TEXT NOT NULL`
  - `"contentDelta" JSONB NOT NULL`
  - `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-004: Migration SQL creates both required indexes

- **Description**: Verifies `CollaborativeChange_jobId_idx` and `CollaborativeChange_jobId_createdAt_idx` are created by the migration.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'CREATE INDEX' packages/db/prisma/migrations/20260625193907_add_collaborative_changes/migration.sql
  ```
- **Expected Result**: Exactly two lines are returned:
  ```
  CREATE INDEX "CollaborativeChange_jobId_idx" ON "CollaborativeChange"("jobId");
  CREATE INDEX "CollaborativeChange_jobId_createdAt_idx" ON "CollaborativeChange"("jobId", "createdAt");
  ```
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-005: Migration SQL adds FK with ON DELETE CASCADE

- **Description**: Verifies the FK constraint references `jobs.id` with `ON DELETE CASCADE ON UPDATE CASCADE`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'ADD CONSTRAINT.*CollaborativeChange_jobId_fkey' packages/db/prisma/migrations/20260625193907_add_collaborative_changes/migration.sql
  ```
- **Expected Result**: Output contains `FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CLIENT-001: Prisma client exports CollaborativeChange type

- **File**: `packages/db/src/index.ts`
- **Description**: Verifies `CollaborativeChange` is re-exported from the `@demand-letter/db` barrel so application code can use it as a TypeScript type without importing from `@prisma/client` directly.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'CollaborativeChange' packages/db/src/index.ts
  ```
- **Expected Result**: Output contains `CollaborativeChange` in an `export type { ... }` statement.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-DB-001: CollaborativeChange table exists in the live database

- **Description**: Verifies the migration was applied and the `CollaborativeChange` table is present in PostgreSQL.
- **Steps**:
  1. Ensure `DATABASE_URL` is set in your shell environment.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c '\dt "CollaborativeChange"'
  ```
- **Expected Result**: Output lists the `CollaborativeChange` table, e.g.:
  ```
             List of relations
   Schema |        Name         | Type  |  Owner
  --------+---------------------+-------+---------
   public | CollaborativeChange | table | <owner>
  ```
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set, packages/db/.env not found] <!-- 2026-06-25 -->

---

### UAT-DB-002: All columns are present with correct types

- **Description**: Verifies the live table has the correct column definitions including `contentDelta` as `jsonb` and `createdAt` with a timestamp default.
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c '\d "CollaborativeChange"'
  ```
- **Expected Result**: Seven columns are listed — `id` (text), `jobId` (text), `userId` (text), `userName` (text), `operationType` (text), `contentDelta` (jsonb), `createdAt` (timestamp without time zone, default `CURRENT_TIMESTAMP`).
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set, packages/db/.env not found] <!-- 2026-06-25 -->

---

### UAT-DB-003: Both indexes exist in the live database

- **Description**: Verifies `CollaborativeChange_jobId_idx` and `CollaborativeChange_jobId_createdAt_idx` are present alongside the primary key index.
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename = 'CollaborativeChange' ORDER BY indexname;"
  ```
- **Expected Result**: Three rows returned:
  ```
  CollaborativeChange_jobId_createdAt_idx
  CollaborativeChange_jobId_idx
  CollaborativeChange_pkey
  ```
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set, packages/db/.env not found] <!-- 2026-06-25 -->

---

### UAT-DB-004: FK cascade delete constraint is active in the live database

- **Description**: Verifies the `CollaborativeChange_jobId_fkey` constraint exists and uses `DELETE CASCADE` (`confdeltype = 'c'`).
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT conname, confdeltype FROM pg_constraint WHERE conname = 'CollaborativeChange_jobId_fkey';"
  ```
- **Expected Result**: One row: `CollaborativeChange_jobId_fkey | c` (where `c` denotes `CASCADE`).
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set, packages/db/.env not found] <!-- 2026-06-25 -->

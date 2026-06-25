---
id: UAT-060
title: "UAT: refinements DB table — Prisma model + migration"
status: passed
task: TASK-060
created: 2026-06-25
updated: 2026-06-25
---

# UAT-060 — UAT: refinements DB table — Prisma model + migration

implements::[[TASK-060]]

> **Source task**: [[TASK-060]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] PostgreSQL database is accessible and `DATABASE_URL` environment variable is set (source `packages/db/.env` locally if needed)
- [ ] Migration `20260625164753_add_refinements_table` has been applied (`pnpm --filter @demand-letter/db exec prisma migrate deploy` or confirmed via `prisma migrate status`)
- [ ] Prisma client has been generated (`pnpm --filter @demand-letter/db exec prisma generate`)

---

## Test Cases

### UAT-SCHEMA-001: Refinement model is declared in schema.prisma

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the `Refinement` Prisma model was added to the schema.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -c 'model Refinement' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is `1` (exactly one `model Refinement` declaration).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-002: Job model declares refinements relation

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the `Job` model has the `refinements Refinement[]` back-relation field.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep -c 'refinements.*Refinement\[\]' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is `1`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-003: Refinement model contains all required fields

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the eight required fields — `id`, `jobId`, `job`, `instruction`, `scope`, `beforeText`, `afterText`, `accepted`, `createdAt` — are all present inside the model block.
- **Steps**:
  1. From the project root, run the command below and inspect the output.
- **Command**:
  ```bash
  awk '/model Refinement/,/^\}/' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output contains all of: `id`, `jobId`, `instruction`, `scope`, `beforeText`, `afterText`, `accepted`, `createdAt`, `@@index([jobId])`, `@@index([createdAt])`, `@@map("refinements")`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-004: scope field defaults to "all"

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the `scope` field carries `@default("all")` per the requirement that an absent scope targets the full document.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'scope.*@default' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output contains `scope        String   @default("all")`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-005: accepted field is Boolean defaulting to false

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies `accepted` is `Boolean @default(false)` so refinements start as pending attorney review and can be reverted.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'accepted.*@default' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output contains `accepted     Boolean  @default(false)`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-006: Refinement→Job relation carries onDelete Cascade

- **File**: `packages/db/prisma/schema.prisma`
- **Description**: Verifies the FK relation on `Refinement` declares `onDelete: Cascade` so rows are removed when the parent job is deleted.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  awk '/model Refinement/,/^\}/' packages/db/prisma/schema.prisma | grep 'onDelete'
  ```
- **Expected Result**: Output contains `onDelete: Cascade`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-001: Migration directory was created

- **Description**: Verifies `prisma migrate dev` produced the expected migration directory.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  ls packages/db/prisma/migrations/ | grep add_refinements_table
  ```
- **Expected Result**: Output is `20260625164753_add_refinements_table`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-002: Migration SQL creates the refinements table

- **Description**: Verifies the generated SQL file contains a `CREATE TABLE "refinements"` statement.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'CREATE TABLE "refinements"' packages/db/prisma/migrations/20260625164753_add_refinements_table/migration.sql
  ```
- **Expected Result**: Output is `CREATE TABLE "refinements" (`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-003: Migration SQL defines all eight columns with correct types and defaults

- **Description**: Verifies each column — including NOT NULL constraints and defaults — matches the Prisma model spec.
- **Steps**:
  1. From the project root, run the command below and inspect the full output.
- **Command**:
  ```bash
  cat packages/db/prisma/migrations/20260625164753_add_refinements_table/migration.sql
  ```
- **Expected Result**: The CREATE TABLE block contains all of the following lines:
  - `"id" TEXT NOT NULL`
  - `"jobId" TEXT NOT NULL`
  - `"instruction" TEXT NOT NULL`
  - `"scope" TEXT NOT NULL DEFAULT 'all'`
  - `"beforeText" TEXT NOT NULL`
  - `"afterText" TEXT NOT NULL`
  - `"accepted" BOOLEAN NOT NULL DEFAULT false`
  - `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-004: Migration SQL creates both required indexes

- **Description**: Verifies `refinements_jobId_idx` and `refinements_createdAt_idx` are created by the migration.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'CREATE INDEX' packages/db/prisma/migrations/20260625164753_add_refinements_table/migration.sql
  ```
- **Expected Result**: Exactly two lines are returned:
  ```
  CREATE INDEX "refinements_jobId_idx" ON "refinements"("jobId");
  CREATE INDEX "refinements_createdAt_idx" ON "refinements"("createdAt");
  ```
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-MIGRATION-005: Migration SQL adds FK with ON DELETE CASCADE

- **Description**: Verifies the FK constraint references `jobs.id` with `ON DELETE CASCADE ON UPDATE CASCADE`.
- **Steps**:
  1. From the project root, run the command below.
- **Command**:
  ```bash
  grep 'ADD CONSTRAINT.*refinements_jobId_fkey' packages/db/prisma/migrations/20260625164753_add_refinements_table/migration.sql
  ```
- **Expected Result**: Output contains `FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-DB-001: refinements table exists in the live database

- **Description**: Verifies the migration was applied and the `refinements` table is present in PostgreSQL.
- **Steps**:
  1. Ensure `DATABASE_URL` is set in your shell environment.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "\dt refinements"
  ```
- **Expected Result**: Output lists the `refinements` table, e.g.:
  ```
           List of relations
   Schema |    Name     | Type  |  Owner
  --------+-------------+-------+---------
   public | refinements | table | <owner>
  ```
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment and packages/db/.env not found] <!-- 2026-06-25 -->

---

### UAT-DB-002: All columns are present with correct types and defaults

- **Description**: Verifies the live table has the correct column definitions including `scope DEFAULT 'all'` and `accepted DEFAULT false`.
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "\d refinements"
  ```
- **Expected Result**: Eight columns are listed — `id` (text), `jobId` (text), `instruction` (text), `scope` (text, default `'all'`), `beforeText` (text), `afterText` (text), `accepted` (boolean, default `false`), `createdAt` (timestamp without time zone).
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment and packages/db/.env not found] <!-- 2026-06-25 -->

---

### UAT-DB-003: Both indexes exist in the live database

- **Description**: Verifies `refinements_jobId_idx` and `refinements_createdAt_idx` are present alongside the primary key index.
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename = 'refinements' ORDER BY indexname;"
  ```
- **Expected Result**: Three rows returned:
  ```
  refinements_createdAt_idx
  refinements_jobId_idx
  refinements_pkey
  ```
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment and packages/db/.env not found] <!-- 2026-06-25 -->

---

### UAT-DB-004: FK cascade delete constraint is active in the live database

- **Description**: Verifies the `refinements_jobId_fkey` constraint exists and uses `DELETE CASCADE` (`confdeltype = 'c'`).
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the command below.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT conname, confdeltype FROM pg_constraint WHERE conname = 'refinements_jobId_fkey';"
  ```
- **Expected Result**: One row: `refinements_jobId_fkey | c` (where `c` denotes `CASCADE`).
- [FAIL: auto-judge: prerequisite not satisfied — DATABASE_URL not set in environment and packages/db/.env not found] <!-- 2026-06-25 -->

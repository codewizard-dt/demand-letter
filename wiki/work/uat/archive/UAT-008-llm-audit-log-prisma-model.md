---
id: UAT-008
title: "UAT: LlmAuditLog Prisma Model"
status: passed
task: TASK-008
created: 2026-06-23
updated: 2026-06-23
---

# UAT-008 — UAT: LlmAuditLog Prisma Model

implements::[[TASK-008]]

> **Source task**: [[TASK-008]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] Working directory is the repo root (`/Users/davidtaylor/Repositories/gauntlet/demand-letter`)
- [ ] `pnpm install` has been run
- [ ] For UAT-INT-001 only: a PostgreSQL database is reachable and `DATABASE_URL` is set in `packages/db/.env`
- [ ] For UAT-INT-001 only: migration has been applied (`pnpm --filter @demand-letter/db prisma migrate deploy` or `prisma migrate dev`)

---

## Test Cases

### UAT-SCHEMA-001: LlmFeature enum present with all five values
- **Description**: Verifies the `LlmFeature` enum block exists in `schema.prisma` with all five snake_case values required by the task.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `enum LlmFeature` block.
  3. Confirm it contains exactly these five values, one per line: `zone_classification`, `case_extraction`, `medical_narrative`, `refinement`, `skeleton_generation`.
- **Command**:
  ```bash
  grep -A7 'enum LlmFeature' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output includes all five enum values (`zone_classification`, `case_extraction`, `medical_narrative`, `refinement`, `skeleton_generation`) with no extras and no hyphens in any value.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-SCHEMA-002: LlmAuditLog model fields match spec
- **Description**: Verifies every required field exists in the `LlmAuditLog` model with the correct Prisma types and decorators as specified in the task.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `model LlmAuditLog` block.
  3. Verify the following fields are present with these exact types:
     - `id String @id @default(cuid())`
     - `userId String`
     - `feature LlmFeature`
     - `model String`
     - `provider String`
     - `inputTokens Int`
     - `outputTokens Int`
     - `estimatedCostUsd Decimal @db.Decimal(10, 6)`
     - `durationMs Int`
     - `createdAt DateTime @default(now())`
- **Command**:
  ```bash
  grep -A20 'model LlmAuditLog' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: All ten fields are present with matching types. `estimatedCostUsd` uses `Decimal` (not `Float`) with `@db.Decimal(10, 6)`. `userId` has no `@relation` directive (intentionally orphan-safe).
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-SCHEMA-003: LlmAuditLog indexes match spec
- **Description**: Verifies the three required indexes are declared on the `LlmAuditLog` model.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. In the `model LlmAuditLog` block, locate the `@@index` directives.
  3. Confirm exactly three indexes: `@@index([userId])`, `@@index([feature, createdAt])`, `@@index([createdAt])`.
- **Command**:
  ```bash
  grep '@@index' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Three lines matching:
  ```
  @@index([userId])
  @@index([feature, createdAt])
  @@index([createdAt])
  ```
  (The pre-existing `Job` and `File` indexes may also appear; the three `LlmAuditLog` ones must be present.)
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-MIGRATION-001: Migration file exists for add-llm-audit-log
- **Description**: Verifies a migration directory named `*_add_llm_audit_log` was generated under `packages/db/prisma/migrations/`.
- **Steps**:
  1. List `packages/db/prisma/migrations/`.
  2. Confirm a directory matching `*_add_llm_audit_log` exists.
  3. Open `migration.sql` inside that directory.
- **Command**:
  ```bash
  ls packages/db/prisma/migrations/ | grep add_llm_audit_log
  ```
- **Expected Result**: Exactly one directory listed, e.g. `20260624041017_add_llm_audit_log`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-MIGRATION-002: Migration SQL creates enum and table with correct DDL
- **Description**: Verifies the migration SQL contains `CREATE TYPE "LlmFeature"`, `CREATE TABLE "LlmAuditLog"` with the `estimatedCostUsd DECIMAL(10,6)` column, and all three `CREATE INDEX` statements.
- **Steps**:
  1. Open the migration SQL file at `packages/db/prisma/migrations/20260624041017_add_llm_audit_log/migration.sql` (adjust timestamp prefix if different).
  2. Verify `CREATE TYPE "LlmFeature" AS ENUM` lists all five values.
  3. Verify `CREATE TABLE "LlmAuditLog"` column `"estimatedCostUsd" DECIMAL(10,6) NOT NULL`.
  4. Verify three `CREATE INDEX` statements: `LlmAuditLog_userId_idx`, `LlmAuditLog_feature_createdAt_idx`, `LlmAuditLog_createdAt_idx`.
- **Command**:
  ```bash
  cat packages/db/prisma/migrations/20260624041017_add_llm_audit_log/migration.sql
  ```
- **Expected Result**: File contains:
  - `CREATE TYPE "LlmFeature" AS ENUM ('zone_classification', 'case_extraction', 'medical_narrative', 'refinement', 'skeleton_generation');`
  - `"estimatedCostUsd" DECIMAL(10,6) NOT NULL`
  - `CREATE INDEX "LlmAuditLog_userId_idx" ON "LlmAuditLog"("userId");`
  - `CREATE INDEX "LlmAuditLog_feature_createdAt_idx" ON "LlmAuditLog"("feature", "createdAt");`
  - `CREATE INDEX "LlmAuditLog_createdAt_idx" ON "LlmAuditLog"("createdAt");`
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EXPORT-001: LlmFeature enum exported from barrel
- **Description**: Verifies `LlmFeature` is exported as a value (not just a type) from `packages/db/src/index.ts` so consuming packages can use it at runtime.
- **Steps**:
  1. Open `packages/db/src/index.ts`.
  2. Confirm a line exports `LlmFeature` from `@prisma/client` as a value export (i.e. `export { LlmFeature } from '@prisma/client'` — not `export type`).
- **Command**:
  ```bash
  grep 'LlmFeature' packages/db/src/index.ts
  ```
- **Expected Result**: A line matching `export { ... LlmFeature ... } from '@prisma/client'` (value export, not `export type`). The `LlmFeature` identifier must not appear only in a `export type` line.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EXPORT-002: LlmAuditLog type exported from barrel
- **Description**: Verifies the `LlmAuditLog` TypeScript type is exported from the barrel so consuming packages can import it without depending directly on `@prisma/client`.
- **Steps**:
  1. Open `packages/db/src/index.ts`.
  2. Confirm a line exports `LlmAuditLog` from `@prisma/client` (type or value export is acceptable).
- **Command**:
  ```bash
  grep 'LlmAuditLog' packages/db/src/index.ts
  ```
- **Expected Result**: At least one line exporting `LlmAuditLog` from `@prisma/client`, e.g. `export type { LlmAuditLog } from '@prisma/client'`.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-BUILD-001: DB package typechecks cleanly
- **Description**: Verifies that after adding the model and re-exporting the types, the DB package compiles with no TypeScript errors.
- **Steps**:
  1. From the repo root, run the typecheck command.
  2. Confirm exit code is 0 and no errors are printed to stderr.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/db typecheck
  ```
- **Expected Result**: Command exits with code 0. No TypeScript diagnostic errors in output.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-BUILD-002: Root-level typecheck passes
- **Description**: Verifies the monorepo-wide typecheck still passes after the DB package changes (guards against accidentally breaking dependent packages).
- **Steps**:
  1. From the repo root, run `pnpm typecheck`.
  2. Confirm exit code is 0 across all packages.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits with code 0. No TypeScript errors in any package output.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-001: estimatedCostUsd uses Decimal, not Float
- **Description**: The task explicitly requires `Decimal` (not `Float`) for `estimatedCostUsd` to avoid floating-point rounding on cost values. This test confirms `Float` does not appear for that field.
- **Scenario**: Check that `Float` type is absent from the `estimatedCostUsd` field definition.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `estimatedCostUsd` line.
  3. Confirm it reads `Decimal` (not `Float`).
- **Command**:
  ```bash
  grep 'estimatedCostUsd' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output is exactly `  estimatedCostUsd Decimal    @db.Decimal(10, 6)`. The word `Float` must not appear on this line.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-002: userId has no foreign-key relation directive
- **Description**: The task requires `userId` to be a plain `String` (no FK) so audit rows survive user deletion. This test confirms no `@relation` or `references` decorator is present on the `userId` field.
- **Scenario**: Confirm `userId` is FK-free, enabling audit row retention after user deletion.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. In the `LlmAuditLog` block, find the `userId` line.
  3. Confirm it reads `userId  String` with no `@relation`, `references`, or `fields` directives.
- **Command**:
  ```bash
  grep -A1 'userId' packages/db/prisma/schema.prisma | grep -v 'LlmAuditLog_userId_idx'
  ```
- **Expected Result**: The `userId` field line in `LlmAuditLog` contains only `String` — no `@relation(...)` annotation.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-INT-001: Insert and retrieve a LlmAuditLog record via Prisma client
- **Description**: End-to-end verification that the migrated table accepts a row and the Prisma client can round-trip it. Requires a live PostgreSQL database.
- **Scenario**: Write a temporary Node script that inserts one `LlmAuditLog` row and reads it back.
- **Steps**:
  1. Ensure `DATABASE_URL` is set in the environment (e.g. source `packages/db/.env`).
  2. Run the inline script below.
  3. Confirm the printed row contains all inserted fields with correct values.
  4. The script cleans up after itself (deletes the inserted row).
- **Command**:
  ```bash
  node --input-type=module <<'EOF'
import { PrismaClient, LlmFeature } from './packages/db/node_modules/@prisma/client/index.js';
const prisma = new PrismaClient();
const row = await prisma.llmAuditLog.create({
  data: {
    userId: 'uat-test-user',
    feature: LlmFeature.zone_classification,
    model: 'claude-sonnet-4-5',
    provider: 'anthropic',
    inputTokens: 100,
    outputTokens: 50,
    estimatedCostUsd: 0.000375,
    durationMs: 1200,
  },
});
console.log('Created:', JSON.stringify(row, null, 2));
const fetched = await prisma.llmAuditLog.findUniqueOrThrow({ where: { id: row.id } });
console.log('Fetched:', JSON.stringify(fetched, null, 2));
await prisma.llmAuditLog.delete({ where: { id: row.id } });
console.log('Deleted row', row.id, '— cleanup complete');
await prisma.$disconnect();
EOF
  ```
- **Expected Result**:
  - "Created:" block shows a row with `userId: "uat-test-user"`, `feature: "zone_classification"`, `inputTokens: 100`, `outputTokens: 50`, `durationMs: 1200`, and a non-null `id` (cuid format) and `createdAt` timestamp.
  - `estimatedCostUsd` value is `0.000375` (Decimal precision preserved — no floating-point drift).
  - "Fetched:" block matches "Created:" block exactly.
  - "Deleted row … — cleanup complete" prints with no errors.
  - Process exits with code 0.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-23 -->

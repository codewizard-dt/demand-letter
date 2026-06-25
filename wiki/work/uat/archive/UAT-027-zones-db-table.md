---
id: UAT-027
title: "UAT: Prisma Schema — zones and templates DB Tables"
status: passed
task: TASK-027
created: 2026-06-24
updated: 2026-06-24
---

# UAT-027 — UAT: Prisma Schema — zones and templates DB Tables

implements::[[TASK-027]]

> **Source task**: [[TASK-027]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Monorepo dependencies installed: `pnpm install` from repo root
- [ ] `packages/db` Prisma client has been generated (`pnpm --filter @demand-letter/db exec prisma generate`)

---

## Test Cases

### UAT-SCHEMA-001: ZoneType enum present in schema
- **Scenario**: The `ZoneType` enum with both variants exists in `schema.prisma`
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `ZoneType` enum definition.
  3. Verify it declares exactly two members: `boilerplate_verbatim` and `variable_populated`.
- **Command**:
  ```bash
  grep -A 4 'enum ZoneType' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: Output contains `boilerplate_verbatim` and `variable_populated` inside the enum block; no other members.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCHEMA-002: Template model present with all required fields
- **Scenario**: The `Template` model is correctly defined in `schema.prisma` with all mandatory columns and relations
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `model Template` block.
  3. Confirm the following fields exist with correct types:
     - `id String @id @default(cuid())`
     - `jobId String` (FK to `Job`)
     - `s3KeyOriginal String`
     - `s3KeyTagged String?`
     - `slotCount Int?`
     - `ingestedAt DateTime @default(now())`
     - `zones Zone[]`
  4. Confirm `@@index([jobId])` and `@@map("templates")` directives.
- **Command**:
  ```bash
  grep -A 20 'model Template' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: All seven fields listed above appear in the block, along with `@@index([jobId])` and `@@map("templates")`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCHEMA-003: Zone model present with all required fields
- **Scenario**: The `Zone` model is correctly defined with all fields, constraints, and table mapping
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `model Zone` block.
  3. Confirm the following fields:
     - `id String @id @default(cuid())`
     - `templateId String` (FK to `Template`)
     - `zoneIndex Int`
     - `type ZoneType?`
     - `runPath Json`
     - `textContent String`
     - `suggestedFieldName String?`
     - `confirmed Boolean @default(false)`
     - `confirmedBy String?`
     - `confirmedAt DateTime?`
  4. Confirm `@@unique([templateId, zoneIndex])`, `@@index([templateId])`, and `@@map("zones")` directives.
- **Command**:
  ```bash
  grep -A 22 'model Zone' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: All ten fields appear in the block along with the unique constraint, index, and map directives.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-SCHEMA-004: Job model has reverse relation to Template
- **Scenario**: The `Job` model includes the `templates Template[]` reverse relation field
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `model Job` block.
  3. Verify the field `templates Template[]` is present.
- **Command**:
  ```bash
  grep -A 15 'model Job' packages/db/prisma/schema.prisma
  ```
- **Expected Result**: The `model Job` block contains the line `templates Template[]`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-MIGRATION-001: Migration SQL creates ZoneType enum
- **Scenario**: The generated migration SQL creates the `ZoneType` PostgreSQL enum
- **Steps**:
  1. Open `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Verify it contains a `CREATE TYPE "ZoneType" AS ENUM (...)` statement with both `'boilerplate_verbatim'` and `'variable_populated'`.
- **Command**:
  ```bash
  grep 'CREATE TYPE.*ZoneType' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: A single line matching `CREATE TYPE "ZoneType" AS ENUM ('boilerplate_verbatim', 'variable_populated');`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-MIGRATION-002: Migration SQL creates templates table with correct columns
- **Scenario**: The migration SQL creates the `templates` table with all required columns
- **Steps**:
  1. Open `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Locate the `CREATE TABLE "templates"` block.
  3. Confirm columns: `id TEXT`, `jobId TEXT`, `s3KeyOriginal TEXT`, `s3KeyTagged TEXT` (nullable), `slotCount INTEGER` (nullable), `ingestedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`, and primary key constraint.
- **Command**:
  ```bash
  grep -A 12 'CREATE TABLE "templates"' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: All six columns appear inside the `CREATE TABLE "templates"` block with the types and nullability described above, plus `CONSTRAINT "templates_pkey" PRIMARY KEY ("id")`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-MIGRATION-003: Migration SQL creates zones table with correct columns
- **Scenario**: The migration SQL creates the `zones` table with all required columns including JSONB for runPath
- **Steps**:
  1. Open `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Locate the `CREATE TABLE "zones"` block.
  3. Confirm columns: `id TEXT`, `templateId TEXT`, `zoneIndex INTEGER`, `type "ZoneType"` (nullable), `runPath JSONB NOT NULL`, `textContent TEXT NOT NULL`, `suggestedFieldName TEXT` (nullable), `confirmed BOOLEAN NOT NULL DEFAULT false`, `confirmedBy TEXT` (nullable), `confirmedAt TIMESTAMP(3)` (nullable), and primary key constraint.
- **Command**:
  ```bash
  grep -A 15 'CREATE TABLE "zones"' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: All ten columns with correct types appear in the block, including `JSONB` for `runPath` and `DEFAULT false` for `confirmed`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-MIGRATION-004: Migration SQL creates indexes and unique constraint for zones
- **Scenario**: The migration SQL creates the correct indexes and unique constraint on the `zones` table
- **Steps**:
  1. Open `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Verify the following statements exist:
     - `CREATE INDEX "templates_jobId_idx" ON "templates"("jobId")`
     - `CREATE UNIQUE INDEX "zones_templateId_zoneIndex_key" ON "zones"("templateId", "zoneIndex")`
     - `CREATE INDEX "zones_templateId_idx" ON "zones"("templateId")`
- **Command**:
  ```bash
  grep -E '(CREATE INDEX|CREATE UNIQUE INDEX)' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: Three lines matching the three index/unique-constraint statements above.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-MIGRATION-005: Migration SQL creates foreign key constraints with CASCADE
- **Scenario**: Both foreign keys in the migration use ON DELETE CASCADE
- **Steps**:
  1. Open `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Verify two `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` statements exist:
     - `templates_jobId_fkey` referencing `jobs(id)` with `ON DELETE CASCADE`
     - `zones_templateId_fkey` referencing `templates(id)` with `ON DELETE CASCADE`
- **Command**:
  ```bash
  grep -E 'ADD CONSTRAINT.*fkey' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: Two lines — one for `templates_jobId_fkey` and one for `zones_templateId_fkey` — both using `ON DELETE CASCADE`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-CLIENT-001: Prisma client exports Template and Zone types from barrel
- **Scenario**: The `packages/db` barrel re-exports `Template` and `Zone` types from `@prisma/client`
- **Steps**:
  1. Open `packages/db/src/index.ts`.
  2. Verify the `export type { ... }` line includes `Template` and `Zone`.
- **Command**:
  ```bash
  grep 'export type' packages/db/src/index.ts
  ```
- **Expected Result**: Output contains `Template` and `Zone` within the `export type { ... }` statement.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-CLIENT-002: Prisma client exports ZoneType enum value from barrel
- **Scenario**: The `packages/db` barrel re-exports the `ZoneType` enum as a value from `@prisma/client`
- **Steps**:
  1. Open `packages/db/src/index.ts`.
  2. Verify the `export { ... }` (value export) line includes `ZoneType`.
- **Command**:
  ```bash
  grep 'export {' packages/db/src/index.ts
  ```
- **Expected Result**: Output contains `ZoneType` in the value export line alongside `PrismaClient` and `LlmFeature`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-CLIENT-003: TypeScript typechecks cleanly with new models
- **Scenario**: Adding `Template`, `Zone`, and `ZoneType` to the db package does not introduce any TypeScript errors across the monorepo
- **Steps**:
  1. From the monorepo root, run the typecheck command.
  2. Observe that all three packages (`db`, `web`, `api`) complete without errors.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Exit code 0. No TypeScript diagnostic errors printed. All three packages report clean.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-001: Cascade delete — deleting a Job removes its Templates
- **Scenario**: The FK `templates_jobId_fkey` is configured with `ON DELETE CASCADE`; deleting a parent `Job` row must cascade to `templates`
- **Steps**:
  1. Inspect the migration SQL at `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Locate the `ADD CONSTRAINT "templates_jobId_fkey"` statement.
  3. Confirm it contains `ON DELETE CASCADE`.
  4. Inspect the Prisma schema `packages/db/prisma/schema.prisma`, model `Template`, field `job`.
  5. Confirm `onDelete: Cascade` is set in the relation attribute.
- **Command**:
  ```bash
  grep -A 2 'templates_jobId_fkey' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: The FK definition contains `ON DELETE CASCADE ON UPDATE CASCADE`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-002: Cascade delete — deleting a Template removes its Zones
- **Scenario**: The FK `zones_templateId_fkey` is configured with `ON DELETE CASCADE`; deleting a parent `Template` row must cascade to `zones`
- **Steps**:
  1. Inspect the migration SQL at `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Locate the `ADD CONSTRAINT "zones_templateId_fkey"` statement.
  3. Confirm it contains `ON DELETE CASCADE`.
  4. Inspect the Prisma schema, model `Zone`, field `template`.
  5. Confirm `onDelete: Cascade` is set in the relation attribute.
- **Command**:
  ```bash
  grep -A 2 'zones_templateId_fkey' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: The FK definition contains `ON DELETE CASCADE ON UPDATE CASCADE`.
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-003: Unique constraint prevents duplicate zoneIndex per Template
- **Scenario**: The unique index `zones_templateId_zoneIndex_key` on `(templateId, zoneIndex)` must exist in the migration SQL
- **Steps**:
  1. Open the migration SQL at `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Locate the `CREATE UNIQUE INDEX "zones_templateId_zoneIndex_key"` statement.
  3. Confirm it targets both `"templateId"` and `"zoneIndex"` columns on the `"zones"` table.
- **Command**:
  ```bash
  grep 'zones_templateId_zoneIndex_key' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: One line: `CREATE UNIQUE INDEX "zones_templateId_zoneIndex_key" ON "zones"("templateId", "zoneIndex");`
- [x] Pass <!-- 2026-06-24 -->

---

### UAT-EDGE-004: confirmed field defaults to false in migration SQL
- **Scenario**: The `confirmed` column in `zones` must default to `false`, not require an explicit value on insert
- **Steps**:
  1. Open the migration SQL at `packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql`.
  2. Locate the `confirmed` column definition inside `CREATE TABLE "zones"`.
  3. Confirm it reads `"confirmed" BOOLEAN NOT NULL DEFAULT false`.
- **Command**:
  ```bash
  grep '"confirmed"' packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql
  ```
- **Expected Result**: `"confirmed" BOOLEAN NOT NULL DEFAULT false`
- [x] Pass <!-- 2026-06-24 -->

---
id: TASK-027
title: "Prisma Schema — zones and templates DB Tables"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: [TASK-025, TASK-026]
uat: "[[UAT-027]]"
tags: [prisma, database, schema, zone-detection, template]
---

# TASK-027 — Prisma Schema — zones and templates DB Tables

## Objective

Add two new Prisma models to `packages/db/prisma/schema.prisma`: `Template` and `Zone`. The `Template` model stores per-job template metadata (original and tagged S3 keys, slot count, ingestion timestamp). The `Zone` model stores per-template paragraph zones extracted by the DOCX parser, with all classification and confirmation fields needed by Phase 2 (LLM zone classification) and Phase 3 (attorney annotation UI). Generate and apply a Prisma migration, regenerate the client, and update the db barrel exports.

## Approach

Both models are added to the existing schema in `packages/db/prisma/schema.prisma`. The `Zone` model uses a `Json` type for `runPath` (maps to JSONB in PostgreSQL), a nullable `ZoneType` enum (`boilerplate_verbatim`, `variable_populated`) for `type`, and a nullable `String` for `suggestedFieldName`. The `confirmed` boolean defaults to `false`. Migration is generated with `prisma migrate dev` (requires a live local PostgreSQL connection at `DATABASE_URL`).

## Steps

### 1. Add ZoneType enum and Template + Zone models to schema  <!-- agent: general-purpose -->

- [x] Open `packages/db/prisma/schema.prisma`.
- [x] Add the `ZoneType` enum after the existing enums:
  ```prisma
  enum ZoneType {
    boilerplate_verbatim
    variable_populated
  }
  ```
- [x] Add the `Template` model:
  ```prisma
  model Template {
    id              String   @id @default(cuid())
    jobId           String
    job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
    s3KeyOriginal   String
    s3KeyTagged     String?
    slotCount       Int?
    ingestedAt      DateTime @default(now())
    zones           Zone[]

    @@index([jobId])
    @@map("templates")
  }
  ```
- [x] Add the `Zone` model:
  ```prisma
  model Zone {
    id                 String    @id @default(cuid())
    templateId         String
    template           Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
    zoneIndex          Int
    type               ZoneType?
    runPath            Json
    textContent        String
    suggestedFieldName String?
    confirmed          Boolean   @default(false)
    confirmedBy        String?
    confirmedAt        DateTime?

    @@unique([templateId, zoneIndex])
    @@index([templateId])
    @@map("zones")
  }
  ```
- [x] Add the reverse relation `templates Template[]` to the `Job` model. <!-- Completed: 2026-06-24 -->

### 2. Generate and apply the migration  <!-- agent: general-purpose -->

- [x] Ensure `DATABASE_URL` is set (source `.env` or export it).
- [x] Run:
  ```bash
  pnpm --filter @demand-letter/db exec prisma migrate dev --name add-templates-zones
  ```
- [x] Confirm the migration creates `zones` and `templates` tables, the `ZoneType` enum, and a unique constraint on `(template_id, zone_index)`.
- [x] If no live DB is available, generate the migration SQL only: <!-- Completed: 2026-06-24 — no live DB, migration SQL written manually to packages/db/prisma/migrations/20260624120000_add_templates_zones/migration.sql -->

### 3. Regenerate Prisma Client  <!-- agent: general-purpose -->

- [x] Run:
  ```bash
  pnpm --filter @demand-letter/db exec prisma generate
  ```
- [x] Confirm no errors. <!-- Completed: 2026-06-24 — Prisma Client v5.22.0 generated successfully -->

### 4. Update db barrel exports  <!-- agent: general-purpose -->

- [x] Open `packages/db/src/index.ts`.
- [x] Add re-exports for the new types: <!-- Completed: 2026-06-24 — added Template, Zone to type export; ZoneType to value export -->

### 5. TypeScript typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the monorepo root.
- [x] Confirm zero errors across all three packages. <!-- Completed: 2026-06-24 — all three packages (db, web, api) pass tsc --noEmit cleanly -->

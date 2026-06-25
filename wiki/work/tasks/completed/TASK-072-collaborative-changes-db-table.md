---
id: TASK-072
title: "Per-operation change log in PostgreSQL: collaborative_changes table"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: [TASK-073]
parallel_safe_with: [TASK-066, TASK-067, TASK-068, TASK-069, TASK-070, TASK-071]
uat: "[[UAT-072]]"
tags: [prisma, postgresql, change-tracking, db-migration, collaboration]
---

# TASK-072 — collaborative_changes PostgreSQL Table

## Objective

Create the `collaborative_changes` table in PostgreSQL via a Prisma migration to store per-operation change records for the collaborative editing change-tracking feature. Each row captures who changed what, when, and the delta content — enabling the track-changes UI (TASK-074) and accept/reject functionality.

## Approach

Add a `CollaborativeChange` Prisma model with the fields specified in ROADMAP-007 Phase 3. Run `prisma migrate dev` to generate and apply the migration. No application logic changes — this task is schema-only, a prerequisite for the Y.js observe hook (TASK-073).

## Steps

### 1. Add CollaborativeChange model to Prisma schema  <!-- agent: general-purpose -->

- [x] Edit `packages/db/prisma/schema.prisma`: <!-- Completed: 2026-06-25 -->
  - Add the model after the existing `Refinement` model:
    ```prisma
    model CollaborativeChange {
      id            String   @id @default(cuid())
      jobId         String
      userId        String
      userName      String
      operationType String   // "insert" | "delete" | "format"
      contentDelta  Json
      createdAt     DateTime @default(now())

      job           Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

      @@index([jobId])
      @@index([jobId, createdAt])
    }
    ```
  - Add back-relation on the `Job` model:
    ```prisma
    collaborativeChanges CollaborativeChange[]
    ```

### 2. Run Prisma migration  <!-- agent: general-purpose -->

- [x] From `packages/db/`: <!-- Completed: 2026-06-25 -->
  ```
  pnpm prisma migrate dev --name add-collaborative-changes
  ```
- [x] Verify migration file created under `packages/db/prisma/migrations/` <!-- Completed: 2026-06-25 -->
- [x] Verify the migration SQL contains `CREATE TABLE "collaborative_changes"` with all 8 columns <!-- Completed: 2026-06-25 — table name is "CollaborativeChange" (no @@map); all 8 columns present -->

### 3. Regenerate Prisma client  <!-- agent: general-purpose -->

- [x] Run `pnpm prisma generate` in `packages/db/` (usually runs automatically after migrate, but confirm) <!-- Completed: 2026-06-25 -->
- [x] Verify `CollaborativeChange` type is exported from the Prisma client <!-- Completed: 2026-06-25 — also added Refinement which was missing -->

### 4. Typecheck  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0 <!-- Completed: 2026-06-25 via make typecheck -->
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 via make typecheck -->

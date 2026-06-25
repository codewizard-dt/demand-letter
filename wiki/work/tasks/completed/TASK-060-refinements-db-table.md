---
id: TASK-060
title: "refinements DB table — Prisma model + migration"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: [TASK-061, TASK-065]
parallel_safe_with: []
uat: "[[UAT-060]]"
tags: [db, prisma, refinement, roadmap-006]
---

# TASK-060 — refinements DB table — Prisma model + migration

## Objective

Add a `Refinement` Prisma model to `packages/db/prisma/schema.prisma` and run the migration so the database has a `refinements` table. This table is the audit trail for the attorney refinement loop: every second-pass Claude call records its instruction, scope, before/after text, and acceptance status here.

## Approach

Add a new `Refinement` model with a `Job` relation (cascade-delete) and an explicit `accepted` boolean so attorneys can revert. The `scope` field is a plain `String` (either a section name like `"medical_narrative"` or the literal `"all"`). Use `prisma migrate dev` in the `packages/db` workspace.

## Steps

### 1. Add Refinement model to schema  <!-- agent: general-purpose -->

- [x] Open `packages/db/prisma/schema.prisma`
- [x] Add a `Refinement` relation to the `Job` model: `refinements Refinement[]`
- [x] Append the new model after `Block`: <!-- Completed: 2026-06-25 -->

```prisma
model Refinement {
  id           String   @id @default(cuid())
  jobId        String
  job          Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  instruction  String
  scope        String   @default("all")   // "all" or a section name e.g. "medical_narrative"
  beforeText   String
  afterText    String
  accepted     Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([jobId])
  @@index([createdAt])
  @@map("refinements")
}
```

### 2. Run the migration  <!-- agent: general-purpose -->

- [x] From the project root, run: `pnpm --filter @demand-letter/db exec prisma migrate dev --name add_refinements_table`
- [x] Confirm the migration file is created under `packages/db/prisma/migrations/`
- [x] Confirm `prisma generate` runs cleanly (client types updated) <!-- Completed: 2026-06-25 -->

### 3. Verify  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/db exec prisma studio` or query the DB to confirm the `refinements` table exists with the correct columns
- [x] Alternatively, check that `packages/db/prisma/migrations/` contains a new migration file with `CREATE TABLE "refinements"` <!-- Completed: 2026-06-25 -->

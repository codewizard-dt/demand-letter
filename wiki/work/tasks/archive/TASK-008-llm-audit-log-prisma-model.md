---
id: TASK-008
title: "LlmAuditLog Prisma Model"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: [TASK-009]
uat: "[[UAT-008]]"
tags: [prisma, database, llm-audit, phase-2]
---

# TASK-008 — LlmAuditLog Prisma Model

## Objective

Add the `LlmAuditLog` Prisma model to the shared database schema. This model records every LLM call made by the system — cost, latency, feature context, and token counts — so the audit trail is wired in from day one. Every subsequent roadmap phase inherits cost/usage logging automatically once this model exists.

## Approach

Add a `LlmAuditLog` model to `packages/db/prisma/schema.prisma`. Use a Prisma `enum` for the `feature` field to get DB-level constraint checking. Use `Decimal` for `estimatedCostUsd` to avoid float rounding on cost values. `userId` is a plain `String` (no FK) so audit rows survive user deletion. Add three indexes: on `userId`, on `(feature, createdAt)` composite, and on `createdAt` alone for TTL/cleanup queries.

After schema edits, run `prisma migrate dev` to generate the migration SQL and regenerate the Prisma client.

## Steps

### 1. Locate the Prisma schema  <!-- agent: Explore -->

- [x] Find `schema.prisma` under `packages/db/` (or wherever the shared DB package lives)
  - Use `mcp__serena__find_file` with mask `schema.prisma` from `.`
  - Note the exact path for subsequent steps

### 2. Add the `LlmFeature` enum  <!-- agent: general-purpose -->

- [x] Open `schema.prisma` with `mcp__serena__get_symbols_overview` to understand existing models
- [x] Append the enum block (use `Edit` — never shell redirection):

```prisma
enum LlmFeature {
  zone_classification
  case_extraction
  medical_narrative
  refinement
  skeleton_generation
}
```

  - Note: Prisma enum values cannot contain hyphens — use underscores; map to the string union at the TypeScript layer

### 3. Add the `LlmAuditLog` model  <!-- agent: general-purpose -->

- [x] Append the model block to `schema.prisma`:

```prisma
model LlmAuditLog {
  id               String     @id @default(cuid())
  userId           String
  feature          LlmFeature
  model            String
  provider         String
  inputTokens      Int
  outputTokens     Int
  estimatedCostUsd Decimal    @db.Decimal(10, 6)
  durationMs       Int
  createdAt        DateTime   @default(now())

  @@index([userId])
  @@index([feature, createdAt])
  @@index([createdAt])
}
```

### 4. Run the migration  <!-- agent: general-purpose -->

- [x] From the repo root (or `packages/db/`), run:
  ```
  pnpm --filter @demand-letter/db prisma migrate dev --name add-llm-audit-log
  ```
  - If the filter name differs, check `package.json` in the DB package and adjust
  - Confirm the migration file is created under `prisma/migrations/`

### 5. Verify Prisma client generation  <!-- agent: general-purpose -->

- [x] Run:
  ```
  pnpm --filter @demand-letter/db prisma generate
  ```
- [x] Confirm `LlmAuditLog` and `LlmFeature` are exported from the Prisma client
- [x] Run `pnpm typecheck` from the repo root — must pass with no errors

### 6. Export type helpers (optional but recommended)  <!-- agent: general-purpose -->

- [x] In `packages/db/src/index.ts` (or equivalent barrel), re-export:
  ```typescript
  export type { LlmAuditLog } from '@prisma/client';
  export { LlmFeature } from '@prisma/client';
  ```
  - This ensures consuming packages can import the enum from a stable path

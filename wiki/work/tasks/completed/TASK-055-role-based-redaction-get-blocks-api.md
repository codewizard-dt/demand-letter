---
id: TASK-055
title: "Role-based block text redaction in GET /jobs/:id/blocks API"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-053]
blocks: [TASK-057]
parallel_safe_with: [TASK-052]
uat: "[[UAT-055]]"
tags: [compliance, hipaa, api, redaction, role-based-access]
---

# TASK-055 — Role-based block text redaction in GET /jobs/:id/blocks API

implements::[[ROADMAP-005]]

## Objective

The `GET /jobs/:id/blocks` handler must return redacted block text (PHI/PII replaced with typed tokens) for developer-role callers, and full unredacted text for attorney-role callers. The `blocks.phi_offsets` JSONB field (populated by TASK-052) provides the entity spans for redaction.

## Approach

Read `X-Caller-Role: attorney | developer` request header (default: `developer`). After fetching blocks from DB, if role is `developer`, apply `redactText(block.text, block.phiOffsets)` to each block's text before serialization. Attorneys see the full text. `phiOffsets` is NOT included in the API response body (it's internal metadata).

## Steps

### 1. Update GET /jobs/:id/blocks select clause to include phi_offsets  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/handlers/get-jobs-blocks.ts` <!-- Completed: 2026-06-25 -->
- [x] In the `prisma.block.findMany` `select` clause, add `phiOffsets: true` <!-- Completed: 2026-06-25 -->
- [x] Add import: `import { redactText, type RedactableEntity } from '../lib/redact-text'` <!-- Completed: 2026-06-25 -->

### 2. Implement role-based text redaction  <!-- agent: general-purpose -->

- [x] After the `prisma.$transaction(...)` call, add role detection: <!-- Completed: 2026-06-25 -->
  ```typescript
  const callerRole = (event.headers?.['x-caller-role'] ?? event.headers?.['X-Caller-Role'] ?? 'developer').toLowerCase();
  const isAttorney = callerRole === 'attorney';
  ```
- [x] Map blocks to the response shape, applying redaction for non-attorneys: <!-- Completed: 2026-06-25 -->
  ```typescript
  const responseBlocks = blocks.map((block) => {
    const entities = (block.phiOffsets as RedactableEntity[] | null) ?? [];
    const text = isAttorney ? block.text : redactText(block.text, entities);
    const { phiOffsets: _omit, ...rest } = block;
    return { ...rest, text };
  });
  ```
- [x] Update the `body` serialization to use `responseBlocks` instead of `blocks` <!-- Completed: 2026-06-25 -->

### 3. TypeScript verification  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` <!-- Completed: 2026-06-25 -->
- [x] Fix any type errors (likely `phiOffsets` cast from `Prisma.JsonValue` to `RedactableEntity[]`) <!-- Completed: 2026-06-25 -->

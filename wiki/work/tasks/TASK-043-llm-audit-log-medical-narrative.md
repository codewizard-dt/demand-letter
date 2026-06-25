---
id: TASK-043
title: "LlmAuditLog: verify medical_narrative feature rows are written correctly"
status: todo
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-040]
blocks: []
parallel_safe_with: [TASK-041, TASK-042]
uat: ""
tags: [generation, audit-log, medical-narrative, llm]
---

# TASK-043 — LlmAuditLog Integration for Medical Narrative

## Objective

Verify that `generateMedicalNarrative` (TASK-040) correctly writes an `LlmAuditLog` row with `feature: LlmFeature.medical_narrative` for every invocation. The `invokeModelStream` wrapper in `ai-provider.ts` already handles audit logging — this task confirms the correct `LlmFeature` enum value is threaded through, the `medical_narrative` enum value exists in the Prisma schema, and the cost dashboard at `GET /admin/llm-costs` returns `medical-narrative` aggregate rows after generation.

## Approach

The `LlmFeature` enum in `packages/db/prisma/schema.prisma` already has `medical_narrative` (confirmed by reading the schema). The `invokeModelStream` call in `generateMedicalNarrative` passes `feature: LlmFeature.medical_narrative`. This task validates these wires are connected by: (1) confirming the enum value, (2) confirming the `invokeModelStream` call uses it, and (3) adding a static assertion type-check that the `feature` argument is `LlmFeature.medical_narrative`.

## Steps

### 1. Confirm `LlmFeature.medical_narrative` in Prisma schema  <!-- agent: general-purpose -->

- [ ] Read `packages/db/prisma/schema.prisma`.
- [ ] Confirm `medical_narrative` is a value in the `LlmFeature` enum.
- [ ] If missing, add it and run `pnpm --filter @demand-letter/db prisma generate` (migration not needed for enum-only adds in some providers; verify with Prisma docs).

### 2. Confirm `feature` arg in `generateMedicalNarrative`  <!-- agent: general-purpose -->

- [ ] Read `packages/api/src/lib/medical-narrative.ts` (created by TASK-040).
- [ ] Confirm the `invokeModelStream` call passes `feature: LlmFeature.medical_narrative`.
- [ ] If it passes a string literal `'medical_narrative'` instead, change it to `LlmFeature.medical_narrative` (imported from `@demand-letter/db`).

### 3. Confirm cost dashboard includes `medical_narrative` aggregation  <!-- agent: general-purpose -->

- [ ] Read `packages/api/src/handlers/get-admin-llm-costs.ts`.
- [ ] Confirm the aggregation query does not filter by feature (i.e., it includes all `LlmFeature` values).
- [ ] If the query is filtered, update it to include `medical_narrative`.

### 4. Typecheck  <!-- agent: general-purpose -->

- [ ] Run `pnpm typecheck` from the repo root.
- [ ] Fix any type errors before marking done.

---
id: TASK-062
title: "PATCH accept/reject refinement endpoints — update jobs.output_text on accept"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-060]
blocks: [TASK-063]
parallel_safe_with: [TASK-061]
uat: "[[UAT-062]]"
tags: [backend, lambda, refinement, roadmap-006]
---

# TASK-062 — PATCH accept/reject refinement endpoints

## Objective

Create two Lambda handlers:
- `PATCH /jobs/:id/refine/:refinement_id/accept`: flips `Refinement.accepted = true` and updates `jobs.output` with `refinement.afterText` (so the accepted text becomes the canonical letter)
- `PATCH /jobs/:id/refine/:refinement_id/reject`: leaves `accepted = false` (effectively a no-op, but confirms rejection intent in the record)

These endpoints are the write-side of the attorney review workflow — the frontend calls them after the attorney decides to keep or discard a refinement.

## Approach

Two thin Lambda handlers that update a single `Refinement` row (and optionally the parent `Job`). No Claude call needed here — these are plain DB writes. Can be implemented as two separate handlers or one handler that reads the action from the path suffix.

## Steps

### 1. Create accept handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/patch-jobs-refine-accept.ts` <!-- Completed: 2026-06-25 -->
- [x] Parse `jobId` from `event.pathParameters?.id` and `refinementId` from `event.pathParameters?.refinement_id`; return 400 if either is missing <!-- Completed: 2026-06-25 -->
- [x] Look up `prisma.refinement.findUnique({ where: { id: refinementId } })`; return 404 if not found; return 403 if `refinement.jobId !== jobId` <!-- Completed: 2026-06-25 -->
- [x] Run a Prisma transaction: <!-- Completed: 2026-06-25 -->
  1. `prisma.refinement.update({ where: { id: refinementId }, data: { accepted: true } })`
  2. `prisma.job.update({ where: { id: jobId }, data: { output: refinement.afterText } })`
- [x] Return `{ statusCode: 200, body: JSON.stringify({ ok: true }) }` <!-- Completed: 2026-06-25 -->

### 2. Create reject handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/patch-jobs-refine-reject.ts` <!-- Completed: 2026-06-25 -->
- [x] Same path parsing and validation as accept handler <!-- Completed: 2026-06-25 -->
- [x] `prisma.refinement.update({ where: { id: refinementId }, data: { accepted: false } })` <!-- Completed: 2026-06-25 -->
- [x] Return `{ statusCode: 200, body: JSON.stringify({ ok: true }) }` <!-- Completed: 2026-06-25 -->

### 3. Register in template.yaml  <!-- agent: general-purpose -->

- [x] Add `PatchJobsRefineAcceptFunction`: `Path: /jobs/{id}/refine/{refinement_id}/accept`, `Method: patch` <!-- Completed: 2026-06-25 -->
- [x] Add `PatchJobsRefineRejectFunction`: `Path: /jobs/{id}/refine/{refinement_id}/reject`, `Method: patch` <!-- Completed: 2026-06-25 -->
- [x] Both need `DbLayer` and `AWSLambdaBasicExecutionRole` only (no Bedrock needed) <!-- Completed: 2026-06-25 -->

### 4. Add API client helpers  <!-- agent: general-purpose -->

- [x] In `packages/web/src/lib/api.ts`, add: <!-- Completed: 2026-06-25 -->
  ```typescript
  export async function acceptRefinement(jobId: string, refinementId: string): Promise<void>
  export async function rejectRefinement(jobId: string, refinementId: string): Promise<void>
  ```
  — PATCH to the respective endpoints, throw on non-2xx

### 5. Build verify  <!-- agent: general-purpose -->

- [x] Run `pnpm build` to confirm TypeScript compiles <!-- Completed: 2026-06-25 -->
- [x] Confirm `.build/handlers/patch-jobs-refine-accept.js` and `patch-jobs-refine-reject.js` are emitted <!-- Completed: 2026-06-25 -->

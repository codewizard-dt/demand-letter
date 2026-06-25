---
id: TASK-064
title: "Refinement history list — collapsible panel of past instructions and acceptance status"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-063]
blocks: [TASK-065]
parallel_safe_with: []
uat: "[[UAT-064]]"
tags: [frontend, refinement, roadmap-006]
---

# TASK-064 — Refinement history list

## Objective

Add a collapsible refinement history panel to `GeneratePage.tsx` (or a dedicated component) that shows all past refinement instructions for the current job, along with their scope, accepted/rejected status, and timestamps. The panel is read-only — it lets attorneys audit the refinement trail.

## Approach

Add a `GET /jobs/:id/refinements` Lambda handler that returns all `Refinement` rows for a job ordered by `createdAt` descending. The frontend fetches this list after each accept/reject action and on page load (when `isDone === true`). Render as a collapsible `<details>` block.

## Steps

### 1. Backend: GET /jobs/:id/refinements  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/get-jobs-refinements.ts`
- [x] Parse `jobId` from `event.pathParameters?.id`; return 400 if missing
- [x] `prisma.refinement.findMany({ where: { jobId }, orderBy: { createdAt: 'desc' }, select: { id: true, instruction: true, scope: true, accepted: true, createdAt: true } })`
- [x] Return `{ statusCode: 200, body: JSON.stringify({ refinements }) }`
- [x] Register in `template.yaml`: `GetJobsRefinementsFunction`, `Path: /jobs/{id}/refinements`, `Method: get`

### 2. API client helper  <!-- agent: general-purpose -->

- [x] In `packages/web/src/lib/api.ts`, add:
  ```typescript
  export interface RefinementRow {
    id: string;
    instruction: string;
    scope: string;
    accepted: boolean;
    createdAt: string;
  }
  export async function fetchRefinements(jobId: string): Promise<RefinementRow[]>
  ```

### 3. RefinementHistory component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/components/RefinementHistory.tsx`
- [x] Props: `jobId: string`, `refreshTrigger: number` (increment to force a re-fetch after accept/reject)
- [x] On mount and when `refreshTrigger` changes: fetch `fetchRefinements(jobId)` and store in state
- [x] Render as `<details><summary>Refinement history ({count})</summary>...</details>`
- [x] Each row: instruction text (truncated to 80 chars), scope badge, accepted/rejected badge (green/red), timestamp

### 4. Wire into GeneratePage  <!-- agent: general-purpose -->

- [x] Import `RefinementHistory` in `GeneratePage.tsx`
- [x] Add state: `refinementRefresh: number` (start 0)
- [x] Pass `onAccepted` callback from `RefinementPanel` to also increment `refinementRefresh`
- [x] Render `<RefinementHistory jobId={id!} refreshTrigger={refinementRefresh} />` below `RefinementPanel`, when `isDone === true`

### 5. Build verify  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api build` — confirms handler compiles
- [x] `pnpm --filter @demand-letter/web build` — confirms frontend compiles

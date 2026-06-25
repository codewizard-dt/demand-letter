---
id: TASK-037
title: "Sufficiency pre-check: fail fast with 400 if any required template slot is uncovered"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: [TASK-036, TASK-038, TASK-039]
uat: "[[UAT-037]]"
tags: [generation, sufficiency-gate, validation]
---

# TASK-037 — Sufficiency Pre-check for Generation Gate

## Objective

Update `POST /jobs/:id/generate` (handler: `packages/api/src/handlers/post-jobs-generate.ts`) so that before attempting docxtemplater rendering, it calls the existing `computeGapReport(jobId)` from `packages/api/src/lib/sufficiency-gate.ts` and returns a structured `400` (not `422`) error if any `template_slots` row with `required = true` has no corresponding `extracted_fields` row where `is_null = false` (or `acceptMissing = true`, or `source = "attorney-judgment"`). The existing `422` for `gap_report_not_cleared` already does this — this task verifies it is in place, changes the status code to `400` to match the roadmap spec, and ensures the error payload includes the slot names that are missing.

## Approach

The sufficiency gate logic already exists in `sufficiency-gate.ts` and is already imported in `post-jobs-generate.ts`. The current handler returns `422` for gap failures. The roadmap spec says `400`. This task changes the status code, verifies the error payload includes per-slot gap details, and ensures the gate fires before any S3 fetch or LLM call. No new business logic is needed — just the status code change and payload refinement.

## Steps

### 1. Verify existing gate wiring in `post-jobs-generate.ts`  <!-- agent: general-purpose -->

- [x] Read `packages/api/src/handlers/post-jobs-generate.ts`. <!-- Completed: 2026-06-24 -->
- [x] Confirm `computeGapReport(jobId)` is called before any S3 fetches. <!-- Completed: 2026-06-24 -->
- [x] Confirm if `gapReport.gaps.length > 0` returns early with an error response. <!-- Completed: 2026-06-24 -->

### 2. Change status code from 422 to 400  <!-- agent: general-purpose -->

- [x] In `post-jobs-generate.ts`, change the early-return status code from `422` to `400` when `gapReport.gaps.length > 0`. <!-- Completed: 2026-06-24 -->
- [x] Ensure the error body is: <!-- Completed: 2026-06-24 -->
  ```json
  {
    "error": "sufficiency_precheck_failed",
    "message": "<N> required slot(s) are not covered. Run /jobs/:id/gap-report to see details.",
    "gaps": [{ "fieldName": "...", "nullReason": "...", "acceptMissing": false }]
  }
  ```
- [x] Keep `error` key as `"sufficiency_precheck_failed"` (distinct from `"gap_report_not_cleared"` used in ROADMAP-003). <!-- Completed: 2026-06-24 -->

### 3. Typecheck  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` (or `pnpm typecheck` from root). <!-- Completed: 2026-06-24 -->
- [x] Fix any type errors before marking done. <!-- Completed: 2026-06-24 — no type errors -->

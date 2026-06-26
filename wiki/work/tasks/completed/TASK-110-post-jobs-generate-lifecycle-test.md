---
id: TASK-110
title: "post-jobs-generate lifecycle test covering success, failure, template-render-failure, stall, and early-return guards"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-087]
blocks: []
parallel_safe_with: []
uat: ""
tags: [testing, api]
---

# TASK-110 — post-jobs-generate lifecycle test

## Objective

Write a Vitest unit test for `packages/api/src/handlers/post-jobs-generate.ts` that covers the full job status state machine: pending → processing → complete (success), pending → processing → failed (generation error), pending → processing → failed (TemplateRenderError), stall detection via `Promise.race`, and the two early-return guards that leave status unchanged (no files → 422, gap report gaps → 400).

## Approach

Used the existing `vi.mock('@demand-letter/db')` + `vitest-mock-extended` `DeepMockProxy<PrismaClient>` pattern established in TASK-087. Used `vi.mock('../lib', async importActual)` with `importActual` spread so `TemplateRenderError` remains the real class — critical for `instanceof` checks inside the handler. Stall detection implemented via `Promise.race([handler(...), stall(200)])` with a never-resolving mock, avoiding fake timers.

## Steps

### 1. Research job lifecycle and test patterns  <!-- agent: general-purpose -->

- [x] Read post-jobs-generate.ts handler — status machine, imports, early-return guards
- [x] Read existing test files (post-jobs.test.ts, get-jobs.test.ts) for mock pattern
- [x] Verify TemplateRenderError constructor signature
- [x] Document findings in raw/research/job-lifecycle-test/

### 2. Implement test file  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/post-jobs-generate.test.ts`
- [x] Mock: @demand-letter/db, ../lib/sufficiency-gate, ../lib/medical-narrative, @aws-sdk/client-s3
- [x] Mock ../lib with importActual to preserve real TemplateRenderError class
- [x] 7 test cases: missing_job_id, no_files 422, gap_gaps 400, success, Bedrock error, TemplateRenderError, stall
- [x] Run `pnpm --filter @demand-letter/api test` — all 74 tests pass

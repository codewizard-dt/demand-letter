---
id: TASK-113
title: "Fix local deployment gates and SAM lint blockers"
status: in-progress
created: 2026-07-01
updated: 2026-07-01
depends_on: []
blocks: [TASK-116]
parallel_safe_with: [TASK-114, TASK-115]
uat: ""
tags: [deployment, ci, sam]
---

# TASK-113 — Fix local deployment gates and SAM lint blockers

## Objective

Clear the pre-deployment blockers found during the AWS infrastructure assessment so the repo can pass local quality gates and SAM template validation before any live deploy is attempted.

## Approach

Keep this task limited to readiness fixes: repair the frontend typecheck failure, resolve the server unit-test timeout, and update the SAM template so `sam validate --lint` passes. Do not deploy AWS resources in this task.

## Steps

### 1. Repair local quality gates  <!-- agent: general-purpose -->

- [x] Fix the unused variable typecheck failure in `app/frontend/src/components/VariableComboBox.tsx`
- [x] Diagnose and fix the timeout in `app/server/src/handlers/post-jobs-generate.test.ts`
- [x] Run `pnpm typecheck` and `pnpm --filter @demand-letter/server test` until both pass

<!-- Updated: 2026-07-01 17:39 -->

### 2. Repair SAM lint blockers  <!-- agent: general-purpose -->

- [x] Update the RDS PostgreSQL engine version in `template.yaml` from deprecated `16.3` to a currently creatable PostgreSQL 16 engine version
- [x] Replace the invalid empty `TextractCompletionTopicArn` default behavior in `template.yaml` with a lint-valid approach
- [x] Run `sam validate --lint` until the template passes

<!-- Updated: 2026-07-01 17:41 -->

### 3. Record readiness evidence  <!-- agent: general-purpose -->

- [x] Capture the passing command list in the task notes or completion log
- [x] Leave deployment itself for `TASK-116`

<!-- Updated: 2026-07-01 17:42 -->

## Readiness Evidence

Recorded on 2026-07-01. Deployment was not run as part of this task; live deployment remains scoped to `TASK-116`.

Passing commands from the readiness sections:

- `pnpm typecheck` passed.
- `pnpm --filter @demand-letter/server test` passed: 20 files, 137 tests.
- `sam validate --lint` passed: `template.yaml is a valid SAM Template`.

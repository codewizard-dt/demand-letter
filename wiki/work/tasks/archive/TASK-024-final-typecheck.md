---
id: TASK-024
title: "Final Monorepo Typecheck Gate"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: []
blocks: []
parallel_safe_with: [TASK-023]
uat: ""
tags: [typecheck, verification, phase-5]
---

# TASK-024 — Final Monorepo Typecheck Gate

## Objective

Confirm `pnpm typecheck` passes with zero errors across all three packages (`api`, `db`, `web`) after all Phase 3 and Phase 4 implementation tasks are complete. This is the final clean-baseline check before declaring the skeleton done.

## Approach

Run `pnpm typecheck` from the repo root and assert exit code 0 with no error lines. Fix any regressions introduced by Phase 3/4 work before marking done.

## Steps

### 1. Run monorepo-wide typecheck  <!-- agent: general-purpose -->

- [x] From the project root: `pnpm typecheck` <!-- Completed: 2026-06-24 -->
- [x] Assert exit code 0 and zero lines matching `error TS` <!-- Completed: 2026-06-24 -->
- [x] If errors are found, fix them (they are likely import resolution issues introduced by new handler files or the Tailwind config) <!-- No errors found: 2026-06-24 -->

### 2. Verify each package individually  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` — must pass <!-- Completed: 2026-06-24 -->
- [x] `pnpm --filter @demand-letter/db typecheck` — must pass <!-- Completed: 2026-06-24 -->
- [x] `pnpm --filter @demand-letter/web typecheck` — must pass <!-- Completed: 2026-06-24 -->
- [x] `pnpm --filter @demand-letter/web build` — Vite build must complete without errors (catches Tailwind/CSS import issues not caught by tsc) <!-- Completed: 2026-06-24 -->

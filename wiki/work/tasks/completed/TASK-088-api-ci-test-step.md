---
id: TASK-088
title: "Add pnpm --filter api test step to CI workflow"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-085]
blocks: []
parallel_safe_with: [TASK-086, TASK-087]
uat: "[[UAT-088]]"
tags: [testing, api, ci, github-actions]
roadmap: "[[ROADMAP-008]]"
---

# TASK-088 — Wire API Tests into CI

## Objective

Ensure `pnpm --filter api test` runs automatically on every push/PR via a CI workflow. If a GitHub Actions workflow already exists, add a test step. If not, create `.github/workflows/ci.yml` with a minimal workflow that installs deps and runs all package tests.

## Approach

Check for an existing `.github/workflows/` directory. If a workflow exists, add `pnpm --filter @demand-letter/api test` after the install step. If none exists, create a minimal GitHub Actions CI workflow that checks out, installs pnpm, installs deps, typechecks all packages, and runs `pnpm --filter @demand-letter/api test`. Also add a root-level `test` script to the root `package.json` (or a `test:api` script) for local convenience.

## Steps

### 1. Detect existing CI configuration  <!-- agent: general-purpose -->

- [x] Use `mcp__serena__list_dir` on `.github/` to check if a workflows directory exists. <!-- Completed: 2026-06-26 -->
- [x] If `.github/workflows/` exists, read the workflow file(s) to understand the existing structure. <!-- Completed: 2026-06-26 — directory did not exist -->

### 2a. If CI workflow exists — add test step  <!-- agent: general-purpose -->

- [x] Locate the job that runs `pnpm install` (or equivalent). <!-- Skipped: no existing workflow -->

### 2b. If no CI workflow exists — create one  <!-- agent: general-purpose -->

- [x] Create `.github/workflows/ci.yml`: <!-- Completed: 2026-06-26 -->
  ```yaml
  name: CI

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4

        - uses: pnpm/action-setup@v4
          with:
            version: 9

        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: pnpm

        - name: Install dependencies
          run: pnpm install --frozen-lockfile

        - name: Typecheck all packages
          run: pnpm typecheck

        - name: Run API tests
          run: pnpm --filter @demand-letter/api test

        - name: Lint
          run: pnpm lint
  ```
- [x] Verify the file was written correctly using the Read tool. <!-- Completed: 2026-06-26 — YAML validated via node yaml package -->

### 3. Add root-level test:api convenience script  <!-- agent: general-purpose -->

- [x] Edit root `package.json` to add `"test:api": "pnpm --filter @demand-letter/api test"` to `scripts`. <!-- Completed: 2026-06-26 -->
- [x] Confirm the edit is valid JSON using `node -e "require('./package.json')"`. <!-- Completed: 2026-06-26 — JSON valid -->

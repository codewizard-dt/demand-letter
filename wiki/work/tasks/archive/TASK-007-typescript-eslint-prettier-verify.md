---
id: TASK-007
title: 'TypeScript Strict Mode + ESLint + Prettier — Clean Baseline'
status: done
created: 2026-06-23
updated: 2026-06-23 <!-- Completed: 2026-06-23 -->
depends_on: [TASK-001]
blocks: []
parallel_safe_with: [TASK-002, TASK-003, TASK-004, TASK-006]
uat: '[[UAT-007]]'
tags: [dx, typescript, eslint, prettier, ci]
---

# TASK-007 — TypeScript Strict Mode + ESLint + Prettier — Clean Baseline

## Objective

Ensure `pnpm typecheck` and `pnpm lint` pass cleanly across all packages on the initial scaffold. Wire up a `pnpm format:check` script so CI can enforce formatting. Add a Makefile (or root-level `ci` script) that runs all three checks in sequence as a single gate.

## Approach

- TASK-001 creates the TypeScript config, ESLint config, and Prettier config; this task verifies and hardens them
- Strict mode is already enabled in the root `tsconfig.json` (`"strict": true`); this task confirms each package inherits it and emits no errors
- The ESLint config may need minor adjustments for the stub files (React JSX in `packages/web/src/main.tsx` needs a JSX transform rule)
- A `Makefile` at the project root provides a single `make ci` target that chains `pnpm install → typecheck → lint → format:check` — this becomes the CI gate for subsequent PRs
- No test runner yet (tests are a Phase 5 concern); the gate is type-safety + lint + format only

## Steps

### 1. Verify TypeScript strict mode across all packages <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the project root (executes `pnpm -r typecheck`) <!-- Completed: 2026-06-23 -->
- [x] Fix any strict-mode errors in the stub files: <!-- Completed: 2026-06-23 -->
  - `packages/web/src/main.tsx`: ensure `document.getElementById('root')!` non-null assertion is present (already in the scaffold)
  - `packages/api/src/index.ts`: ensure return type annotation satisfies `APIGatewayProxyHandler`
  - `packages/db/src/index.ts`: ensure `globalThis.__prisma` declaration is typed — added `@types/node` to devDependencies
- [x] Re-run until `pnpm typecheck` exits 0 across all packages <!-- Completed: 2026-06-23 -->

### 2. Verify ESLint passes across all packages <!-- agent: general-purpose -->

- [x] Run `pnpm lint` from the project root (executes `pnpm -r lint`) <!-- Completed: 2026-06-23 -->
- [x] If `packages/web` lint fails on JSX: <!-- Completed: 2026-06-23 — no JSX failures -->
  - Confirm `eslint.config.js` includes the `@vitejs/plugin-react` JSX pragma — or add to the web-specific file override:
    ```js
    {
      files: ['packages/web/**/*.tsx'],
      languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    }
    ```
- [x] Fix any `no-unused-vars` or `@typescript-eslint/no-explicit-any` warnings in stub files <!-- Completed: 2026-06-23 — removed superfluous eslint-disable comment in packages/db/src/index.ts -->
- [x] Re-run until `pnpm lint` exits 0 <!-- Completed: 2026-06-23 -->

### 3. Add format check script <!-- agent: general-purpose -->

- [x] Add to root `package.json` scripts: <!-- Completed: 2026-06-23 -->
  ```json
  "format:check": "prettier --check .",
  "format": "prettier --write ."
  ```
- [x] Run `pnpm format:check` and fix any formatting issues with `pnpm format` <!-- Completed: 2026-06-23 — 77 files reformatted -->
- [x] Re-run `pnpm format:check` until it exits 0 <!-- Completed: 2026-06-23 -->

### 4. Create Makefile CI gate <!-- agent: general-purpose -->

- [x] Create `Makefile` at project root: <!-- Completed: 2026-06-23 -->

  ```makefile
  .PHONY: ci install typecheck lint format-check

  ci: install typecheck lint format-check

  install:
  	pnpm install --frozen-lockfile

  typecheck:
  	pnpm typecheck

  lint:
  	pnpm lint

  format-check:
  	pnpm format:check
  ```

  Note: Makefile recipes use a literal tab character for indentation — not spaces.

### 5. Final clean-run verification <!-- agent: general-purpose -->

- [x] Run `make ci` from the project root <!-- Completed: 2026-06-23 -->
- [x] Confirm all steps exit 0: install, typecheck, lint, format-check <!-- Completed: 2026-06-23 — all 4 steps passed -->
- [x] Record the passing output as a comment in the PR / commit message for audit purposes <!-- Completed: 2026-06-23 — make ci: install (frozen-lockfile, 332ms), typecheck (3 pkgs), lint (3 pkgs), format:check — all exit 0 -->

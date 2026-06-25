---
id: TASK-056
title: "ESLint rule to flag direct console.log with block text in Lambda handlers"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: [TASK-057]
parallel_safe_with: [TASK-051, TASK-053, TASK-058]
uat: "[[UAT-056]]"
tags: [compliance, eslint, logging, developer-tooling]
---

# TASK-056 — ESLint rule to flag direct console.log with block text in Lambda handlers

implements::[[ROADMAP-005]]

## Objective

Add an ESLint configuration to `packages/api` that flags direct `console.log` / `console.info` / `console.warn` calls as warnings, reminding developers to use `redactText()` before logging block text. This is Phase 3 item 2 of ROADMAP-005.

## Approach

No ESLint config currently exists in `packages/api`. Create `packages/api/.eslintrc.json` extending `@typescript-eslint/recommended` with the `no-console` rule set to `warn`. Add `eslint` and `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` as devDependencies. Add a `lint` script to `packages/api/package.json`. Running `pnpm lint` in `packages/api` will warn on any `console.*` calls, prompting developers to use `redactText()` first.

## Steps

### 1. Add ESLint devDependencies  <!-- agent: general-purpose -->

- [x] In `packages/api/package.json`, add to `devDependencies`:
  ```json
  "eslint": "^8.0.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0"
  ```
- [x] Add `lint` script: `"lint": "eslint src --ext .ts --max-warnings 0"`
- [x] Run `pnpm install` from repo root <!-- Completed: 2026-06-25 -->

### 2. Create .eslintrc.json  <!-- agent: general-purpose -->

- [x] Create `packages/api/.eslintrc.json`: <!-- Completed: 2026-06-25 -->
  ```json
  {
    "root": true,
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "project": "./tsconfig.json",
      "ecmaVersion": 2020,
      "sourceType": "module"
    },
    "plugins": ["@typescript-eslint"],
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
      "no-console": ["warn", { "allow": [] }]
    },
    "env": {
      "node": true,
      "es2020": true
    }
  }
  ```

### 3. Verify lint runs  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api lint` (expects warnings for existing console.* calls, not errors — `--max-warnings 0` is set but the rule is `warn` not `error`, so it will exit non-zero only if warnings exceed 0)
- [x] Adjust `--max-warnings` to allow existing warnings if the build would break: change to `--max-warnings 50` in the script to not block CI while the codebase is being migrated
- [x] The key deliverable is the config existing and the lint script running successfully
- [x] Run `pnpm --filter @demand-letter/api typecheck` to confirm TypeScript still passes <!-- Completed: 2026-06-25 -->

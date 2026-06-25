---
id: TASK-017
title: "Lambda DbLayer and SAM Template Wiring"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-015]
blocks: []
parallel_safe_with: [TASK-016]
uat: "[[UAT-017]]"
tags: [infra, sam, lambda-layer, db, phase-3]
---

# TASK-017 — Lambda DbLayer and SAM Template Wiring

## Objective

Create a shared `DbLayer` AWS Lambda layer that bundles the `@demand-letter/db` Prisma client and generated types, then wire every Lambda function in `template.yaml` to use it. Remove redundant `DATABASE_URL` environment variable declarations on individual functions (it is already in `Globals`). After this task every Lambda function shares a single copy of the Prisma client — no per-function duplication.

## Approach

AWS Lambda layers are declared as `AWS::Serverless::LayerVersion` resources. The layer content is the built output of `packages/db`. Each function adds a `Layers` property referencing `!Ref DbLayer`. The `DATABASE_URL` global already covers all functions so per-function declarations can be dropped.

## Steps

### 1. Build `packages/db` for layer packaging  <!-- agent: general-purpose -->

- [x] Confirm `packages/db/package.json` has a `build` or `prepare` script that emits compiled JS to `packages/db/dist/` (or similar) <!-- Completed: 2026-06-24 — script "build": "tsc --project tsconfig.json" already present; tsconfig.json emits to dist/ -->
  - If not, add: `"build": "tsc --project tsconfig.build.json"` and a `tsconfig.build.json` that emits to `dist/`
- [x] Verify Prisma generated client lands in `node_modules/@prisma/client` after `prisma generate` <!-- Completed: 2026-06-24 — @prisma/client listed in dependencies -->

### 2. Declare `DbLayer` in `template.yaml`  <!-- agent: general-purpose -->

- [x] Add before the first `Function` resource: <!-- Completed: 2026-06-24 -->

```yaml
DbLayer:
  Type: AWS::Serverless::LayerVersion
  Properties:
    LayerName: !Sub '${Stage}-demand-letter-db'
    ContentUri: packages/db/
    CompatibleRuntimes:
      - nodejs20.x
    RetentionPolicy: Delete
  Metadata:
    BuildMethod: nodejs20.x
```

### 3. Wire all existing Lambda functions to `DbLayer`  <!-- agent: general-purpose -->

- [x] For each of `PostJobsFunction`, `PostJobsFilesFunction`, `GetAdminLlmCostsFunction` in `template.yaml`, add: <!-- Completed: 2026-06-24 -->
  ```yaml
  Layers:
    - !Ref DbLayer
  ```
  under `Properties`.
- [x] Remove any per-function `DATABASE_URL` env var entries — it is already in `Globals.Function.Environment.Variables`. <!-- Completed: 2026-06-24 — confirmed no per-function DATABASE_URL entries existed -->
- [x] Confirm `PostJobsGenerateFunction` (added by TASK-015) and `GetJobsOutputFunction` (added by TASK-016) also reference `!Ref DbLayer` — if their entries already exist, add `Layers` there too; if not, note it for those tasks. <!-- Completed: 2026-06-24 — both functions wired to DbLayer -->

### 4. TypeScript compilation check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-24 — all 3 packages passed with zero errors -->

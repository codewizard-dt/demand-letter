---
id: UAT-017
title: "UAT: Lambda DbLayer and SAM Template Wiring"
status: passed
task: TASK-017
created: 2026-06-24
updated: 2026-06-24
---

# UAT-017 — UAT: Lambda DbLayer and SAM Template Wiring

implements::[[TASK-017]]

> **Source task**: [[TASK-017]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Repository is checked out at HEAD with all TASK-017 changes applied
- [ ] `pnpm install` has been run (workspace packages linked)

---

## Test Cases

### UAT-FS-001: DbLayer resource declared in template.yaml
- **File**: `template.yaml`
- **Description**: Verifies the `DbLayer` `AWS::Serverless::LayerVersion` resource exists in the SAM template.
- **Steps**:
  1. Open `template.yaml` at the project root.
  2. Locate the `Resources:` block.
  3. Confirm a key named `DbLayer` is present with `Type: AWS::Serverless::LayerVersion`.
- **Expected Result**: `DbLayer` resource exists with `Type: AWS::Serverless::LayerVersion`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-002: DbLayer ContentUri points to packages/db/
- **File**: `template.yaml`
- **Description**: Verifies the DbLayer `ContentUri` is set to `packages/db/` so `sam build` packages the correct directory.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DbLayer.Properties`, confirm `ContentUri: packages/db/`.
- **Expected Result**: `ContentUri: packages/db/` is present under `DbLayer.Properties`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-003: DbLayer CompatibleRuntimes includes nodejs20.x
- **File**: `template.yaml`
- **Description**: Verifies the DbLayer declares `nodejs20.x` as a compatible runtime.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DbLayer.Properties.CompatibleRuntimes`, confirm `- nodejs20.x` is listed.
- **Expected Result**: `CompatibleRuntimes` contains exactly `- nodejs20.x`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-004: DbLayer Metadata.BuildMethod is nodejs20.x
- **File**: `template.yaml`
- **Description**: Verifies the DbLayer `Metadata.BuildMethod` is `nodejs20.x` so `sam build` runs the Node.js build for the layer.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DbLayer.Metadata`, confirm `BuildMethod: nodejs20.x`.
- **Expected Result**: `BuildMethod: nodejs20.x` is present under `DbLayer.Metadata`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-005: DbLayer RetentionPolicy is Delete
- **File**: `template.yaml`
- **Description**: Verifies the DbLayer `RetentionPolicy` is `Delete` to avoid orphaned layer versions.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DbLayer.Properties`, confirm `RetentionPolicy: Delete`.
- **Expected Result**: `RetentionPolicy: Delete` is present.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-006: DbLayer LayerName uses Stage substitution
- **File**: `template.yaml`
- **Description**: Verifies the DbLayer `LayerName` uses `!Sub '${Stage}-demand-letter-db'` so layer names are stage-scoped.
- **Steps**:
  1. Open `template.yaml`.
  2. Under `DbLayer.Properties`, confirm `LayerName: !Sub '${Stage}-demand-letter-db'`.
- **Expected Result**: `LayerName: !Sub '${Stage}-demand-letter-db'` is present.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-007: PostJobsFunction wired to DbLayer
- **File**: `template.yaml`
- **Description**: Verifies `PostJobsFunction` references `!Ref DbLayer` in its `Layers` list.
- **Steps**:
  1. Open `template.yaml`.
  2. Locate `PostJobsFunction`.
  3. Under `Properties`, confirm `Layers:` is present with `- !Ref DbLayer`.
- **Expected Result**: `PostJobsFunction.Properties.Layers` contains `- !Ref DbLayer`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-008: PostJobsFilesFunction wired to DbLayer
- **File**: `template.yaml`
- **Description**: Verifies `PostJobsFilesFunction` references `!Ref DbLayer` in its `Layers` list.
- **Steps**:
  1. Open `template.yaml`.
  2. Locate `PostJobsFilesFunction`.
  3. Under `Properties`, confirm `Layers:` is present with `- !Ref DbLayer`.
- **Expected Result**: `PostJobsFilesFunction.Properties.Layers` contains `- !Ref DbLayer`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-009: GetAdminLlmCostsFunction wired to DbLayer
- **File**: `template.yaml`
- **Description**: Verifies `GetAdminLlmCostsFunction` references `!Ref DbLayer` in its `Layers` list.
- **Steps**:
  1. Open `template.yaml`.
  2. Locate `GetAdminLlmCostsFunction`.
  3. Under `Properties`, confirm `Layers:` is present with `- !Ref DbLayer`.
- **Expected Result**: `GetAdminLlmCostsFunction.Properties.Layers` contains `- !Ref DbLayer`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-010: PostJobsGenerateFunction wired to DbLayer
- **File**: `template.yaml`
- **Description**: Verifies `PostJobsGenerateFunction` (added by TASK-015) references `!Ref DbLayer` in its `Layers` list.
- **Steps**:
  1. Open `template.yaml`.
  2. Locate `PostJobsGenerateFunction`.
  3. Under `Properties`, confirm `Layers:` is present with `- !Ref DbLayer`.
- **Expected Result**: `PostJobsGenerateFunction.Properties.Layers` contains `- !Ref DbLayer`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-011: GetJobsOutputFunction wired to DbLayer
- **File**: `template.yaml`
- **Description**: Verifies `GetJobsOutputFunction` (added by TASK-016) references `!Ref DbLayer` in its `Layers` list.
- **Steps**:
  1. Open `template.yaml`.
  2. Locate `GetJobsOutputFunction`.
  3. Under `Properties`, confirm `Layers:` is present with `- !Ref DbLayer`.
- **Expected Result**: `GetJobsOutputFunction.Properties.Layers` contains `- !Ref DbLayer`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-012: packages/db/package.json has a build script
- **File**: `packages/db/package.json`
- **Description**: Verifies the db package has a `build` script so `sam build` can compile it into the layer.
- **Steps**:
  1. Open `packages/db/package.json`.
  2. Under `scripts`, confirm a `build` key exists.
- **Expected Result**: `"build"` key is present in `scripts`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-FS-013: packages/db tsconfig emits to dist/
- **File**: `packages/db/tsconfig.json`
- **Description**: Verifies the TypeScript config for the db package emits compiled output to `dist/`, which is what the layer `ContentUri` packages.
- **Steps**:
  1. Open `packages/db/tsconfig.json`.
  2. Under `compilerOptions`, confirm `"outDir": "dist"` (or `"outDir": "./dist"`).
- **Expected Result**: `outDir` is set to `dist` or `./dist`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-001: No per-function DATABASE_URL declarations in template.yaml
- **Scenario**: `DATABASE_URL` must only appear in `Globals.Function.Environment.Variables`, not in any individual Lambda function's `Environment.Variables`.
- **Steps**:
  1. Open `template.yaml`.
  2. Search for all occurrences of `DATABASE_URL`.
  3. Confirm `DATABASE_URL` appears exactly once — under `Globals.Function.Environment.Variables`.
  4. Confirm it does NOT appear under any individual function's `Environment.Variables` block.
- **Expected Result**: `DATABASE_URL` appears exactly once in the file, in the Globals block.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-002: DbLayer resource appears before the first Lambda function
- **Scenario**: CloudFormation resolves `!Ref DbLayer` at deploy time (not order-dependent), but the convention is to declare shared resources before consumers for readability. Verify the declaration ordering.
- **Steps**:
  1. Open `template.yaml`.
  2. Find the line number of `DbLayer:`.
  3. Find the line number of the first Lambda function resource (`PostJobsFunction:`).
  4. Confirm `DbLayer:` appears at an earlier line than `PostJobsFunction:`.
- **Expected Result**: `DbLayer:` is declared before `PostJobsFunction:` in the file.
- [x] Pass <!-- 2026-06-24 -->

### UAT-CLI-001: pnpm typecheck passes with zero errors
- **Description**: Verifies the full monorepo TypeScript compilation succeeds after the TASK-017 changes.
- **Steps**:
  1. From the project root, run:
     ```bash
     pnpm typecheck
     ```
  2. Observe the output for all three workspace packages (api, db, web).
- **Expected Result**: All three packages exit with code 0 and no TypeScript errors are printed.
- [x] Pass <!-- 2026-06-24 -->

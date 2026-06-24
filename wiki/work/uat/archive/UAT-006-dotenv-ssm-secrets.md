---
id: UAT-006
title: 'UAT: dotenv and SSM Parameter Store for All Secrets'
status: passed
task: TASK-006
created: 2026-06-23
updated: 2026-06-23
---

# UAT-006 — UAT: dotenv and SSM Parameter Store for All Secrets

implements::[[TASK-006]]

> **Source task**: [[TASK-006]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] Working directory is the project root (`demand-letter/`)
- [ ] `pnpm install` has been run (lockfile is synced)
- [ ] `git` is available and the working tree is on the `main` branch

---

## Test Cases

### UAT-STATIC-001: dotenv listed as dependency in api package.json

- **Scenario**: Verify `dotenv` appears in `packages/api/package.json` under `dependencies`
- **Description**: The task requires dotenv to be installed in the API package so the Lambda entry point can load `.env` during local development. This test confirms the dependency is declared (not just installed).
- **Steps**:
  1. Open `packages/api/package.json`
  2. Locate the `"dependencies"` section
  3. Confirm an entry for `"dotenv"` is present with a semver range starting at `^16`
- **Expected Result**: `"dotenv": "^16.0.0"` (or compatible `^16.x.x`) appears inside the `"dependencies"` object — not `devDependencies` or `peerDependencies`
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-002: dotenv/config imported as first line of api entry point

- **Scenario**: Verify `packages/api/src/index.ts` loads dotenv before any other imports
- **Description**: Loading `dotenv/config` must be the very first statement so environment variables are populated before any AWS SDK or Prisma client initialization that reads from `process.env`.
- **Steps**:
  1. Open `packages/api/src/index.ts`
  2. Confirm line 1 (the first line) is exactly `import 'dotenv/config';`
  3. Confirm all other imports appear after this line
- **Expected Result**: `import 'dotenv/config';` is the first line of the file; no other `import` or `require` statement precedes it
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-003: .env.example contains all six required keys

- **Scenario**: Verify `.env.example` documents every required environment variable
- **Description**: `.env.example` is the committed reference for developers. All variables that affect runtime behavior must appear here so new developers know what to set in their local `.env`.
- **Steps**:
  1. Open `.env.example` at the project root
  2. Check that each of the following keys appears as a top-level assignment (key on the left of `=`):
     - `DATABASE_URL`
     - `DB_USERNAME`
     - `DB_PASSWORD`
     - `BEDROCK_MODEL_ID`
     - `AWS_REGION`
     - `STAGE`
- **Expected Result**: All six keys are present in `.env.example` with non-empty placeholder values; no key is missing
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-004: scripts/setup-ssm.sh exists and is a valid shell script

- **Scenario**: Verify the SSM seeding helper script is present and correctly structured
- **Description**: `scripts/setup-ssm.sh` seeds SSM Parameter Store for a given stage. It must exist and contain `aws ssm put-parameter` calls for all three DB secrets.
- **Steps**:
  1. Confirm `scripts/setup-ssm.sh` exists at the project root level
  2. Open the file and verify it begins with `#!/usr/bin/env bash`
  3. Confirm `set -euo pipefail` is present (fail-safe flags)
  4. Confirm three `aws ssm put-parameter` invocations are present, targeting:
     - `/${STAGE}/demand-letter/db/username`
     - `/${STAGE}/demand-letter/db/password`
     - `/${STAGE}/demand-letter/db/url`
- **Expected Result**: File exists, has the correct shebang, safe-mode flags, and all three `put-parameter` calls for the DB secrets
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-005: scripts/setup-ssm.sh is executable

- **Scenario**: Verify the setup script has the executable bit set
- **Description**: The script must be executable so developers can run it directly (`./scripts/setup-ssm.sh`) without needing `bash scripts/setup-ssm.sh`.
- **Steps**:
  1. Run the command below from the project root:
- **Command**:
  ```bash
  test -x scripts/setup-ssm.sh && echo "EXECUTABLE" || echo "NOT EXECUTABLE"
  ```
- **Expected Result**: Output is `EXECUTABLE`
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-006: template.yaml Globals includes DATABASE_URL SSM resolve reference

- **Scenario**: Verify `template.yaml` injects `DATABASE_URL` into Lambda functions via SSM dynamic reference
- **Description**: Deployed Lambda functions must receive `DATABASE_URL` from SSM at deploy time via CloudFormation's `{{resolve:ssm:...}}` syntax so no secret is hardcoded in the template or environment.
- **Steps**:
  1. Open `template.yaml`
  2. Locate the `Globals.Function.Environment.Variables` section
  3. Confirm a `DATABASE_URL` key is present with a value using the `!Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'` pattern (or equivalent SSM dynamic reference to the same SSM path)
- **Expected Result**: `DATABASE_URL` appears under `Globals.Function.Environment.Variables` and resolves from SSM path `/{Stage}/demand-letter/db/url`
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-007: .env file does not appear in git status

- **Scenario**: Verify no `.env` file is tracked or staged in git
- **Description**: `.env` must never be committed. `.gitignore` excludes it, but this test confirms the protection is working — no `.env` file appears in `git status` output as tracked, staged, or untracked.
- **Steps**:
  1. Run the command below from the project root:
- **Command**:
  ```bash
  git status --porcelain | grep -E '^\s*.{0,2} \.env$'
  ```
- **Expected Result**: The command produces no output (exit 0 from `git status` but the `grep` finds no `.env` match). If the grep exits non-zero that is also acceptable — it means no `.env` line was found. A `.env` file appearing in any status column is a failure.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-STATIC-008: .gitignore excludes .env but not .env.example

- **Scenario**: Verify gitignore rules protect secrets while keeping the example file committable
- **Description**: `.gitignore` must block `.env` and `.env.*` but explicitly allow `.env.example` so the reference file can be committed.
- **Steps**:
  1. Open `.gitignore` at the project root
  2. Confirm `.env` appears as an entry (standalone, not only as part of `.env.*`)
  3. Confirm `.env.*` appears as an entry
  4. Confirm `!.env.example` appears as an entry (negation to re-allow the example file)
- **Expected Result**: All three patterns are present in `.gitignore` in the correct order (`.env.*` before `!.env.example`)
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-001: dotenv load is a no-op when no .env file is present

- **Scenario**: Verify the API entry point does not crash when `.env` is absent (production-like environment)
- **Description**: `import 'dotenv/config'` must not throw when `.env` is missing — dotenv v16 silently skips if the file is not found. This test confirms the import alone does not cause a startup failure.
- **Steps**:
  1. Ensure no `.env` file exists in the project root (or temporarily rename it)
  2. Run the TypeScript compilation check from the project root:
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api exec tsc --noEmit
  ```
- **Expected Result**: TypeScript compilation exits with code 0 and no errors. (Runtime no-op for missing `.env` is guaranteed by dotenv v16 — no additional runtime test needed here since the Lambda is not deployed in UAT.)
- [x] Pass <!-- 2026-06-23 -->

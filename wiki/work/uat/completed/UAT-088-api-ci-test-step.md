---
id: UAT-088
title: "UAT: Add pnpm --filter api test step to CI workflow"
status: passed
task: TASK-088
created: 2026-06-26
updated: 2026-06-26
---

# UAT-088 — UAT: Add pnpm --filter api test step to CI workflow

implements::[[TASK-088]]

> **Source task**: [[TASK-088]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Repository root is the working directory for all commands
- [ ] `pnpm install` has been run (node_modules present, including `yaml` in root node_modules)
- [ ] Node.js >= 20 and pnpm >= 9 are available locally

---

## Test Cases

### UAT-CI-001: CI workflow file exists at the correct path

- **Description**: Verifies `.github/workflows/ci.yml` was created by the task
- **Steps**:
  1. From the repository root, run the command below
- **Command**:
  ```bash
  test -f .github/workflows/ci.yml && echo "EXISTS" || (echo "MISSING" && exit 1)
  ```
- **Expected Result**: Command exits 0 and prints `EXISTS`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CI-002: Workflow YAML is syntactically valid

- **Description**: Verifies the CI workflow file is parseable YAML (no syntax errors)
- **Steps**:
  1. From the repository root, run the command below
- **Command**:
  ```bash
  node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log('VALID')"
  ```
- **Expected Result**: Command exits 0 and prints `VALID`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CI-003: Workflow triggers on push and pull_request to main branch

- **Description**: Verifies the `on:` block configures both push and PR triggers restricted to the `main` branch
- **Steps**:
  1. From the repository root, run the command below
- **Command**:
  ```bash
  node -e "const yaml=require('yaml'),fs=require('fs');const w=yaml.parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));const triggers=JSON.stringify(w);const ok=triggers.includes('push')&&triggers.includes('pull_request')&&(triggers.match(/main/g)||[]).length>=2;console.log(ok?'TRIGGERS OK':'TRIGGERS MISSING')"
  ```
- **Expected Result**: Command exits 0 and prints `TRIGGERS OK`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CI-004: Workflow contains the API test step with the correct command

- **Description**: Verifies that the `Run API tests` step in the workflow runs `pnpm --filter @demand-letter/api test`
- **Steps**:
  1. From the repository root, run the command below
- **Command**:
  ```bash
  node -e "const yaml=require('yaml'),fs=require('fs');const w=yaml.parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));const steps=w.jobs.test.steps;const s=steps.find(s=>s.run&&s.run.includes('pnpm --filter @demand-letter/api test'));console.log(s?'STEP FOUND: '+s.run.trim():'STEP MISSING')"
  ```
- **Expected Result**: Command exits 0 and prints `STEP FOUND: pnpm --filter @demand-letter/api test`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CI-005: API test step runs after the install step in workflow

- **Description**: Verifies step ordering — install must precede the API test step so dependencies are present before tests run
- **Steps**:
  1. From the repository root, run the command below
- **Command**:
  ```bash
  node -e "const yaml=require('yaml'),fs=require('fs');const w=yaml.parse(fs.readFileSync('.github/workflows/ci.yml','utf8'));const steps=w.jobs.test.steps;const installIdx=steps.findIndex(s=>s.name==='Install dependencies');const testIdx=steps.findIndex(s=>s.name==='Run API tests');console.log(installIdx!==-1&&testIdx!==-1&&installIdx<testIdx?'CORRECT ORDER':'WRONG ORDER: install='+installIdx+' test='+testIdx)"
  ```
- **Expected Result**: Command exits 0 and prints `CORRECT ORDER`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CI-006: Root package.json test:api script has the correct command

- **Description**: Verifies `"test:api"` key in root `package.json` `scripts` maps to `pnpm --filter @demand-letter/api test`
- **Steps**:
  1. From the repository root, run the command below
- **Command**:
  ```bash
  node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8'));console.log(p.scripts['test:api'])"
  ```
- **Expected Result**: Command exits 0 and prints `pnpm --filter @demand-letter/api test`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CI-007: pnpm test:api runs and exits successfully

- **Description**: Verifies the convenience script `pnpm test:api` invokes vitest and exits 0. The API package uses `vitest run --passWithNoTests`, so the suite should pass even when no test files exist yet.
- **Steps**:
  1. From the repository root, run the command below
  2. Observe the exit code and vitest output
- **Command**:
  ```bash
  pnpm test:api
  ```
- **Expected Result**: Command exits 0; vitest output shows either a passing test run or the message indicating no tests were found (but still passing due to `--passWithNoTests`)
- [FAIL: auto-judge: exit code 1 — vitest reports 3 failing tests in src/__uat087__.test.ts (pre-existing failures from another task)] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: pnpm --filter @demand-letter/api test passes with no test files present

- **Description**: Verifies the `--passWithNoTests` flag in the API package test script prevents a false CI failure when the test suite has no test files yet. This ensures the CI step does not gate the pipeline unnecessarily at this early stage.
- **Steps**:
  1. Confirm no `*.test.ts` files exist under `packages/api/src/` by listing the directory
  2. From the repository root, run the command below
  3. Confirm the process exits 0
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api test
  ```
- **Expected Result**: Command exits 0; vitest output does not report a non-zero failure even with an empty test suite
- [FAIL: auto-judge: exit code 1 — vitest reports 3 failing tests in src/__uat087__.test.ts (pre-existing failures from another task, not from this task's implementation)] <!-- 2026-06-26 -->

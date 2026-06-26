---
id: UAT-085
title: "UAT: Add Vitest and Mock Libraries to packages/api devDeps"
status: passed
task: TASK-085
created: 2026-06-26
updated: 2026-06-26
---

# UAT-085 — UAT: Add Vitest and Mock Libraries to packages/api devDeps

implements::[[TASK-085]]

> **Source task**: [[TASK-085]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Working directory is the monorepo root (`demand-letter/`)
- [ ] `pnpm install` has been run at the repo root

---

## Test Cases

### UAT-STATIC-001: Five devDependencies present in packages/api/package.json

- **Description**: Verifies that all five required testing devDependencies (`vitest`, `@vitest/coverage-v8`, `aws-sdk-client-mock`, `aws-sdk-client-mock-vitest`, `vitest-mock-extended`) appear in `packages/api/package.json` under `devDependencies`.
- **Steps**:
  1. From the repo root, run the command below.
- **Command**:
  ```bash
  node -e "const p=require('./packages/api/package.json');const required=['vitest','@vitest/coverage-v8','aws-sdk-client-mock','aws-sdk-client-mock-vitest','vitest-mock-extended'];const missing=required.filter(d=>!p.devDependencies[d]);if(missing.length){process.stderr.write('FAIL — Missing devDependencies: '+missing.join(', ')+'\n');process.exit(1);}console.log('PASS: all 5 devDependencies present: '+required.join(', '));"
  ```
- **Expected Result**: Command exits 0 and prints `PASS: all 5 devDependencies present: vitest, @vitest/coverage-v8, aws-sdk-client-mock, aws-sdk-client-mock-vitest, vitest-mock-extended`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-STATIC-002: test and test:watch scripts present in packages/api/package.json

- **Description**: Verifies that `packages/api/package.json` contains a `test` script invoking `vitest run` (with `--passWithNoTests`) and a `test:watch` script invoking `vitest`.
- **Steps**:
  1. From the repo root, run the command below.
- **Command**:
  ```bash
  node -e "const p=require('./packages/api/package.json');const s=p.scripts;if(!s.test||!s['test:watch']){process.stderr.write('FAIL — Missing scripts. test: '+s.test+', test:watch: '+s['test:watch']+'\n');process.exit(1);}if(!s.test.includes('vitest run')){process.stderr.write('FAIL — test script does not invoke vitest run: '+s.test+'\n');process.exit(1);}if(!s['test:watch'].startsWith('vitest')){process.stderr.write('FAIL — test:watch script does not start with vitest: '+s['test:watch']+'\n');process.exit(1);}console.log('PASS — test: '+s.test+' | test:watch: '+s['test:watch']);"
  ```
- **Expected Result**: Command exits 0 and prints something like `PASS — test: vitest run --passWithNoTests | test:watch: vitest`
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CLI-001: pnpm --filter @demand-letter/api test exits 0

- **Description**: Verifies that running the `test` script via pnpm exits 0. With no test files present, vitest must exit cleanly (the `--passWithNoTests` flag enables this).
- **Steps**:
  1. From the repo root, run the command below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api test
  ```
- **Expected Result**: Process exits 0. Vitest output may say "No test files found" or similar — that is acceptable. No error exit code.
- [x] Pass <!-- 2026-06-26 -->

---

### UAT-CLI-002: pnpm --filter @demand-letter/api typecheck exits 0

- **Description**: Verifies that adding the five devDependencies and their types does not introduce TypeScript errors in `packages/api`.
- **Steps**:
  1. From the repo root, run the command below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api typecheck
  ```
- **Expected Result**: Process exits 0. No TypeScript errors printed to stderr.
- [x] Pass <!-- 2026-06-26 -->

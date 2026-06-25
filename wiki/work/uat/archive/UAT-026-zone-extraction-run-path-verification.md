---
id: UAT-026
title: "UAT: Zone Extraction Run-Path Field and DOCX Round-Trip Verification"
status: passed
task: TASK-026
created: 2026-06-24
updated: 2026-06-24
---

# UAT-026 — UAT: Zone Extraction Run-Path Field and DOCX Round-Trip Verification

implements::[[TASK-026]]

> **Source task**: [[TASK-026]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Monorepo dependencies installed (`pnpm install`)
- [ ] `tsx ^4.0.0` present in `packages/api/devDependencies`
- [ ] Pat Donahue DOCX present at `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx`
- [ ] `packages/api/src/lib/docx-types.ts` exports `OoxmlRun` with the `runPath` field
- [ ] `packages/api/src/lib/docx-parser.ts` exports `parseDocxToZones`
- [ ] `packages/api/scripts/verify-zone-extraction.ts` exists

---

## Test Cases

### UAT-STATIC-001: OoxmlRun interface includes runPath field

- **File**: `packages/api/src/lib/docx-types.ts`
- **Description**: Verify that `OoxmlRun` declares a `runPath` field typed as `{ paragraphIndex: number; runIndex: number }`.
- **Steps**:
  1. Search the file for the `runPath` field declaration.
  ```bash
  grep -n "runPath" packages/api/src/lib/docx-types.ts
  ```
- **Expected Result**: At least one line containing `runPath` with the shape `{ paragraphIndex: number; runIndex: number }` (or equivalent TypeScript notation).
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-002: parseDocxToZones populates runPath in returned runs

- **File**: `packages/api/src/lib/docx-parser.ts`
- **Description**: Verify that the parser's `runs.map()` callback explicitly sets `runPath: { paragraphIndex: zoneIndex, runIndex }` on every returned run object.
- **Steps**:
  1. Search for the `runPath` assignment in the parser.
  ```bash
  grep -n "runPath" packages/api/src/lib/docx-parser.ts
  ```
- **Expected Result**: A line containing `runPath: { paragraphIndex: zoneIndex, runIndex }` (or equivalent) is present inside the `rawRuns.map` callback.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-003: TypeScript typecheck passes with zero errors

- **Description**: Confirm that adding `runPath` to `OoxmlRun` and populating it in the parser introduces no type errors across the monorepo.
- **Steps**:
  1. Run the monorepo-wide typecheck:
  ```bash
  pnpm --filter @demand-letter/api typecheck
  ```
- **Expected Result**: Command exits 0 with zero TypeScript errors reported for `packages/api`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-004: Verification script file exists at expected path

- **Description**: Confirm the verification script was created at the path the task specifies.
- **Steps**:
  1. Check for the script's existence:
  ```bash
  test -f packages/api/scripts/verify-zone-extraction.ts && echo "EXISTS" || echo "MISSING"
  ```
- **Expected Result**: Output is `EXISTS`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-STATIC-005: tsx devDependency present in api package

- **Description**: Confirm `tsx` is declared in `packages/api/package.json` devDependencies so the script runner is available without global install.
- **Steps**:
  1. Inspect the devDependencies:
  ```bash
  grep -n '"tsx"' packages/api/package.json
  ```
- **Expected Result**: A line matching `"tsx": "^4.0.0"` (or a compatible semver range) is present.
- [x] Pass <!-- 2026-06-24 -->

### UAT-CLI-001: Verification script runs and reports ≥ 20 zones from Pat Donahue DOCX

- **Description**: Execute the verification script against the real Pat Donahue DOCX and confirm the parser extracts at least 20 zones.
- **Steps**:
  1. From the monorepo root, run:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | head -5
  ```
- **Expected Result**: First line of output matches `Total zones: N` where N is an integer ≥ 20 (e.g. `Total zones: 87`).
- [x] Pass <!-- 2026-06-24 -->

### UAT-CLI-002: Verification script reports 30 pass, 0 fail

- **Description**: The script checks the first 30 zones for `runPath` integrity, `textContent` consistency, and `bold`/`italic` type correctness. All must pass.
- **Steps**:
  1. Run the full verification script:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1
  ```
- **Expected Result**: Output contains the line `Checked 30 zones: 30 pass, 0 fail`. Script exits with code 0 (no `process.exit(1)` triggered).
- [x] Pass <!-- 2026-06-24 -->

### UAT-CLI-003: Verification script prints "All assertions passed."

- **Description**: The terminal assertion block in the script must run, confirming no early `process.exit(1)` was triggered by the zone or run checks.
- **Steps**:
  1. Run the verification script and grep for the terminal message:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep "All assertions passed"
  ```
- **Expected Result**: Output is exactly `All assertions passed.`
- [x] Pass <!-- 2026-06-24 -->

### UAT-UNIT-001: runPath.paragraphIndex equals zone.zoneIndex for every run

- **Description**: Per the acceptance criteria, `run.runPath.paragraphIndex` must equal the `zoneIndex` of the containing zone for all 30 sampled zones.
- **Steps**:
  1. Run the verification script (output from step 1 already covers this assertion — the script checks `run.runPath.paragraphIndex !== zone.zoneIndex` and emits a FAIL line if mismatched):
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep -E "FAIL|pass, 0 fail"
  ```
- **Expected Result**: No `FAIL` lines appear. The summary line reads `30 pass, 0 fail`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-UNIT-002: runPath.runIndex equals run.runIndex for every run

- **Description**: `run.runPath.runIndex` must equal `run.runIndex` (the 0-based position of the run within its paragraph) for all sampled runs.
- **Steps**:
  1. Same command as UAT-UNIT-001 — the script already validates this assertion:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep -E "runPath.runIndex|pass, 0 fail"
  ```
- **Expected Result**: No `FAIL` lines contain `runPath.runIndex mismatch`. Summary shows `30 pass, 0 fail`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-UNIT-003: textContent equals concatenation of run texts for every zone

- **Description**: `zone.textContent` must equal `zone.runs.map(r => r.text).join('')` — the parser computes this as a convenience field and the script asserts it.
- **Steps**:
  1. Run the verification and check for textContent mismatch lines:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep -E "textContent|pass, 0 fail"
  ```
- **Expected Result**: No `FAIL` lines contain `textContent mismatch`. Summary shows `30 pass, 0 fail`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-UNIT-004: bold and italic are boolean on every run

- **Description**: `run.bold` and `run.italic` must be `boolean` (not `undefined`, not `null`, not a number). The parser sets `bold = rPr?.['w:b'] !== undefined` which always returns a boolean.
- **Steps**:
  1. Run the verification and check for bold/italic type failures:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep -E "bold/italic|pass, 0 fail"
  ```
- **Expected Result**: No `FAIL` lines contain `bold/italic not boolean`. Summary shows `30 pass, 0 fail`.
- [x] Pass <!-- 2026-06-24 -->

### UAT-UNIT-005: Sample zone 5 printed in JSON with correct shape

- **Description**: The script prints a JSON dump of `zones[5]` for visual inspection. The output must contain the expected top-level keys of `OoxmlZone` and each run must have a `runPath` key.
- **Steps**:
  1. Run the script and capture the JSON block:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep -A 40 "Sample zone 5:"
  ```
- **Expected Result**: JSON output contains `"zoneIndex"`, `"runs"`, `"textContent"`, and at least one run entry containing `"runPath"` with `"paragraphIndex"` and `"runIndex"` sub-fields.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-001: zoneIndex is a number (not undefined) for all zones

- **Description**: The script checks `typeof zone.zoneIndex !== 'number'` before all other assertions. If `zoneIndex` were `undefined` (e.g. parser bug), this gate would fire. Confirm it never does.
- **Steps**:
  1. Run the verification and look for zoneIndex failures:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep "zoneIndex not a number"
  ```
- **Expected Result**: No output (zero matches). The zoneIndex type gate never fires.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-002: Parser handles paragraphs with zero runs without crashing

- **Description**: The Pat Donahue DOCX contains empty paragraphs (spacer lines) with no `<w:r>` children. These should produce zones with `runs: []` and `textContent: ""` without throwing or skipping the zone.
- **Steps**:
  1. Run the script and check total zone count is ≥ 20 (empty-paragraph zones are included in the count):
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | head -1
  ```
  2. Verify no unhandled exception appears in the output:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts 2>&1 | grep -i "error\|throw\|uncaught"
  ```
- **Expected Result**: (1) `Total zones: N` with N ≥ 20. (2) No error/throw/uncaught lines. Script exits 0.
- [x] Pass <!-- 2026-06-24 -->

### UAT-EDGE-003: Script exit code is 0 on full success

- **Description**: The script calls `process.exit(1)` on any assertion failure. When all assertions pass, the process must exit with code 0.
- **Steps**:
  1. Run the script and capture its exit code:
  ```bash
  pnpm --filter @demand-letter/api exec tsx scripts/verify-zone-extraction.ts; echo "Exit: $?"
  ```
- **Expected Result**: The last line of output is `Exit: 0`.
- [x] Pass <!-- 2026-06-24 -->

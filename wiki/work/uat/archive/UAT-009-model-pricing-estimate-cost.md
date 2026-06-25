---
id: UAT-009
title: "UAT: MODEL_PRICING Map and estimateCostUsd() Utility"
status: passed
task: TASK-009
created: 2026-06-23
updated: 2026-06-23
---

# UAT-009 — UAT: MODEL_PRICING Map and estimateCostUsd() Utility

implements::[[TASK-009]]

> **Source task**: [[TASK-009]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] Repo dependencies installed: `pnpm install` from repo root
- [ ] `pnpm dlx tsx` resolves (verified in CI: tsx v4.22.4)
- [ ] `packages/api/src/lib/ai.ts` exists and is not empty

---

## Test Cases

### UAT-UNIT-001: Sonnet 4.6 cost — happy path with known values

- **Description**: Verifies the canonical example from the task spec: 1000 input tokens + 500 output tokens for Sonnet 4.6 returns exactly `0.0105`.
- **Steps**:
  1. No server needed — runs via inline `pnpm dlx tsx --eval`.
  2. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; const result = estimateCostUsd('anthropic.claude-sonnet-4-6', 1000, 500); if (result !== 0.0105) { console.error('FAIL: expected 0.0105 got ' + result); process.exit(1); } console.log('PASS:', result);"
  ```
- **Expected Result**: Prints `PASS: 0.0105` and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UNIT-002: Haiku 4.5 cost — happy path

- **Description**: Verifies Haiku 4.5 pricing (0.8 input / 4.0 output per MTok) computes correctly for 2000 input + 1000 output tokens → expected `0.0056`.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; const result = estimateCostUsd('anthropic.claude-haiku-4-5-20251001', 2000, 1000); if (result !== 0.0056) { console.error('FAIL: expected 0.0056 got ' + result); process.exit(1); } console.log('PASS:', result);"
  ```
- **Expected Result**: Prints `PASS: 0.0056` and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UNIT-003: Zero-token call returns 0

- **Description**: Both token counts being 0 must return exactly 0 (not NaN, not undefined) for a known model.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; const result = estimateCostUsd('anthropic.claude-sonnet-4-6', 0, 0); if (result !== 0) { console.error('FAIL: expected 0 got ' + result); process.exit(1); } console.log('PASS:', result);"
  ```
- **Expected Result**: Prints `PASS: 0` and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UNIT-004: Large token counts — 1 million each

- **Description**: At 1M input + 1M output for Sonnet 4.6: cost = 1×$3 + 1×$15 = `18`. Verifies no floating-point overflow or precision loss at scale.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; const result = estimateCostUsd('anthropic.claude-sonnet-4-6', 1000000, 1000000); if (result !== 18) { console.error('FAIL: expected 18 got ' + result); process.exit(1); } console.log('PASS:', result);"
  ```
- **Expected Result**: Prints `PASS: 18` and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UNIT-005: Result is rounded to exactly 6 decimal places

- **Description**: The implementation uses `parseFloat(cost.toFixed(6))`. Verifies that a result with more than 6 decimal places in the raw float is correctly rounded, not truncated and not a longer float string.
- **Steps**:
  1. Use an input/output combo that produces a repeating decimal before rounding. 1 input token + 1 output token for Sonnet 4.6 = (1/1M)×3 + (1/1M)×15 = 0.000003 + 0.000015 = `0.000018` exactly — a clean 6-place result. Use 3 input + 7 output for Haiku 4.5 = 3/1M×0.8 + 7/1M×4.0 = 0.0000024 + 0.000028 = 0.0000304 exactly. Verify the return type is `number` and the string form has ≤6 decimal places.
  2. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; const result = estimateCostUsd('anthropic.claude-haiku-4-5-20251001', 3, 7); const asStr = result.toFixed(10); const decimalPart = asStr.split('.')[1].replace(/0+$/, ''); if (decimalPart.length > 6) { console.error('FAIL: more than 6 significant decimal places: ' + result); process.exit(1); } if (typeof result !== 'number') { console.error('FAIL: not a number, got ' + typeof result); process.exit(1); } console.log('PASS:', result);"
  ```
- **Expected Result**: Prints `PASS: 0.0000304` (or fewer sig figs) and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-001: Unknown model ID returns 0

- **Description**: When `modelId` is not present in `MODEL_PRICING`, `estimateCostUsd()` must return `0` (not throw, not return NaN) so the audit log write can proceed.
- **Steps**:
  1. Run the command below from the repo root.
  2. A `console.warn` line is expected on stderr — that is correct behavior, not a failure.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; const result = estimateCostUsd('some.unknown.model-id', 5000, 2000); if (result !== 0) { console.error('FAIL: expected 0 got ' + result); process.exit(1); } console.log('PASS:', result);"
  ```
- **Expected Result**: Prints a `[ai] No pricing found for model "some.unknown.model-id" — recording $0` warning to stderr, then prints `PASS: 0` to stdout and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-002: Unknown model ID emits the correct console.warn message

- **Description**: Verifies the exact warn format specified in the implementation: `[ai] No pricing found for model "<modelId>" — recording $0`. This message will be read by TASK-010's audit-log integration.
- **Steps**:
  1. Run the command below from the repo root — captures stderr.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { estimateCostUsd } from './packages/api/src/lib/ai.ts'; estimateCostUsd('bad-model', 100, 100);" 2>&1 | grep -c '\[ai\] No pricing found for model "bad-model" — recording \$0'
  ```
- **Expected Result**: Prints `1` (grep found exactly one matching line) and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UNIT-006: MODEL_PRICING map is exported and contains both required model IDs

- **Description**: The `MODEL_PRICING` constant must be a named export from `packages/api/src/lib/ai.ts` and must contain keys for both Sonnet 4.6 and Haiku 4.5 with the specified USD rates.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm dlx tsx --eval "import { MODEL_PRICING } from './packages/api/src/lib/ai.ts'; const sonnet = MODEL_PRICING['anthropic.claude-sonnet-4-6']; const haiku = MODEL_PRICING['anthropic.claude-haiku-4-5-20251001']; if (!sonnet || sonnet.inputPerMTok !== 3.0 || sonnet.outputPerMTok !== 15.0) { console.error('FAIL: Sonnet 4.6 pricing wrong:', sonnet); process.exit(1); } if (!haiku || haiku.inputPerMTok !== 0.8 || haiku.outputPerMTok !== 4.0) { console.error('FAIL: Haiku 4.5 pricing wrong:', haiku); process.exit(1); } console.log('PASS: sonnet', sonnet, 'haiku', haiku);"
  ```
- **Expected Result**: Prints `PASS: sonnet { inputPerMTok: 3, outputPerMTok: 15 } haiku { inputPerMTok: 0.8, outputPerMTok: 4 }` and exits 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-UNIT-007: TypeScript compilation passes with zero errors

- **Description**: `ai.ts` must typecheck cleanly. The entire `@demand-letter/api` package (and the monorepo) must compile without errors.
- **Steps**:
  1. Run the command below from the repo root.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: Command exits 0 with no TypeScript diagnostic errors printed.
- [x] Pass <!-- 2026-06-23 -->

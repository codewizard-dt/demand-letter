---
id: UAT-054
title: "UAT: Fail-closed detection policy and log scrubbing in SNS Textract handler"
status: passed
task: TASK-054
created: 2026-06-25
updated: 2026-06-25
---

# UAT-054 — UAT: Fail-closed detection policy and log scrubbing in SNS Textract handler

implements::[[TASK-054]]

> **Source task**: [[TASK-054]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] The project has been built or typechecked (`pnpm --filter @demand-letter/api typecheck` passes)
- [ ] `packages/api/src/handlers/sns-textract-completion.ts` is accessible for source inspection

---

## Test Cases

### UAT-STATIC-001: Fail-closed comment is present above detectPhi call

- **Scenario**: The handler source must contain the explicit fail-closed policy comment immediately before `detectPhi`.
- **Description**: Verifies that the comment `// Fail-closed: if detection throws, block is NOT inserted (error surfaces via outer catch)` exists directly above the `detectPhi` call, documenting the intent for future readers.
- **Steps**:
  1. Open `packages/api/src/handlers/sns-textract-completion.ts`
  2. Locate the `for (const r of results)` loop body
  3. Confirm the line immediately preceding `const phiEntities = await detectPhi(r.text);` is:
     `// Fail-closed: if detection throws, block is NOT inserted (error surfaces via outer catch)`
- **Expected Result**: The comment is present on the line directly before the `detectPhi` call. No inner `try/catch` wraps the detection calls.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: detectPhi and detectPii calls are inside the outer try block (no inner swallowing catch)

- **Scenario**: Errors from `detectPhi()` or `detectPii()` must propagate to the outer `catch` — they must not be wrapped in a separate try/catch that swallows the error.
- **Description**: Verifies the fail-closed structural guarantee: if detection throws, the outer catch fires and `sourceFile.status` is set to `'error'`, ensuring no block is inserted.
- **Steps**:
  1. Open `packages/api/src/handlers/sns-textract-completion.ts`
  2. Find the outer `try { ... } catch (e) { ... }` block that updates `sourceFile.status = 'error'`
  3. Confirm `detectPhi(r.text)` and `detectPii(r.text)` calls appear **inside** that outer `try` block
  4. Confirm there is **no** inner `try/catch` wrapping the `detectPhi` or `detectPii` calls
  5. Confirm the outer `catch` updates `sourceFile` to `status: 'error'` and does **not** call `prisma.block.createMany`
- **Expected Result**: Both detection calls are inside the outer `try`. No inner catch. The outer catch only sets `errorMessage` on the sourceFile — it does not insert blocks. This is the correct fail-closed behavior.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: redactText is imported in the handler

- **Scenario**: The handler must import `redactText` from `'../lib/redact-text'` to establish the log-scrubbing pattern.
- **Description**: Verifies the import is present so that future log additions have `redactText` available and the module dependency is declared.
- **Steps**:
  1. Open `packages/api/src/handlers/sns-textract-completion.ts`
  2. Inspect the import block at the top of the file
  3. Confirm a line matching `import { redactText } from '../lib/redact-text';` is present
- **Expected Result**: The import line is present. TypeScript compilation (`pnpm --filter @demand-letter/api typecheck`) passes with zero errors.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: No console call emits raw block text

- **Scenario**: Log scrubbing compliance — no `console.log`, `console.error`, or `console.warn` call in the handler may include block text variables (`r.text`, `block.text`, or similar).
- **Description**: Verifies that the audit found zero unsafe log lines. The only `console.error` in the file uses `textractJobId` (a job ID string), which contains no PHI/PII.
- **Steps**:
  1. Open `packages/api/src/handlers/sns-textract-completion.ts`
  2. Find all `console.log`, `console.error`, and `console.warn` calls
  3. For each call, confirm the interpolated variables do NOT include `r.text`, `block.text`, or any variable that holds Textract-extracted text
  4. Confirm the only `console.error` call is:
     `` console.error(`No SourceFile found for Textract job ${textractJobId}`) ``
     and that `textractJobId` is a job identifier string — not block content
- **Expected Result**: Zero log calls include raw block text. The sole `console.error` is safe (job ID only). No wrapping with `redactText(value, [])` was needed because no unsafe calls existed.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: detectPhi throwing does not insert blocks into DB

- **Scenario**: If `detectPhi` throws (e.g. Comprehend Medical service unavailable), the handler must set `sourceFile.status = 'error'` and must NOT persist any blocks for that source file.
- **Description**: Validates the fail-closed structural guarantee at the logic level by reading the handler's catch path.
- **Steps**:
  1. Open `packages/api/src/handlers/sns-textract-completion.ts`
  2. Trace the code path when `detectPhi(r.text)` throws an exception:
     - The `await detectPhi(r.text)` line is inside the outer `try`
     - The exception propagates immediately, exiting the `for (const r of results)` loop
     - The outer `catch (e)` fires
     - `blockData.push(...)` is never reached, so `blockData` remains empty or partially filled
     - `prisma.block.createMany` is inside the `if (blockData.length > 0)` guard — **but** more importantly, the `catch` block runs instead of the success path, so `createMany` is never called for this record
     - The `catch` calls `prisma.sourceFile.update({ data: { status: 'error', errorMessage: (e as Error).message } })`
  3. Confirm the `catch` block does NOT call `prisma.block.createMany`
  4. Confirm the `catch` block does NOT call `prisma.sourceFile.update({ data: { status: 'complete' } })`
- **Expected Result**: The catch block only updates `sourceFile` to `error` status. Block insertion cannot occur because the catch path never reaches the `createMany` call.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-002: detectPii throwing does not insert blocks into DB

- **Scenario**: Same fail-closed guarantee as UAT-EDGE-001 but for `detectPii` throwing.
- **Description**: Verifies `detectPii` is equally covered by the outer try/catch — since it follows `detectPhi` in the same `for` loop body with no intermediate catch.
- **Steps**:
  1. Open `packages/api/src/handlers/sns-textract-completion.ts`
  2. Locate `const piiEntities = await detectPii(r.text);`
  3. Confirm it is inside the outer `try` block (same scope as `detectPhi`)
  4. Confirm no try/catch wraps it independently
  5. Confirm an exception here follows the same path as described in UAT-EDGE-001
- **Expected Result**: `detectPii` throwing causes identical fail-closed behavior: `sourceFile.status = 'error'`, zero blocks inserted.
- [x] Pass <!-- 2026-06-25 -->

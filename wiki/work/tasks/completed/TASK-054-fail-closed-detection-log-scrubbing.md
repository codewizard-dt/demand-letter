---
id: TASK-054
title: "Fail-closed detection policy and log scrubbing in SNS Textract handler"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-052, TASK-053]
blocks: [TASK-057]
parallel_safe_with: [TASK-057]
uat: "[[UAT-054]]"
tags: [compliance, hipaa, error-handling, logging, lambda]
---

# TASK-054 — Fail-closed detection policy and log scrubbing in SNS Textract handler

implements::[[ROADMAP-005]]

## Objective

Enforce two compliance controls in `sns-textract-completion.ts`: (1) **fail-closed** — if `detectPhi` or `detectPii` throws, the block must NOT be inserted into the DB; the error must be surfaced to the caller (no silent skip); (2) **log scrubbing** — the handler must not write raw block text to CloudWatch; any log line that includes extracted text must pass through `redactText()` first.

## Approach

Currently the handler has an outer `try/catch` per `record` that marks `sourceFile.status = 'error'` on exception. The detectPhi/detectPii calls (added in TASK-051/052) already propagate errors — but an explicit comment and test confirm the intent. For log scrubbing: audit all `console.error`/`console.log` calls in the handler; ensure none include `r.text` or `block.text` directly. If any do, wrap with `redactText()`.

## Steps

### 1. Verify fail-closed behaviour in sns-textract-completion.ts  <!-- agent: general-purpose -->

- [x] Open `packages/api/src/handlers/sns-textract-completion.ts` <!-- Completed: 2026-06-25 -->
- [x] Confirm the `for...of` loop over `results` is inside the outer `try {}` block (added by TASK-051/052). If it is, errors from `detectPhi()`/`detectPii()` will bubble up to the outer catch, which marks `sourceFile` as `'error'` — block insertion does NOT proceed. This is the correct fail-closed behaviour. <!-- Completed: 2026-06-25 -->
- [x] If the detection calls are wrapped in their own try/catch that swallows errors, remove that inner try/catch so errors propagate. <!-- Completed: 2026-06-25 — no inner try/catch found, errors already propagate correctly -->
- [x] Add a comment above the `detectPhi` call: `// Fail-closed: if detection throws, block is NOT inserted (error surfaces via outer catch)` <!-- Completed: 2026-06-25 -->

### 2. Audit and scrub all log calls  <!-- agent: general-purpose -->

- [x] Import `redactText` and `type RedactableEntity` from `'../lib/redact-text'` at the top of `sns-textract-completion.ts` <!-- Completed: 2026-06-25 — added import { redactText } from '../lib/redact-text' -->
- [x] Search for all `console.log`, `console.error`, `console.warn` calls in the file <!-- Completed: 2026-06-25 -->
- [x] For any call that includes a variable containing block text (e.g. `r.text`, `block.text`, `sourceFile.s3Key` used in error context), wrap the text portion with `redactText(value, [])` — passing an empty entities array simply returns the string unchanged for non-PHI content, but establishes the pattern <!-- Completed: 2026-06-25 — no such calls exist -->
- [x] Verify the existing `console.error(\`No SourceFile found for Textract job ${textractJobId}\`)` does NOT include block text — it is already safe; no change needed for it <!-- Completed: 2026-06-25 — confirmed safe -->

### 3. TypeScript verification  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/api typecheck` <!-- Completed: 2026-06-25 — zero errors -->
- [x] Confirm zero errors <!-- Completed: 2026-06-25 -->

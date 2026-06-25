---
id: UAT-051
title: "UAT: Detect PHI entities per block via ComprehendMedical DetectPHI"
status: passed
task: TASK-051
created: 2026-06-25
updated: 2026-06-25
---

# UAT-051 — UAT: Detect PHI entities per block via ComprehendMedical DetectPHI

implements::[[TASK-051]]

> **Source task**: [[TASK-051]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] AWS credentials with `comprehendmedical:DetectPHI` permission are available in the Lambda execution environment
- [ ] SAM stack is deployed (`sam deploy`) or running locally via `sam local start-api`
- [ ] A `SourceFile` record exists in the database with a known `textractJobId` and `status: 'processing'`
- [ ] Textract has completed analysis for the job (or a mock SNS event can be constructed)
- [ ] Database access is available to verify `Block` records and `SourceFile` status

---

## Test Cases

### UAT-INTEG-001: detectPhi module returns empty array for blank text

- **Component**: `packages/api/src/lib/comprehend-medical-client.ts` — `detectPhi()`
- **Description**: Verifies the guard clause — when `text.trim()` is empty, `detectPhi` returns `[]` immediately without calling AWS Comprehend Medical.
- **Steps**:
  1. In a local Node.js REPL or test harness, import `detectPhi` from the compiled module
  2. Call `detectPhi('')` and `detectPhi('   ')` (whitespace-only)
  3. Observe the return value of each call
- **Expected Result**: Both calls return `[]` without making any AWS API call (no AWS credentials or network required for this path)
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-INTEG-002: detectPhi module maps Comprehend Medical response to PhiEntity[]

- **Component**: `packages/api/src/lib/comprehend-medical-client.ts` — `detectPhi()`
- **Description**: Verifies that a non-empty text string triggers a real `DetectPHICommand` call and the result is correctly mapped to `PhiEntity[]` with fields `type`, `startOffset`, `endOffset`, `confidence`.
- **Steps**:
  1. Ensure AWS credentials are configured with `comprehendmedical:DetectPHI` permission
  2. In a local Node.js REPL or test harness, import `detectPhi`
  3. Call `detectPhi('Patient John Smith was seen on 01/15/2024 at 555-123-4567.')` (a string containing PHI)
  4. Inspect the returned array
- **Expected Result**:
  - Return value is `PhiEntity[]` (an array, possibly non-empty)
  - Each element has: `type` (string, e.g. `'NAME'`, `'DATE'`, `'PHONE_OR_FAX'`), `startOffset` (number ≥ 0), `endOffset` (number > startOffset), `confidence` (number between 0 and 1)
  - No element has `undefined` for any field (safe defaults `'UNKNOWN'`, `0`, `0`, `0` apply when AWS returns undefined)
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-INTEG-003: SNS handler calls detectPhi for each Textract block and stores blocks with phiOffsets: null

- **Component**: `packages/api/src/handlers/sns-textract-completion.ts`
- **Description**: Verifies the full integration — after a SUCCEEDED Textract SNS event is processed, `Block` records are created in the database with `phiOffsets` set to `null` (deferred storage), and the `SourceFile` status is updated to `complete`.
- **Steps**:
  1. Identify a `SourceFile` record with a valid `textractJobId` for a completed Textract job
  2. Publish (or simulate) an SNS message with body: `{ "JobId": "<textractJobId>", "Status": "SUCCEEDED" }` to the `SnsTextractCompletionFunction`
  3. Wait for the Lambda to complete (check CloudWatch logs or local SAM output)
  4. Query the database for `Block` records where `sourceFileId` matches the `SourceFile.id`
  5. Check the `SourceFile.status`
- **Expected Result**:
  - One `Block` record exists per Textract result block
  - Each `Block` has: `sourceFileId` set, `type` non-empty, `text` non-empty, `page` ≥ 1, `confidence` a number or null, `bbox` a JSON object, `phiOffsets` = `null`
  - `SourceFile.status` = `'complete'`
  - No errors in CloudWatch / Lambda output
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-INTEG-004: SNS handler processes blocks sequentially (for...of, not map)

- **Component**: `packages/api/src/handlers/sns-textract-completion.ts`
- **Description**: Verifies the refactor from `results.map(...)` to a sequential `for...of` loop — PHI detection is awaited per block, ensuring `phiEntitySets` and `blockData` arrays are populated with matching indices.
- **Steps**:
  1. Trigger the handler with a Textract job that produced at least 3 blocks
  2. Enable verbose logging in the handler or inspect CloudWatch logs for sequential PHI call traces
  3. Confirm that all blocks are processed before `createMany` is called
- **Expected Result**:
  - All blocks are stored (count in DB matches Textract block count)
  - No partial writes — either all blocks are created or none (single `createMany` call)
  - Handler does not throw; `SourceFile.status` = `'complete'`
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: SNS handler handles FAILED Textract status without calling detectPhi

- **Component**: `packages/api/src/handlers/sns-textract-completion.ts`
- **Description**: Verifies that when the SNS message contains `Status: 'FAILED'`, the handler marks the `SourceFile` as `error` and does NOT call `detectPhi` or create any `Block` records.
- **Steps**:
  1. Publish (or simulate) an SNS message: `{ "JobId": "<textractJobId>", "Status": "FAILED" }` targeting a known `SourceFile`
  2. Wait for Lambda completion
  3. Check `SourceFile.status` in the database
  4. Check that no new `Block` records were created for this `sourceFileId`
- **Expected Result**:
  - `SourceFile.status` = `'error'`
  - `SourceFile.errorMessage` = `'Textract job failed'`
  - Zero `Block` records created for this file
  - No `detectPhi` calls made
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: detectPhi error propagates and SNS handler marks SourceFile as error

- **Component**: `packages/api/src/handlers/sns-textract-completion.ts` + `detectPhi()`
- **Description**: Verifies fail-closed behavior — if `detectPhi` throws (e.g. due to missing IAM permission or Comprehend Medical service error), the handler's `catch` block catches it and marks the `SourceFile` as `error`.
- **Steps**:
  1. Temporarily remove the `comprehendmedical:DetectPHI` IAM permission from the Lambda role (or configure invalid credentials for ComprehendMedical)
  2. Trigger the handler with a SUCCEEDED Textract SNS event for a non-empty document
  3. Wait for Lambda completion
  4. Check `SourceFile.status` and `SourceFile.errorMessage`
- **Expected Result**:
  - `SourceFile.status` = `'error'`
  - `SourceFile.errorMessage` contains the AWS error message (e.g. `'AccessDeniedException'` or similar)
  - No `Block` records created for this file
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: IAM policy includes comprehendmedical:DetectPHI for SnsTextractCompletionFunction

- **Component**: `template.yaml` — `SnsTextractCompletionFunction` IAM policy
- **Description**: Verifies the SAM template grants `comprehendmedical:DetectPHI` permission to the Lambda function, preventing AccessDenied errors at runtime.
- **Steps**:
  1. Open `template.yaml`
  2. Locate the `SnsTextractCompletionFunction` resource (around line 468)
  3. Find its `Policies` → `Statement` section
- **Expected Result**:
  ```yaml
  - Effect: Allow
    Action:
      - textract:GetDocumentAnalysis
      - comprehendmedical:DetectPHI
    Resource: '*'
  ```
  Both actions appear in the same statement. The deployed Lambda execution role (in AWS IAM) reflects this permission after `sam deploy`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-004: @aws-sdk/client-comprehendmedical is present in package.json

- **Component**: `packages/api/package.json`
- **Description**: Verifies the SDK dependency was added correctly so the Lambda bundle includes the Comprehend Medical client.
- **Steps**:
  1. Open `packages/api/package.json`
  2. Check the `dependencies` section
- **Expected Result**:
  - `"@aws-sdk/client-comprehendmedical"` is listed in `dependencies` (not `devDependencies`)
  - Version is `"^3.0.0"` or similar
  - It appears alphabetically between `@aws-sdk/client-bedrock-runtime` and `@aws-sdk/client-s3`
- [x] Pass <!-- 2026-06-25 -->

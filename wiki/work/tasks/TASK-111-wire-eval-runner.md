---
id: TASK-111
title: "Wire eval runner to real handlers and add segmentation coverage"
status: todo
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: []
uat: ""
tags: [evals, testing, segmentation]
---

# TASK-111 — Wire eval runner to real handlers and add segmentation coverage

## Objective

The `evals/run_evals.ts` runner validates only YAML schema — all 53 golden cases show `schema_valid: pass` and `n/a` for every substantive check (`tool_selection`, `must_contain`, `source_citation`). A `// TODO: integrate with live system` stub sits where execution belongs. Additionally, `job-lifecycle.test.ts` seeds a pre-tagged `Template` record directly, bypassing the segmentation step entirely. This task wires the eval runner to actually invoke handlers (against a mocked or real stack), adds a golden eval covering the full upload→segment→gap-report pipeline, and adds an integration test that validates template segmentation without a pre-seeded Template.

## Approach

**Eval runner execution:** The simplest live-execution approach is to invoke Lambda handlers directly as Node functions (import and call `handler(event, context, cb)`) rather than spinning up SAM local. This avoids network overhead and keeps evals fast. The eval harness needs to construct synthetic `APIGatewayProxyEvent` payloads from each golden case's `query` field, call the handler, and compare the response against `must_contain` / `must_not_contain` assertions.

**Golden eval scope:** Add one new golden case (`gs-054.yaml`) covering `POST /jobs/{id}/templates/segment` — given a job with an uploaded DOCX File in DB and S3, assert the response contains `templateId` and `slotCount >= 0`.

**Integration test gap:** Add a new `describe` block to `job-lifecycle.test.ts` that calls `postJobsTemplatesSegmentHandler` (once TASK-002 creates it) directly after upload, verifying `Template` + `TemplateSlot` DB records exist without any manual seed.

## Steps

### 1. Read the eval runner and understand the TODO scope  <!-- agent: Explore -->

- [ ] Read `evals/run_evals.ts` in full — understand what the `// TODO` stub expects
  - Locate the exact line(s) where execution would go
  - Note the `expected_tools`, `must_contain`, `must_not_contain` fields that need evaluation
- [ ] Read 3 representative golden cases (`evals/golden/gs-001.yaml`, `gs-018.yaml`, `gs-051.yaml`) to understand query/expected_tools/must_contain structure
- [ ] Read `evals/fixtures/pat-donahue-inputs.yaml` to understand fixture structure

### 2. Implement live execution in eval runner  <!-- agent: general-purpose -->

- [ ] In `evals/run_evals.ts`, replace the TODO stub with a `runEval(testCase)` function:
  - Map `testCase.tested_files[0]` to the relevant handler module (dynamic `import()` from `packages/api/src/handlers/`)
  - Construct a minimal `APIGatewayProxyEvent` from `testCase.query` (jobId from fixture, body from query)
  - Call `handler(event, mockContext, noop)` and capture the response
  - Check `must_contain` strings against `response.body`
  - Check `must_not_contain` strings are absent from `response.body`
  - Set `tool_selection`, `must_contain`, `must_not_contain`, `source_citation` result fields accordingly
- [ ] Mock dependencies that require live infrastructure:
  - Prisma: use `vitest-mock-extended` pattern from existing unit tests (`packages/api/src/handlers/*.test.ts`)
  - S3/Bedrock: use `aws-sdk-client-mock` already in devDependencies
- [ ] Add a `--live` flag to `evals/run_evals.ts` that enables real DB + S3 (mirrors integration test setup); default stays mock-only for CI
- [ ] Update `evals/results/latest.json` schema to support non-`n/a` result values

### 3. Add golden eval for template segmentation  <!-- agent: general-purpose -->

- [ ] Create `evals/golden/gs-054.yaml`:
  ```yaml
  id: gs-054
  description: "POST /jobs/{id}/templates/segment creates Template and TemplateSlot records from an uploaded DOCX"
  query: "Segment the template DOCX for job {jobId} and return templateId and slotCount"
  tested_files:
    - packages/api/src/handlers/post-jobs-templates-segment.ts
  expected_tools:
    - prisma.file.findFirst
    - s3.GetObjectCommand
    - enumerateSlots
    - prisma.template.create
  must_contain:
    - templateId
    - slotCount
  must_not_contain:
    - error
    - template_not_found
  ```
- [ ] Note: this eval can only be validated once TASK-002 creates the handler

### 4. Add integration test for template segmentation  <!-- agent: general-purpose -->

- [ ] In `packages/api/src/integration/job-lifecycle.test.ts`, add a new `describe` block after the existing "document ingestion" describe:
  ```
  describe('integration: template segmentation', () => {
    // Setup: create job, upload tagged DOCX to S3 via uploadToS3(), create File record in DB
    // Do NOT create a Template record (that's what we're testing)
    // Call: postJobsTemplatesSegmentHandler({ pathParameters: { id: jobId } }, ...)
    // Assert:
    //   - response.statusCode === 200
    //   - Template record exists in DB with s3KeyOriginal set
    //   - If the DOCX has {field} tags: s3KeyTagged is set and TemplateSlot records exist
    //   - If the DOCX has no {field} tags: s3KeyTagged is null, slotCount === 0
  })
  ```
- [ ] Import `handler as postJobsTemplatesSegmentHandler` from `../handlers/post-jobs-templates-segment`
  - This import depends on TASK-002 creating the handler; add a comment noting the dependency
- [ ] Use `taggedDocxBuffer` fixture from `./helpers/docx.ts` (has `{claimantName}` + `{medicalNarrative}`) to verify the slots-found path
- [ ] Use `plainDocxBuffer` fixture to verify the no-slots path

### 5. Update log and docs  <!-- agent: general-purpose -->

- [ ] Append to `wiki/log.md`: task creation entry
- [ ] Update `wiki/work/tasks/index.md` with TASK-001 entry

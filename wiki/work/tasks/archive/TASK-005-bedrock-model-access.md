---
id: TASK-005
title: "Bedrock Model Access — Verify Inference Profile and Smoke-Test"
status: done
created: 2026-06-23
updated: 2026-06-23
completed: 2026-06-23
depends_on: []
blocks: []
parallel_safe_with: [TASK-001, TASK-002, TASK-003, TASK-004, TASK-006, TASK-007]
uat: "[[UAT-005]]"
tags: [infra, bedrock, aws, model-access]
---

# TASK-005 — Bedrock Model Access — Verify Inference Profile and Smoke-Test

## Objective

Verify that the AWS account can invoke Claude Sonnet 4.6 via Amazon Bedrock, and ensure `.env.example` documents the correct **cross-region inference profile** model ID. As of October 2025, the Bedrock Model Access page has been retired — serverless foundation models are automatically enabled on all commercial accounts with no manual opt-in. However, Claude 4+ models **must** be invoked via an inference profile ID (e.g., `us.anthropic.claude-sonnet-4-6-20250929-v1:0`) — using the bare model ID returns a `ValidationException`.

## Approach

- No console steps needed for access — it is automatic.
- Confirm the correct inference profile ID via `aws bedrock list-inference-profiles`.
- Update `.env.example` with the `us.` prefixed profile ID (already partially set by an earlier run; the bare ID there is wrong).
- Run a one-shot `aws bedrock-runtime invoke-model` to verify the credential chain and model ID are correct end-to-end.

## Steps

### 1. Confirm the cross-region inference profile ID  <!-- agent: general-purpose -->

- [x] List available Claude Sonnet 4.6 inference profiles in `us-east-1`:
  ```sh
  aws bedrock list-inference-profiles \
    --region us-east-1 \
    --query 'inferenceProfileSummaries[?contains(inferenceProfileId, `claude-sonnet-4-6`)].{id:inferenceProfileId}' \
    --output table
  ```
  Expected output includes rows like `us.anthropic.claude-sonnet-4-6-20250929-v1:0` and/or `global.anthropic.claude-sonnet-4-6-20250929-v1:0`.
- [x] Note the exact versioned profile ID for use in Steps 2 and 3. Use the `us.` prefix variant for us-east-1 deployments. <!-- Completed: 2026-06-23 -->

### 2. Fix `.env.example` with the correct inference profile ID  <!-- agent: general-purpose -->

- [x] Edit `.env.example` at the project root — update the `BEDROCK_MODEL_ID` line:
  ```
  # Before (wrong — bare model ID not supported for on-demand throughput):
  BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-6-20250929-v1:0

  # After (correct — cross-region inference profile ID):
  BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6-20250929-v1:0
  ```
  Use the exact profile ID confirmed in Step 1 (the version suffix may differ if a newer profile is available). <!-- Completed: 2026-06-23 -->

### 3. Smoke-test invocation  <!-- agent: general-purpose -->

- [x] Run:
  ```sh
  aws bedrock-runtime invoke-model \
    --model-id us.anthropic.claude-sonnet-4-6-20250929-v1:0 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' \
    --cli-binary-format raw-in-base64-out \
    /tmp/bedrock-test.json \
    --region us-east-1
  ```
- [x] Confirm HTTP 200 and that `/tmp/bedrock-test.json` contains a `content` array with a text response. <!-- Completed: 2026-06-23 -->
- [x] If `AccessDeniedException`: the IAM identity needs `bedrock:InvokeModel` on `arn:aws:bedrock:*:*:inference-profile/*`. No `aws-marketplace` permissions are needed — the model access page retirement removed that requirement. <!-- Completed: 2026-06-23 -->

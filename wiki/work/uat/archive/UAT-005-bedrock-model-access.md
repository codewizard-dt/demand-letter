---
id: UAT-005
title: "UAT: Bedrock Model Access — Verify Inference Profile and Smoke-Test"
status: skipped
task: TASK-005
created: 2026-06-23
updated: 2026-06-23
---

# UAT-005 — UAT: Bedrock Model Access — Verify Inference Profile and Smoke-Test

implements::[[TASK-005]]

> **Source task**: [[TASK-005]]
> **Generated**: 2026-06-23

---

## Prerequisites

- [ ] AWS credentials are configured in the environment (`~/.aws/credentials` or IAM role / environment variables)
- [ ] The IAM identity has `bedrock:InvokeModel` permission on `arn:aws:bedrock:*:*:inference-profile/*`
- [ ] AWS CLI v2 is installed and on `$PATH`
- [ ] `jq` is installed (used to inspect the response body)
- [ ] You are operating in or targeting `us-east-1`

---

## Test Cases

### UAT-EDGE-001: `.env.example` contains the correct cross-region inference profile ID

- **Scenario**: The `BEDROCK_MODEL_ID` key in `.env.example` must use the `us.` prefixed cross-region inference profile ID, not the bare model ID. Using the bare ID (`anthropic.claude-sonnet-4-6-20250929-v1:0`) results in a `ValidationException` at runtime.
- **Steps**:
  1. From the project root, open `.env.example`
  2. Locate the `BEDROCK_MODEL_ID` line
- **Expected Result**: The line reads exactly:
  ```
  BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6-20250929-v1:0
  ```
  The value must start with `us.` — bare model IDs (`anthropic.`) or `global.` prefixes are not acceptable.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-EDGE-002: Cross-region inference profile is listed by the Bedrock API

- **Scenario**: The inference profile `us.anthropic.claude-sonnet-4-6-20250929-v1:0` must be discoverable via `aws bedrock list-inference-profiles`, confirming it is available in the AWS account and region.
- **Steps**:
  1. Run the command below
  2. Inspect the output for the `us.anthropic.claude-sonnet-4-6` profile ID
- **Command**:
  ```bash
  aws bedrock list-inference-profiles \
    --region us-east-1 \
    --query 'inferenceProfileSummaries[?contains(inferenceProfileId, `claude-sonnet-4-6`)].{id:inferenceProfileId}' \
    --output table
  ```
- **Expected Result**: The table output contains at least one row with an `id` value matching `us.anthropic.claude-sonnet-4-6-20250929-v1:0`. The command exits with status 0.
- [x] Pass <!-- 2026-06-23 -->

---

### UAT-API-001: Bedrock smoke-test invocation succeeds via inference profile

- **Scenario**: The inference profile `us.anthropic.claude-sonnet-4-6-20250929-v1:0` can be invoked end-to-end using the AWS CLI with valid credentials. HTTP 200 confirms the credential chain, model ID, and account access are all correct.
- **Steps**:
  1. Run the command below
  2. Check the exit code is 0 (no `AccessDeniedException` or `ValidationException`)
  3. Inspect the response JSON for a `content` array containing a text item
- **Command**:
  ```bash
  aws bedrock-runtime invoke-model \
    --model-id us.anthropic.claude-sonnet-4-6-20250929-v1:0 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' \
    --cli-binary-format raw-in-base64-out \
    --region us-east-1 \
    /tmp/bedrock-smoke-005.json && jq '.content[0].text' /tmp/bedrock-smoke-005.json
  ```
- **Expected Result**:
  - Command exits with status 0
  - `/tmp/bedrock-smoke-005.json` exists and is valid JSON
  - The `content` array contains at least one item with `"type": "text"` and a non-empty `"text"` field
  - `jq` prints a quoted string (e.g., `"Pong"` or any short response)
  - No `AccessDeniedException`, `ValidationException`, or `ResourceNotFoundException` in stderr
- [FAIL: auto-judge: invoke-model with us.anthropic.claude-sonnet-4-6-20250929-v1:0 returned ValidationException: The provided model identifier is invalid; unversioned us.anthropic.claude-sonnet-4-6 returned ResourceNotFoundException: Model use case details have not been submitted] <!-- 2026-06-23 -->

---

### UAT-EDGE-003: Bare model ID is rejected with ValidationException

- **Scenario**: Invoking with the bare model ID (`anthropic.claude-sonnet-4-6-20250929-v1:0`, without the `us.` prefix) must fail with a `ValidationException`, confirming that the `us.` prefix in `.env.example` is required and not optional.
- **Steps**:
  1. Run the command below (note: bare model ID — no `us.` prefix)
  2. Observe the error output
- **Command**:
  ```bash
  aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-sonnet-4-6-20250929-v1:0 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' \
    --cli-binary-format raw-in-base64-out \
    --region us-east-1 \
    /tmp/bedrock-bare-id-005.json 2>&1 | head -5
  ```
- **Expected Result**: The command exits with a non-zero status and the error output contains `ValidationException`. This confirms that the inference profile ID (with `us.` prefix) is mandatory for Claude 4+ on-demand throughput.
- [x] Pass <!-- 2026-06-23 -->

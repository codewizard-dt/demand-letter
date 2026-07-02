---
id: TASK-114
title: "Create or pass a Textract completion SNS topic ARN"
status: in-progress
created: 2026-07-01
updated: 2026-07-01
depends_on: []
blocks: [TASK-116]
parallel_safe_with: [TASK-113, TASK-115]
uat: ""
tags: [aws, textract, sns]
---

# TASK-114 — Create or pass a Textract completion SNS topic ARN

## Objective

Provide a valid SNS topic ARN for Textract completion callbacks so the SAM stack can wire `SnsTextractCompletionFunction` without template validation failures or manual guesswork at deploy time.

## Approach

Decide whether the topic should be created inside `template.yaml` or supplied as an external deploy parameter. Prefer the lowest-risk option that keeps the live deployment repeatable and compatible with the existing `TextractCompletionTopicArn` parameter.

## Steps

### 1. Choose topic ownership  <!-- agent: general-purpose -->

- [x] Inspect `template.yaml` resources around `TextractCompletionTopicArn` and `SnsTextractCompletionFunction`
- [x] Decide whether to create an `AWS::SNS::Topic` in the SAM template or require an external ARN deploy parameter
- [x] Document the chosen behavior in the task completion notes

<!-- Updated: 2026-07-01 17:54 -->

### 2. Implement the deployable ARN path  <!-- agent: general-purpose -->

- [x] If the topic is template-owned, add the SNS topic resource and update the function event to reference it
- [x] If the topic is externally owned, remove the invalid empty default and document the required deploy parameter
- [x] Ensure the topic path grants Textract completion events to invoke the existing Lambda handler

<!-- Updated: 2026-07-01 17:56 -->

### 3. Validate the template  <!-- agent: general-purpose -->

- [x] Run `sam validate --lint`
- [x] Confirm the SNS ARN warnings are gone

<!-- Updated: 2026-07-01 17:57 -->

## Completion Notes

### 1. Choose topic ownership

Chosen ownership path: require an externally owned SNS topic ARN as the deploy parameter `TextractCompletionTopicArn`.

Why: `template.yaml` already models `TextractCompletionTopicArn` as a required `String` parameter with no default, and `SnsTextractCompletionFunction` subscribes to that ARN through its SAM `SNS` event. Keeping the topic external is the lowest-risk path for this task section because it preserves the current template contract, avoids creating or replacing SNS infrastructure in this stack, and still lets SAM manage the Lambda subscription/invoke permission for the supplied topic ARN.

Files changed:

- `wiki/work/tasks/TASK-114-create-textract-completion-sns-arn.md`

### 2. Implement the deployable ARN path

The task continues on the externally owned topic path. `template.yaml` already satisfies the deployable ARN contract: `TextractCompletionTopicArn` is a required `String` parameter with no empty default, and `SnsTextractCompletionFunction` uses a SAM `SNS` event with `Topic: !Ref TextractCompletionTopicArn`.

Added deploy guidance to `samconfig.toml` documenting that deployments must supply `TextractCompletionTopicArn` through `sam deploy --parameter-overrides`.

The existing SAM `SNS` event is the invocation path for the external topic: SAM transforms it into the Lambda SNS subscription and invoke permission for the supplied topic ARN, so no template-owned topic resource is needed for this selected path.

Files changed:

- `samconfig.toml`
- `wiki/work/tasks/TASK-114-create-textract-completion-sns-arn.md`

### 3. Validate the template

Static gate: `sam validate --lint` completed successfully.

Output summary:

- `/Users/davidtaylor/Repositories/gauntlet/demand-letter/template.yaml is a valid SAM Template`

SNS ARN warnings: none were emitted by `sam validate --lint`; the previous SNS ARN warnings are gone.

Files changed:

- `wiki/work/tasks/TASK-114-create-textract-completion-sns-arn.md`

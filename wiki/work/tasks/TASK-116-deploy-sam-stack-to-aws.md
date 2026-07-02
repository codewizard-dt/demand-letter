---
id: TASK-116
title: "Deploy the SAM stack to AWS"
status: done
created: 2026-07-01
updated: 2026-07-01
depends_on: [TASK-113, TASK-114, TASK-115]
blocks: [TASK-117, TASK-118]
parallel_safe_with: []
uat: ""
tags: [aws, sam, api]
---

# TASK-116 — Deploy the SAM stack to AWS

## Objective

Build and deploy the existing AWS SAM application so the live REST API, WebSocket API, Lambda functions, RDS instance, S3 buckets, DynamoDB table, KMS key, and supporting resources exist in the target AWS account.

## Approach

Use the repo's SAM infrastructure as the production API path. Run a local build/validation sequence first, then deploy with explicit parameters from `TASK-115`. Capture CloudFormation outputs needed by later tasks.

## Steps

### 1. Build deployment artifacts  <!-- agent: general-purpose -->

- [x] Run the package build steps needed to populate `.build/handlers/` and the Prisma Lambda layer under `app/db/nodejs/`
- [x] Run `sam build` or the existing SAM preparation flow expected by `samconfig.toml`
- [x] Confirm `template.yaml` resolves all function `CodeUri` and layer paths

<!-- Updated: 2026-07-01 19:09 -->

### 2. Deploy the stack  <!-- agent: general-purpose -->

- [x] Run `sam deploy` with the target stage, VPC, private subnets, web origins, and Textract SNS input
- [x] Monitor the CloudFormation stack until it reaches a stable completed state
- [x] Capture REST API, WebSocket API, RDS endpoint, and documents bucket outputs

<!-- Updated: 2026-07-01 19:58 -->

### 3. Smoke-check API infrastructure  <!-- agent: general-purpose -->

- [x] Confirm deployed Lambda functions can start without missing environment variables
- [x] Check API Gateway routes for `/jobs` and the WebSocket stage
- [x] Record any deploy drift or manual AWS console steps needed for follow-up tasks

## Notes

### 2026-07-01 — Section 1 build deployment artifacts

Ran deployment artifact preparation without reading `.env`; Prisma generation used an explicit build-only `DATABASE_URL` value in the command environment.

- `pnpm --filter @demand-letter/db build` passed. Warning only: local Node is `v26.0.0` while package engines request `>=24 <25`.
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demand_letter_build pnpm --dir app/db exec prisma generate` passed.
- `node app/db/scripts/build-lambda-layer.mjs` passed and produced `app/db/nodejs/`.
- `pnpm --filter @demand-letter/server build` passed. Same Node engine warning.
- `node scripts/prepare-sam-local-build.mjs` passed and reported 36 functions plus `DbLayer` staged at `.aws-sam/build`.
- `sam build` passed and emitted `.aws-sam/build/` plus `.aws-sam/build/template.yaml`.
- Path verification passed: source `template.yaml` has 37 checked artifact paths with zero missing (`app/db/` once, `.build/handlers/` 36 times); built `.aws-sam/build/template.yaml` has 37 checked artifact paths with zero missing relative to `.aws-sam/build`.

### 2026-07-01 — Section 2 deploy blocked on database SSM parameters

Checked required production SSM parameter names before running `sam deploy` and did not read or print any secret values.

- Required by `template.yaml`: `/prod/demand-letter/db/url`, `/prod/demand-letter/db/username`, `/prod/demand-letter/db/password`, and `/prod/demand-letter/bedrock-model-id`.
- Existing before remediation: none of the four expected `/prod/demand-letter/...` parameters existed in `us-east-1`.
- Created the known non-secret String parameter `/prod/demand-letter/bedrock-model-id` with value `us.anthropic.claude-sonnet-4-5-20250929-v1:0`.
- Blocked before `sam deploy`: database URL, username, and password parameters are missing; these are database credentials/connection values and were not invented.
- CloudFormation status check: stack `demand-letter` does not exist in `us-east-1`, so there is no failed stack event or output set to capture.
- Intended deploy command shape once database parameters exist:
  `sam deploy --stack-name demand-letter --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --no-confirm-changeset --no-fail-on-empty-changeset --parameter-overrides Stage=prod VpcId=vpc-05d675a56f47ef466 PrivateSubnet1=subnet-05925fc8ff290a62c PrivateSubnet2=subnet-027279b7af8e18cf9 WebAppOrigin=https://main.d2qz3c6ux2u72z.amplifyapp.com WebAppOrigin2=https://main.d2qz3c6ux2u72z.amplifyapp.com TextractCompletionTopicArn=arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion`

### 2026-07-01 — Section 2 blocker resolved and stack deployed

Resolved the missing production DB SSM parameter blocker without printing secret values.

- Created `/prod/demand-letter/db/username` as a String parameter.
- Created `/prod/demand-letter/db/password` as a SecureString parameter.
- Seeded `/prod/demand-letter/db/url` as a temporary String parameter for initial stack creation, then updated it to version `2` after RDS returned the real endpoint.
- Deployed stack `demand-letter` in `us-east-1` with:
  - `Stage=prod`
  - `VpcId=vpc-05d675a56f47ef466`
  - `PrivateSubnet1=subnet-05925fc8ff290a62c`
  - `PrivateSubnet2=subnet-027279b7af8e18cf9`
  - `WebAppOrigin=https://main.d2qz3c6ux2u72z.amplifyapp.com`
  - `WebAppOrigin2=https://main.d2qz3c6ux2u72z.amplifyapp.com`
  - `TextractCompletionTopicArn=arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion`
- Re-deployed with `DbUrlSsmVersion=2` so Lambda environment variables resolve the real database URL.
- Final CloudFormation status: `UPDATE_COMPLETE`.

Captured outputs:

- REST API URL: `https://96bdim6hv2.execute-api.us-east-1.amazonaws.com/prod`
- WebSocket API URL: `wss://3z0htd4e45.execute-api.us-east-1.amazonaws.com/prod`
- RDS endpoint: `prod-demand-letter-db.csviwg6kmv4c.us-east-1.rds.amazonaws.com`
- RDS port: `5432`
- Documents bucket: `prod-demand-letter-docs-429842292480`
- Documents bucket ARN: `arn:aws:s3:::prod-demand-letter-docs-429842292480`
- KMS key ARN: `arn:aws:kms:us-east-1:429842292480:key/e94ded9d-ef84-461b-bc85-0558674b1e67`

### 2026-07-01 — Section 3 smoke-checks

- CloudFormation reports all 36 Lambda stack resources as `UPDATE_COMPLETE`.
- Representative Lambda config check for `demand-letter-GetJobsFunction-l4Hp9ClIAN4R`: `State=Active`, `LastUpdateStatus=Successful`, `Runtime=nodejs24.x`, and env keys include `DATABASE_URL`, `NODE_ENV`, and `CORS_ORIGINS`.
- REST API Gateway route inventory includes `/jobs` with `GET`, `POST`, and `OPTIONS`.
- WebSocket API route inventory includes `$connect`, `$disconnect`, and `message`.
- Data-path API invocation was deferred until `TASK-117` applies Prisma migrations to the live RDS database.
- Manual deploy drift recorded: `template.yaml` now carries `DbUrlSsmVersion` because Lambda dynamic references need a concrete SSM parameter version change to force environment updates after the RDS endpoint is known.

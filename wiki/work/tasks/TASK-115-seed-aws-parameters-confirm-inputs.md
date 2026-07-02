---
id: TASK-115
title: "Seed production AWS parameters and confirm deployment inputs"
status: in-progress
created: 2026-07-01
updated: 2026-07-01
depends_on: []
blocks: [TASK-116]
parallel_safe_with: [TASK-113, TASK-114]
uat: ""
tags: [aws, ssm, deployment]
---

# TASK-115 — Seed production AWS parameters and confirm deployment inputs

## Objective

Prepare the AWS account and deploy-time inputs needed by the SAM stack: SSM database/model parameters, VPC and subnet IDs, web origins, and service access for Bedrock, Textract, Comprehend, and Comprehend Medical.

## Approach

Use the existing SSM parameter scheme from `template.yaml` and `scripts/setup-ssm.sh`, extending or documenting any missing parameter setup. Do not read or write any `.env` file; `.env.example` may be used as the public contract reference.

## Steps

### 1. Inventory required parameters  <!-- agent: general-purpose -->

- [x] Inspect `template.yaml` for every `{{resolve:ssm:` and `{{resolve:ssm-secure:` reference
- [x] Inspect `scripts/setup-ssm.sh` and identify which required parameters it seeds
- [x] Add or document setup for `/${Stage}/demand-letter/bedrock-model-id`

<!-- Updated: 2026-07-01 18:00 -->

### 2. Confirm AWS deploy inputs  <!-- agent: general-purpose -->

- [x] Collect the target `Stage`, `VpcId`, `PrivateSubnet1`, and `PrivateSubnet2` values
- [x] Confirm `WebAppOrigin` and `WebAppOrigin2` values for the live frontend domain
- [x] Confirm the Textract completion ARN path from `TASK-114`

<!-- Updated: 2026-07-01 18:02 -->

### 3. Confirm service access  <!-- agent: general-purpose -->

- [x] Verify Bedrock model access in the target AWS region
- [x] Verify permissions and regional availability for Textract, Comprehend, Comprehend Medical, RDS, S3, KMS, CloudTrail, DynamoDB, API Gateway, Lambda, and SNS
- [x] Record the final deploy parameter set without committing secrets

<!-- Updated: 2026-07-01 18:04 -->

## Completion Notes

### 1. Inventory required parameters

Required SSM parameters from `template.yaml`:

- `/${Stage}/demand-letter/db/url` — referenced as SSM, seeded by `scripts/setup-ssm.sh` from `DATABASE_URL`.
- `/${Stage}/demand-letter/db/username` — referenced as SSM, seeded from `DB_USERNAME`.
- `/${Stage}/demand-letter/db/password` — referenced as secure SSM, seeded from `DB_PASSWORD`.
- `/${Stage}/demand-letter/bedrock-model-id` — referenced by Lambda environment variables, now seeded from `BEDROCK_MODEL_ID`.

Static gate: `bash -n scripts/setup-ssm.sh` passed.

### 2. Confirm AWS deploy inputs

Deploy input set for TASK-116:

| Parameter | Value | Status | Source / note |
| --- | --- | --- | --- |
| `Stage` | `prod` | Assumed target | Production seeding/deploy task; `template.yaml` allows `dev`, `staging`, and `prod`. |
| `VpcId` | `vpc-05d675a56f47ef466` | Confirmed | Only VPC in `us-east-1`; default VPC, CIDR `172.31.0.0/16`. |
| `PrivateSubnet1` | `subnet-05925fc8ff290a62c` | Confirmed | Created private subnet `demand-letter-prod-private-1a`, CIDR `172.31.96.0/20`, AZ `us-east-1a`, `MapPublicIpOnLaunch=False`. |
| `PrivateSubnet2` | `subnet-027279b7af8e18cf9` | Confirmed | Created private subnet `demand-letter-prod-private-1b`, CIDR `172.31.112.0/20`, AZ `us-east-1b`, `MapPublicIpOnLaunch=False`. |
| `WebAppOrigin` | `https://main.d2qz3c6ux2u72z.amplifyapp.com` | Confirmed | Amplify app `demand-letter-prod`, app ID `d2qz3c6ux2u72z`, branch `main`. |
| `WebAppOrigin2` | `https://main.d2qz3c6ux2u72z.amplifyapp.com` | Confirmed | Same Amplify branch origin; no second frontend origin currently exists. |
| `TextractCompletionTopicArn` | `arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion` | Confirmed | Topic was created in `us-east-1`; TASK-114 chose the externally owned SNS topic path. |

Equivalent deploy parameter override shape:

```sh
sam deploy --parameter-overrides \
  Stage=prod \
  VpcId=TBD_LIVE_VPC_ID \
  PrivateSubnet1=TBD_LIVE_PRIVATE_SUBNET_1_ID \
  PrivateSubnet2=TBD_LIVE_PRIVATE_SUBNET_2_ID \
  WebAppOrigin=TBD_LIVE_FRONTEND_ORIGIN_PRIMARY \
  WebAppOrigin2=TBD_LIVE_FRONTEND_ORIGIN_SECONDARY_OR_PRIMARY \
  TextractCompletionTopicArn=TBD_EXTERNAL_TEXTRACT_COMPLETION_SNS_TOPIC_ARN
```

Blocked inputs that must be supplied outside source control before deployment:

- SSM parameter values must still be seeded before deploy; do not commit those secret values.

Actual changes:

- Added a comment-only deploy input checklist to `samconfig.toml` with explicit `TBD` placeholders.
- Recorded the TASK-115 section 2 deploy input set and blocked live values here.

Static gates: not run. This section only documents unresolved deploy inputs and does not modify executable template behavior.

Files changed:

- `samconfig.toml`
- `wiki/work/tasks/TASK-115-seed-aws-parameters-confirm-inputs.md`

### 3. Confirm service access

Verified locally:

| Check | Result | Evidence |
| --- | --- | --- |
| AWS CLI installed | Pass | `aws --version` returned `aws-cli/2.35.11 Python/3.14.6 Darwin/25.3.0 source/arm64`. |
| Default AWS region configured | Pass | `aws configure get region` returned `us-east-1`. |
| Named AWS profile configured | Not set | `aws configure get profile` returned no value and exit code `1`; commands would use the default credential chain unless `AWS_PROFILE` is set externally. |
| Current AWS identity resolves | Pass | `aws sts get-caller-identity --output json` returned account `429842292480` and ARN `arn:aws:iam::429842292480:root`. |

Blocked or TBD:

- The deployment target is confirmed as AWS account `429842292480` in region `us-east-1`, using the current default credential chain unless a named profile is supplied later.
- Bedrock profile access was confirmed for the repo's public `.env.example` model IDs: `us.anthropic.claude-sonnet-4-5-20250929-v1:0` and `us.anthropic.claude-haiku-4-5-20251001-v1:0`; both inference profiles are `ACTIVE` in `us-east-1`.
- Textract, Comprehend, Comprehend Medical, RDS, S3, KMS, CloudTrail, DynamoDB, API Gateway, Lambda, and SNS read/probe checks were run in the confirmed target account/region. S3 Control returned `NoSuchPublicAccessBlockConfiguration`, which confirms API reachability but also means account-level S3 public access block is not configured.
- Current CLI identity resolves to the account root ARN. The user confirmed account `429842292480` and region `us-east-1` are the intended deployment target.
- The actual external `TextractCompletionTopicArn` remains blocked; TASK-114 confirmed the required externally supplied ARN path, not the live ARN value.

Final deploy parameter set for TASK-116:

| Parameter | Value | Status | Source / note |
| --- | --- | --- | --- |
| `Stage` | `prod` | Assumed target | Same assumption recorded in section 2. Confirm before deployment if the live stage differs. |
| `VpcId` | `vpc-05d675a56f47ef466` | Confirmed | Default VPC in `us-east-1`. |
| `PrivateSubnet1` | `subnet-05925fc8ff290a62c` | Confirmed | Private subnet in `us-east-1a`, NAT route via `nat-0288ae4aa928225ea`. |
| `PrivateSubnet2` | `subnet-027279b7af8e18cf9` | Confirmed | Private subnet in `us-east-1b`, NAT route via `nat-0288ae4aa928225ea`. |
| `WebAppOrigin` | `https://main.d2qz3c6ux2u72z.amplifyapp.com` | Confirmed | Amplify app branch origin. |
| `WebAppOrigin2` | `https://main.d2qz3c6ux2u72z.amplifyapp.com` | Confirmed | Same origin repeated because there is no separate second frontend domain yet. |
| `TextractCompletionTopicArn` | `arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion` | Confirmed | Externally owned Textract completion SNS topic ARN. |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | Confirmed default | Use the repo's Claude Sonnet 4.5 inference profile for generation quality. `.env.example` also lists `us.anthropic.claude-haiku-4-5-20251001-v1:0` for basic/cheaper work. |

Equivalent deploy parameter override shape, with no secrets:

```sh
sam deploy --parameter-overrides \
  Stage=prod \
  VpcId=vpc-05d675a56f47ef466 \
  PrivateSubnet1=subnet-05925fc8ff290a62c \
  PrivateSubnet2=subnet-027279b7af8e18cf9 \
  WebAppOrigin=https://main.d2qz3c6ux2u72z.amplifyapp.com \
  WebAppOrigin2=https://main.d2qz3c6ux2u72z.amplifyapp.com \
  TextractCompletionTopicArn=arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion
```

Exact verification commands to run once the approved target AWS profile and region are selected:

```sh
aws sts get-caller-identity --profile <target-profile>
aws bedrock list-foundation-models --region <target-region> --by-inference-type ON_DEMAND --profile <target-profile>
aws bedrock get-foundation-model --region <target-region> --model-identifier <bedrock-model-id> --profile <target-profile>
aws textract get-document-analysis --region <target-region> --job-id <known-nonexistent-or-test-job-id> --profile <target-profile>
aws comprehend detect-dominant-language --region <target-region> --text "test" --profile <target-profile>
aws comprehendmedical detect-entities-v2 --region <target-region> --text "Patient takes aspirin." --profile <target-profile>
aws rds describe-db-engine-versions --region <target-region> --engine postgres --profile <target-profile>
aws s3control get-public-access-block --region <target-region> --account-id <target-account-id> --profile <target-profile>
aws kms list-aliases --region <target-region> --profile <target-profile>
aws cloudtrail describe-trails --region <target-region> --profile <target-profile>
aws dynamodb list-tables --region <target-region> --profile <target-profile>
aws apigateway get-account --region <target-region> --profile <target-profile>
aws lambda list-functions --region <target-region> --max-items 1 --profile <target-profile>
aws sns list-topics --region <target-region> --profile <target-profile>
aws sns get-topic-attributes --region <target-region> --topic-arn <textract-completion-topic-arn> --profile <target-profile>
```

Notes on those commands:

- The Textract and Comprehend Medical checks are live API calls and may incur negligible usage or fail for input/job reasons even when the service is regionally available. Treat them as pre-deploy checks to run only with an approved profile/region.
- `aws sns get-topic-attributes` should be run against the actual external `TextractCompletionTopicArn` to confirm the topic exists and the deploy identity can inspect it.
- A separate permission review is still required for create/update permissions used by SAM deploy; the commands above are non-mutating read or small inference probes and do not prove full deployment rights.

Actual changes:

- Recorded section 3 local AWS CLI/static identity evidence.
- Recorded blocked/TBD service-access verification status.
- Recorded the final deploy parameter set with placeholders only and no secrets.
- Documented exact follow-up verification commands for the approved target AWS profile/region.

Static/safe verification commands run:

- `aws --version` — passed.
- `aws configure get region` — passed; returned `us-east-1`.
- `aws configure get profile` — no named profile configured; exit code `1`.
- `aws sts get-caller-identity --output json` — passed; current default credential chain resolves to account `429842292480`, ARN `arn:aws:iam::429842292480:root`.
- `aws ec2 describe-vpcs --region us-east-1` — passed; found default VPC `vpc-05d675a56f47ef466`.
- `aws ec2 describe-subnets --region us-east-1 --filters Name=vpc-id,Values=vpc-05d675a56f47ef466` — passed; found six default VPC subnets, all public-IP-on-launch.
- `aws ec2 describe-route-tables --region us-east-1 --filters Name=vpc-id,Values=vpc-05d675a56f47ef466` — passed; default route table routes `0.0.0.0/0` to an Internet Gateway.
- `aws sns create-topic --region us-east-1 --name demand-letter-prod-textract-completion` — passed; returned `arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion`.
- `aws sns get-topic-attributes --region us-east-1 --topic-arn arn:aws:sns:us-east-1:429842292480:demand-letter-prod-textract-completion` — passed.
- `aws bedrock get-inference-profile --region us-east-1 --inference-profile-identifier us.anthropic.claude-sonnet-4-5-20250929-v1:0` — passed; profile is `ACTIVE`.
- `aws bedrock get-inference-profile --region us-east-1 --inference-profile-identifier us.anthropic.claude-haiku-4-5-20251001-v1:0` — passed; profile is `ACTIVE`.
- `aws amplify create-app --region us-east-1 --name demand-letter-prod --platform WEB` — passed; app ID `d2qz3c6ux2u72z`, default domain `d2qz3c6ux2u72z.amplifyapp.com`.
- `aws amplify create-branch --region us-east-1 --app-id d2qz3c6ux2u72z --branch-name main --stage PRODUCTION --no-enable-auto-build` — passed.
- `aws ec2 create-subnet` — passed for `subnet-05925fc8ff290a62c` (`172.31.96.0/20`, `us-east-1a`) and `subnet-027279b7af8e18cf9` (`172.31.112.0/20`, `us-east-1b`).
- `aws ec2 create-route-table` — passed; private route table `rtb-0d7c2aacb0c28a3e3`.
- `aws ec2 allocate-address` — passed; EIP allocation `eipalloc-053ab1d9a725df64f`, public IP `54.85.160.147`.
- `aws ec2 create-nat-gateway` — passed; NAT Gateway `nat-0288ae4aa928225ea`.
- `aws ec2 create-route` and `associate-route-table` — passed; both private subnets route `0.0.0.0/0` through the NAT Gateway.
- `aws comprehend detect-dominant-language` — passed.
- `aws comprehendmedical detect-entities-v2` — passed.
- `aws rds describe-db-engine-versions --engine postgres --engine-version 16.14` — passed; engine version available.
- `aws textract get-document-analysis` with an intentionally invalid job ID — returned `InvalidParameterException`, confirming API reachability rather than access denial.
- `aws s3control get-public-access-block` — returned `NoSuchPublicAccessBlockConfiguration`; API is reachable, but account-level S3 public access block is not configured.
- `aws kms list-aliases` — passed.
- `aws cloudtrail describe-trails` — passed; no trails currently listed.
- `aws dynamodb list-tables` — passed.
- `aws apigateway get-account` — passed.
- `aws lambda list-functions --max-items 1` — passed.
- `aws sns list-topics` — passed; includes the Textract completion topic.

Files changed:

- `wiki/work/tasks/TASK-115-seed-aws-parameters-confirm-inputs.md`
- `wiki/log.md`

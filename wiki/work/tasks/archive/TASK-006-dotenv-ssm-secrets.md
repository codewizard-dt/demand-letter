---
id: TASK-006
title: 'dotenv and SSM Parameter Store for All Secrets'
status: done
created: 2026-06-23
updated: 2026-06-23 <!-- tackle completed -->
depends_on: [TASK-001]
blocks: []
parallel_safe_with: [TASK-002, TASK-003, TASK-004, TASK-007]
uat: '[[UAT-006]]'
tags: [infra, secrets, ssm, dotenv, security]
---

# TASK-006 — dotenv and SSM Parameter Store for All Secrets

## Objective

Establish the secrets management pattern for the project: `.env` files for local development (never committed) loaded via `dotenv`, and SSM Parameter Store for all deployed secrets referenced by the SAM template. No secrets appear in code, committed config files, or CloudFormation template bodies.

## Approach

- `dotenv` is installed in `packages/api` (Lambda runtime) and loaded at the top of handler entry points for local `sam local invoke` runs
- `.env.example` documents every required variable with placeholder values — this file IS committed
- `.env` is in `.gitignore` — never committed
- Deployed secrets live in SSM Parameter Store; the SAM template references them via `{{resolve:ssm:/stage/demand-letter/...}}`
- A shell helper script `scripts/setup-ssm.sh` seeds SSM for a given stage (run once by a developer; reads from local `.env`)
- Secrets covered: DB username, DB password, DB URL (for Prisma), and AWS region/model ID already in TASK-005

## Steps

### 1. Install dotenv in api package <!-- agent: general-purpose -->

- [x] Add `dotenv` to `packages/api/package.json` dependencies:
  ```json
  "dotenv": "^16.0.0"
  ```
- [x] Add `@types/dotenv` or rely on dotenv's built-in types (dotenv v16+ ships types; no separate `@types` needed)
- [x] Run `pnpm install` from the project root to sync the lockfile <!-- Completed: 2026-06-23 -->

### 2. Load dotenv in the API entry point <!-- agent: general-purpose -->

- [x] Edit `packages/api/src/index.ts` to load dotenv before any AWS SDK imports: <!-- Completed: 2026-06-23 -->

  ```ts
  import 'dotenv/config';
  import { APIGatewayProxyHandler } from 'aws-lambda';

  export const handler: APIGatewayProxyHandler = async () => {
    return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  };
  ```

  Note: `import 'dotenv/config'` is a no-op when `NODE_ENV=production` is not the concern — dotenv simply reads `.env` if present and skips gracefully if not.

### 3. Document all required secrets in `.env.example` <!-- agent: general-purpose -->

- [x] Create or update `.env.example` at project root (this file IS committed): <!-- Completed: 2026-06-23 -->

  ```
  # Database — local development
  DATABASE_URL=postgresql://postgres:password@localhost:5432/demand_letter_dev

  # Database credentials — also stored in SSM for deployed environments
  DB_USERNAME=postgres
  DB_PASSWORD=changeme

  # Amazon Bedrock
  BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-6-20250929-v1:0
  AWS_REGION=us-east-1

  # Stage
  STAGE=dev
  ```

### 4. Create SSM Parameter Store seeding script <!-- agent: general-purpose -->

- [x] Create `scripts/setup-ssm.sh` (executable): <!-- Completed: 2026-06-23 -->

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  STAGE="${STAGE:-dev}"
  REGION="${AWS_REGION:-us-east-1}"

  echo "Seeding SSM parameters for stage: $STAGE in region: $REGION"

  # Source local .env for values (never pass secrets as CLI args in history)
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    source .env
  fi

  aws ssm put-parameter \
    --name "/${STAGE}/demand-letter/db/username" \
    --value "${DB_USERNAME:?DB_USERNAME not set}" \
    --type "String" \
    --overwrite \
    --region "$REGION"

  aws ssm put-parameter \
    --name "/${STAGE}/demand-letter/db/password" \
    --value "${DB_PASSWORD:?DB_PASSWORD not set}" \
    --type "SecureString" \
    --overwrite \
    --region "$REGION"

  aws ssm put-parameter \
    --name "/${STAGE}/demand-letter/db/url" \
    --value "${DATABASE_URL:?DATABASE_URL not set}" \
    --type "SecureString" \
    --overwrite \
    --region "$REGION"

  echo "SSM parameters seeded successfully."
  ```

- [x] Run `chmod +x scripts/setup-ssm.sh`
- [x] Add `scripts/` to `.gitignore` exception — scripts are committed, `.env` is not (already correct, no change needed) <!-- Completed: 2026-06-23 -->

### 5. Add SSM DB URL parameter to `template.yaml` <!-- agent: general-purpose -->

- [x] Confirm `template.yaml` already references SSM for DB credentials via `{{resolve:ssm:...}}` (added by TASK-003)
- [x] Add an environment variable injection in the `Globals.Function.Environment.Variables` section for `DATABASE_URL`: <!-- Completed: 2026-06-23 -->
  ```yaml
  Globals:
    Function:
      Runtime: nodejs20.x
      Architectures:
        - x86_64
      Environment:
        Variables:
          NODE_ENV: !Ref Stage
          DATABASE_URL: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'
          BEDROCK_MODEL_ID: !FindInMap [ModelIds, !Ref Stage, BedrockModelId]
  ```
  Or simpler — add `DATABASE_URL` as a plain SSM resolve reference in the Globals; adjust if `FindInMap` is not yet set up.

### 6. Verify no secrets in committed files <!-- agent: general-purpose -->

- [x] Run `git status` and confirm no `.env` file appears in the untracked or staged list
- [x] Run `grep -r "password\|secret\|credential" --include="*.ts" --include="*.json" --include="*.yaml" packages/` and confirm no hardcoded secrets appear (env var references like `process.env.DB_PASSWORD` are fine) <!-- Completed: 2026-06-23 -->

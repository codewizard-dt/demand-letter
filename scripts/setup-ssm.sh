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
  --name "/${STAGE}/demand-letter/bedrock-model-id" \
  --value "${BEDROCK_MODEL_ID:?BEDROCK_MODEL_ID not set}" \
  --type "String" \
  --overwrite \
  --region "$REGION"

echo "SSM parameters seeded successfully."

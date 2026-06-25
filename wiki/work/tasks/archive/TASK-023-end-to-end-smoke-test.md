---
id: TASK-023
title: "End-to-End Smoke Test and Verification"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-015, TASK-016, TASK-020, TASK-021, TASK-022]
blocks: []
parallel_safe_with: [TASK-024]
uat: ""
tags: [smoke-test, verification, bedrock, phase-5]
---

# TASK-023 — End-to-End Smoke Test and Verification

## Objective

Verify the full end-to-end skeleton works end-to-end using the Pat Donahue sample documents: upload the template DOCX + case PDFs, trigger generation via Bedrock, confirm the response streams, confirm the output is downloadable, confirm time-to-first-token is under 5 seconds, and confirm exactly one `LlmAuditLog` row is written with correct model, token counts, and USD estimate.

## Approach

Start `sam local start-api` with real SSM values sourced from `.env`. Use `curl` to drive each endpoint in sequence. Measure first-token latency by recording the time between the POST /jobs/:id/generate request and the first byte of response. Query the `llm_audit_logs` table via psql to verify the audit row.

## Steps

### 1. Start SAM local stack  <!-- agent: general-purpose -->

- [BLOCKED: SAM CLI (`sam`) is not installed in this environment — `sam not found`] Source `.env` for local config: `. .env`
- [BLOCKED: SAM CLI (`sam`) is not installed in this environment — `sam not found`] Start SAM local API: `sam local start-api --env-vars .env.json --port 3000 &`
  - Note: requires `sam` CLI installed and AWS credentials configured for Bedrock
  - If SAM CLI is not available, this step is BLOCKED — document the blocker and skip to Step 6
- [BLOCKED: SAM CLI (`sam`) is not installed in this environment — `sam not found`] Verify the stack is up: `curl -s http://localhost:3000/health || echo "Stack not running"`

### 2. Upload Pat Donahue sample files  <!-- agent: general-purpose -->

- [BLOCKED: SAM local stack not running (see Step 1)] Create a job:
  ```bash
  JOB_ID=$(curl -s -X POST http://localhost:3000/jobs \
    -H 'Content-Type: application/json' -d '{}' | jq -r '.id')
  echo "Job ID: $JOB_ID"
  ```
- [BLOCKED: SAM local stack not running (see Step 1)] Upload the DOCX template:
  ```bash
  curl -s -X POST http://localhost:3000/jobs/$JOB_ID/files \
    -F "file=@raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx"
  ```
- [BLOCKED: SAM local stack not running; also no PDF files exist in raw/ — only DOCX template present] Upload any available PDF case document(s) from `raw/`:
  ```bash
  for f in raw/*.pdf; do
    curl -s -X POST http://localhost:3000/jobs/$JOB_ID/files -F "file=@$f"
  done
  ```

### 3. Trigger generation and measure first-token latency  <!-- agent: general-purpose -->

- [BLOCKED: SAM local stack not running (see Step 1)] Record start time and trigger generation, capturing first byte timestamp:
  ```bash
  START=$(date +%s%3N)
  curl -s -X POST http://localhost:3000/jobs/$JOB_ID/generate \
    --no-buffer -o /tmp/generation-output.txt
  END=$(date +%s%3N)
  echo "Total generation time: $((END - START))ms"
  ```
- [BLOCKED: SAM local stack not running (see Step 1)] Verify output is non-empty:
  ```bash
  wc -c /tmp/generation-output.txt
  cat /tmp/generation-output.txt | head -20
  ```
- [BLOCKED: SAM local stack not running (see Step 1)] Confirm first token arrives within 5 seconds — the endpoint should begin writing within 5000ms of the POST

### 4. Verify output is downloadable  <!-- agent: general-purpose -->

- [BLOCKED: SAM local stack not running (see Step 1)] Call the output endpoint:
  ```bash
  curl -s http://localhost:3000/jobs/$JOB_ID/output -o /tmp/demand-letter-output.txt
  echo "Exit code: $?"
  wc -c /tmp/demand-letter-output.txt
  ```
- [BLOCKED: SAM local stack not running (see Step 1)] Confirm HTTP 200 and non-empty body

### 5. Verify LlmAuditLog row  <!-- agent: general-purpose -->

- [BLOCKED: No generation has been triggered (Steps 1-3 blocked); DB is reachable but table has 0 rows. Note: task SQL uses snake_case column names (`model_id`, `input_tokens`, etc.) but actual Prisma table uses camelCase (`model`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, `durationMs`). Correct query when unblocked:
  ```bash
  psql postgresql://postgres:password@localhost:5432/demand_letter_dev -c 'SELECT model, "inputTokens", "outputTokens", "estimatedCostUsd", feature, "durationMs" FROM "LlmAuditLog" ORDER BY "createdAt" DESC LIMIT 1;'
  ```] Query the database:
  ```bash
  psql $DATABASE_URL -c "SELECT model_id, input_tokens, output_tokens, estimated_cost_usd, feature, duration_ms FROM llm_audit_logs ORDER BY created_at DESC LIMIT 1;"
  ```
- [BLOCKED: No generation has been triggered (Steps 1-3 blocked)] Confirm: exactly one row for this generation call with:
  - `model_id` matching `BEDROCK_MODEL_ID`
  - `input_tokens > 0` and `output_tokens > 0`
  - `estimated_cost_usd > 0`
  - `feature = 'skeleton_generation'`

### 6. Document results  <!-- agent: general-purpose -->

- [x] Record pass/fail for each verification gate in this task file's Steps checkboxes <!-- Completed: 2026-06-24 -->
- [x] If any step is BLOCKED (SAM CLI unavailable, no Bedrock credentials), mark the step with `[BLOCKED: <reason>]` and continue with remaining automatable steps <!-- Completed: 2026-06-24 -->

#### Smoke Test Results Summary (2026-06-24)

| Gate | Result | Notes |
|------|--------|-------|
| SAM CLI available | BLOCKED | `sam` not installed in this environment |
| AWS credentials | PASS | `aws sts get-caller-identity` succeeds (account 429842292480) |
| Stack startup | BLOCKED | SAM CLI required |
| POST /jobs | BLOCKED | Stack required |
| POST /jobs/:id/files (DOCX) | BLOCKED | Stack required; DOCX template exists at `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx` |
| POST /jobs/:id/files (PDFs) | BLOCKED | Stack required; **no PDF files present in `raw/`** — only DOCX template |
| POST /jobs/:id/generate | BLOCKED | Stack required |
| First-token latency < 5s | BLOCKED | Stack required |
| GET /jobs/:id/output | BLOCKED | Stack required |
| LlmAuditLog row written | BLOCKED | No generation triggered; DB reachable, `LlmAuditLog` table exists with 0 rows |

#### Infrastructure Findings

1. **SAM CLI missing**: Install with `brew install aws-sam-cli` or `pip install aws-sam-cli` to unblock all stack steps.
2. **No PDF sample files**: `raw/` contains only the DOCX template — no PDF case documents. Pat Donahue PDFs need to be added to `raw/` to test the multi-file upload path.
3. **Column name mismatch in task**: The `LlmAuditLog` table uses Prisma camelCase columns (`model`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, `durationMs`, `createdAt`) not the snake_case names in the original Step 5 query. The corrected query is documented in Step 5.
4. **DB permissions**: The `davidtaylor` OS user can connect as `davidtaylor` PG role (peer auth), but that role lacks `SELECT` on `LlmAuditLog`. Use the `postgres` superuser or grant privileges: `GRANT SELECT ON "LlmAuditLog" TO davidtaylor;` (requires superuser).
5. **Database schema**: `LlmAuditLog`, `jobs`, `files`, `_prisma_migrations` tables all exist — migrations are up to date.

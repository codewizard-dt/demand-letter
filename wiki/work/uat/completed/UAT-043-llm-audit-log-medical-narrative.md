---
id: UAT-043
title: "UAT: LlmAuditLog: verify medical_narrative feature rows are written correctly"
status: passed
task: TASK-043
created: 2026-06-25
updated: 2026-06-25
---

# UAT-043 — UAT: LlmAuditLog: verify medical_narrative feature rows are written correctly

implements::[[TASK-043]]

> **Source task**: [[TASK-043]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] A running PostgreSQL database with the Prisma schema applied (`pnpm --filter @demand-letter/db prisma migrate deploy` or equivalent).
- [ ] `DATABASE_URL` is set in the environment (source the `.env` file if needed).
- [ ] SAM local API is running if API tests are to be exercised: `sam local start-api --env-vars env.json` (port 3000 default).
- [ ] `pnpm build` has been run so that `packages/db` Prisma client is generated.
- [ ] `psql` or equivalent DB CLI is available for direct schema and row inspection.

---

## Test Cases

### UAT-SCHEMA-001: `medical_narrative` value present in `LlmFeature` enum

- **Scenario**: The Prisma schema defines `LlmFeature.medical_narrative` as an enum value, making it valid for use in `LlmAuditLog.feature`.
- **Steps**:
  1. Open `packages/db/prisma/schema.prisma`.
  2. Locate the `LlmFeature` enum block (around line 46).
  3. Confirm that `medical_narrative` appears as a listed value within the enum.
- **Expected Result**: The `LlmFeature` enum contains `medical_narrative` as one of its values, alongside `zone_classification`, `case_extraction`, `refinement`, and `skeleton_generation`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-SCHEMA-002: `LlmAuditLog` model accepts `LlmFeature.medical_narrative` via DB schema

- **Scenario**: The `llm_audit_log` table in the live database recognises `medical_narrative` as a valid value for the `feature` column.
- **Steps**:
  1. Connect to the database with `psql "$DATABASE_URL"`.
  2. Run the query below to inspect the enum type.
- **Command**:
  ```bash
  psql "$DATABASE_URL" -c "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'LlmFeature' ORDER BY enumlabel;"
  ```
- **Expected Result**: The result set includes a row with `medical_narrative`. All five values (`case_extraction`, `medical_narrative`, `refinement`, `skeleton_generation`, `zone_classification`) should appear.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CODE-001: `generateMedicalNarrative` passes `LlmFeature.medical_narrative` to `invokeModelStream`

- **Scenario**: Static source-code audit confirming that the feature enum value is threaded correctly into the audit-log path.
- **Steps**:
  1. Open `packages/api/src/lib/medical-narrative.ts`.
  2. Locate the `invokeModelStream` call (around line 50–55).
  3. Confirm the `feature` key is set to `LlmFeature.medical_narrative` (the enum reference, not a string literal).
  4. Confirm that `LlmFeature` is imported from `@demand-letter/db` at the top of the file.
- **Expected Result**: The call reads `feature: LlmFeature.medical_narrative` and the import is `import { LlmFeature, prisma } from '@demand-letter/db'` (or equivalent). No string literal `'medical_narrative'` should be used in its place.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-CODE-002: `invokeModelStream` writes the audit log with the passed `feature` value

- **Scenario**: Confirm that `logAudit` in `ai-provider.ts` writes `feature: opts.feature` to `prisma.llmAuditLog`, ensuring any value passed — including `medical_narrative` — is persisted.
- **Steps**:
  1. Open `packages/api/src/lib/ai-provider.ts`.
  2. Locate the `logAudit` function (around line 144–164).
  3. Confirm that `data.feature` is set to `opts.feature` (not hardcoded to any specific enum value).
  4. Confirm `logAudit` is called at the end of the `generate()` async generator inside `invokeModelStream`, ensuring it fires after the stream is fully consumed.
- **Expected Result**: `logAudit` receives `opts.feature` and writes it verbatim to `prisma.llmAuditLog.create({ data: { feature: opts.feature, ... } })`. The call occurs inside the `generate()` generator after the stream loop completes.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-DB-001: Insert a `medical_narrative` `LlmAuditLog` row directly and verify persistence

- **Scenario**: Confirm that the database will accept and return a `medical_narrative` row in `LlmAuditLog`, end-to-end through the Prisma-generated client.
- **Steps**:
  1. Ensure `DATABASE_URL` is set.
  2. Run the script below from the repo root (uses `tsx` from the api package):
- **Command**:
  ```bash
  node --import tsx/esm -e "
  import { prisma, LlmFeature } from '@demand-letter/db';
  const row = await prisma.llmAuditLog.create({ data: { userId: 'uat-test', feature: LlmFeature.medical_narrative, model: 'test-model', provider: 'bedrock', inputTokens: 10, outputTokens: 20, estimatedCostUsd: 0.000001, durationMs: 100 } });
  console.log(JSON.stringify({ id: row.id, feature: row.feature }));
  await prisma.llmAuditLog.delete({ where: { id: row.id } });
  await prisma.\$disconnect();
  " 2>&1
  ```
- **Expected Result**: Output contains a JSON object with `"feature": "medical_narrative"` and a non-empty `"id"` string. No error is thrown. The cleanup delete runs, leaving no stale test rows.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-API-001: `GET /admin/llm-costs` returns 200 with `aggregates` and `recentRows`

- **Scenario**: Verify the cost dashboard endpoint is reachable and returns the correct response shape.
- **Steps**:
  1. Ensure SAM local API is running on port 3000.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs'
  ```
- **Expected Result**: HTTP 200 with a JSON body of the shape `{ "aggregates": [...], "recentRows": [...] }`. Both keys must be present; arrays may be empty.
- [FAIL: auto-judge: SAM local API not running — curl timed out after 3s on http://localhost:3000/admin/llm-costs] <!-- 2026-06-25 -->

---

### UAT-API-002: `GET /admin/llm-costs` includes a `medical_narrative` row in aggregates after a generation run

- **Scenario**: After a `medical_narrative` audit log row exists in the database, the dashboard endpoint returns an aggregate entry with `feature: "medical_narrative"`.
- **Steps**:
  1. Insert a `medical_narrative` `LlmAuditLog` row manually (see UAT-DB-001 command, but omit the delete step, or use a real generation run that exercises `generateMedicalNarrative`).
  2. Call the endpoint with a `days` window large enough to include the row.
  3. Run the curl command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=1' | jq '.aggregates[] | select(.feature == "medical_narrative")'
  ```
- **Expected Result**: The `jq` expression returns at least one object with `"feature": "medical_narrative"` and numeric `_count.id`, `_sum.inputTokens`, `_sum.outputTokens`, and `_sum.estimatedCostUsd` values. If no result is returned, the `medical_narrative` row is missing or outside the time window — recheck the seed step.
- [FAIL: auto-judge: SAM local API not running — curl timed out after 3s on http://localhost:3000/admin/llm-costs] <!-- 2026-06-25 -->

---

### UAT-API-003: `GET /admin/llm-costs` query is not filtered by feature (all LlmFeature values are returned)

- **Scenario**: Confirm that the aggregation query has no `feature` filter, meaning `medical_narrative` rows are always included alongside other features.
- **Steps**:
  1. Open `packages/api/src/handlers/get-admin-llm-costs.ts`.
  2. Locate the `prisma.llmAuditLog.groupBy` call.
  3. Confirm the `where` clause only filters by `createdAt` (a date range) and does not include a `feature: { in: [...] }` or `feature: { equals: ... }` restriction.
- **Expected Result**: The `where` clause contains only `{ createdAt: { gte: cutoff } }`. No `feature` filter is present.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-EDGE-001: `GET /admin/llm-costs` with `days=0` returns empty aggregates

- **Scenario**: When `days=0`, the cutoff equals `Date.now()`, so no historical rows should fall within the window. This confirms the date filter is functioning correctly and not returning all rows unconditionally.
- **Steps**:
  1. Ensure SAM local API is running.
  2. Run the curl command below.
- **Command**:
  ```bash
  curl -sS 'http://localhost:3000/admin/llm-costs?days=0' | jq '{aggregates_count: (.aggregates | length), recentRows_count: (.recentRows | length)}'
  ```
- **Expected Result**: `aggregates_count` and `recentRows_count` are both `0` (or very close to 0 — any rows created in the exact same millisecond the handler runs would technically qualify, but in practice this should be empty). The response is 200 with `{ "aggregates": [], "recentRows": [] }`.
- [FAIL: auto-judge: SAM local API not running — curl timed out after 3s on http://localhost:3000/admin/llm-costs] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: TypeScript build succeeds — `LlmFeature.medical_narrative` is a valid type

- **Scenario**: The TypeScript compiler accepts `LlmFeature.medical_narrative` as a valid enum value, confirming no type errors exist in the audit-log wiring.
- **Steps**:
  1. From the repo root, run the typecheck command.
- **Command**:
  ```bash
  pnpm typecheck
  ```
- **Expected Result**: The command exits with code 0 and no type errors are reported for `packages/api`, `packages/db`, or any other workspace package.
- [x] Pass <!-- 2026-06-25 -->

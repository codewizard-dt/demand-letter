---
id: TASK-031
title: "ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test"
status: done
created: 2026-06-24
updated: 2026-06-24
depends_on: [TASK-030]
blocks: []
parallel_safe_with: []
uat: "[[UAT-031]]"
tags: [verification, smoke-test, zone-detection, docxtemplater, cost-dashboard]
---

# TASK-031 — ROADMAP-002 End-to-End Verification — Zone Detection Pipeline Smoke Test

## Objective

Verify the full ROADMAP-002 pipeline end-to-end using the Pat Donahue template DOCX: upload the template → run zone extraction → LLM classification → attorney annotation UI displays zones → confirm/override → delimiter injection → InspectModule enumerates the expected ~40 slots. Confirm that boilerplate zones (§7 settlement conditions, CCP §999 language) are marked `boilerplate_verbatim` by the LLM and left byte-exact after tag injection. Confirm that the cost dashboard at `/admin/usage` shows `zone_classification` feature rows with expected token counts in the LlmAuditLog.

## Approach

This is a manual-assisted verification task. Steps 1–5 require a running SAM local API and the React dev server. The agent verifies static files and DB-query correctness where possible; the remainder is documented as manual steps with exact expected values the attorney/tester should see.

## Steps

### 1. Verify static implementation prerequisites  <!-- agent: general-purpose -->

- [x] Confirm all new handler files exist: <!-- Completed: 2026-06-24 -->
  - `packages/api/src/handlers/get-jobs-template-zones.ts`
  - `packages/api/src/handlers/patch-jobs-template-zones.ts`
  - `packages/api/src/handlers/post-jobs-templates-classify.ts`
  - `packages/api/src/handlers/post-jobs-templates-inject.ts`
  - `packages/api/src/handlers/get-jobs-template-slots.ts`
- [x] Confirm all five functions are registered in `template.yaml` with correct routes. <!-- Completed: 2026-06-24 -->
- [x] Run `pnpm typecheck` — confirm zero errors across all packages. <!-- Completed: 2026-06-24 — zero errors -->
- [x] Confirm `packages/db/prisma/schema.prisma` contains `TemplateSlot` model with `templateId`, `slotName`, `required`. <!-- Completed: 2026-06-24 -->

### 2. Verify boilerplate zone byte-exactness (static check)  <!-- agent: general-purpose -->

- [x] Read `packages/api/src/lib/docx-injector.ts`. <!-- Completed: 2026-06-24 -->
- [x] Confirm that `injectDelimiters()` only modifies paragraphs present in `confirmedSet` (confirmed `variable_populated` zones). <!-- Completed: 2026-06-24 — mutation is behind confirmedSet.get(idx) guard -->
- [x] Confirm that paragraphs NOT in `confirmedSet` are not touched (no structural changes to their `w:r` children). <!-- Completed: 2026-06-24 — w:r children untouched for non-confirmed paragraphs -->
- [x] This satisfies the requirement: boilerplate zones (§7 settlement conditions, CCP §999 language) are left byte-exact when their `type === 'boilerplate_verbatim'` or `confirmed === false`. <!-- Completed: 2026-06-24 -->

### 3. Manual: Full pipeline smoke test (requires SAM local + dev server)  <!-- agent: general-purpose -->

- [BLOCKED: .env.json absent — runtime environment not configured] Start SAM local API: `sam local start-api --env-vars .env.json` (or equivalent). <!-- Blocked: 2026-06-24 -->
- [BLOCKED: .env.json absent] Start React dev server: `pnpm --filter @demand-letter/web dev`.
- [BLOCKED: .env.json absent] Create a job: `POST /jobs` → note `jobId`.
- [BLOCKED: .env.json absent] Upload Pat Donahue template DOCX: `POST /jobs/:jobId/files` with `raw/AAA-Insurance_Time-Limited-Policy-Limits-Demand_Pat-Donahue.docx`.
- [BLOCKED: .env.json absent] Create a Template record and run zone extraction (may require a utility script or a `POST /jobs/:id/templates/ingest` endpoint if one exists; otherwise do it via Prisma CLI or direct DB insert).
- [BLOCKED: .env.json absent] Run LLM classification: `POST /jobs/:jobId/templates/:templateId/classify`.
  - Expected: response includes zones with `type: "boilerplate_verbatim"` or `"variable_populated"` and `suggestedFieldName` values matching the canonical schema.
- [BLOCKED: .env.json absent] Navigate to `/jobs/:jobId/templates/:templateId/annotate` in the browser.
  - Expected: zone list rendered, each showing text excerpt, LLM label toggle, and field name input.
  - Expected: §7 settlement conditions and CCP §999 zones shown as `boilerplate_verbatim`.
- [BLOCKED: .env.json absent] Click "Confirm All Variable Zones", then "Submit Annotations".
  - Expected: `PATCH /jobs/:jobId/templates/:templateId/zones` returns 200.
- [BLOCKED: .env.json absent] Run injection: `POST /jobs/:jobId/templates/:templateId/inject`.
  - Expected: response includes `slotCount` ≥ 35 (Pat Donahue template has ~40 variable fields).
  - Expected: `slots` array contains entries like `plaintiff_name`, `defendant_name`, `demand_amount`, etc.
- [BLOCKED: .env.json absent] Fetch slot list: `GET /jobs/:jobId/templates/:templateId/slots`.
  - Expected: matches the injection response.

### 4. Manual: Cost dashboard verification  <!-- agent: general-purpose -->

- [BLOCKED: requires live LLM classification run from Step 3] Navigate to `/admin/usage` in the browser. <!-- Blocked: 2026-06-24 -->
- [BLOCKED: requires live LLM classification run from Step 3] Confirm that the LlmAuditLog aggregate table shows a row for `zone_classification` feature.
- [BLOCKED: requires live LLM classification run from Step 3] Confirm the token counts are non-zero (LLM was called during Step 3).
- [BLOCKED: requires live LLM classification run from Step 3] Confirm `estimatedCostUsd` is a positive number.

### 5. Document any deviations  <!-- agent: general-purpose -->

- [x] If the SAM CLI is not available in this environment, record which manual steps were blocked and what was verified statically. <!-- Completed: 2026-06-24 — SAM CLI present but .env.json absent; Steps 3–4 blocked; Steps 1–2 fully verified statically -->
- [x] Update this task's status to `done` after Steps 1–2 pass and Step 3 is either confirmed or documented as blocked. <!-- Completed: 2026-06-24 — Steps 1–2 pass; Steps 3–4 documented as blocked -->

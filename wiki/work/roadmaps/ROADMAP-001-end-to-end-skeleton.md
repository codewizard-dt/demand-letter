---
id: ROADMAP-001
title: End-to-End Skeleton
status: active
created: 2026-06-22
updated: 2026-06-23
owner: David Taylor
linked_decisions: [DEC-0003]
tags: [skeleton, infra, bedrock, llm-audit]
---

# ROADMAP-001: End-to-End Skeleton

A vertically-complete but deliberately minimal system — upload a template DOCX + case PDFs, trigger a naive Claude-on-Bedrock generation, stream the result to the browser, and download as DOCX. Every layer is touched (UI → API → Lambda → Bedrock → PostgreSQL → S3) before any "real" feature is built. The LLM audit trail is wired in from day one so every subsequent roadmap gets cost/usage logging automatically.

---

### Phase 1 — Infrastructure

- [x] [[TASK-001: AWS SAM TypeScript Monorepo Scaffold]]
- [x] [[TASK-002: PostgreSQL Schema Bootstrap — jobs and files tables]](../tasks/archive/TASK-002-postgresql-schema-bootstrap.md)
- [x] [[TASK-003: RDS Instance with KMS CMK Encryption]](../tasks/archive/TASK-003-rds-kms-cmk.md)
- [x] [[TASK-004: S3 Bucket for Source Documents and Outputs]](../tasks/archive/TASK-004-s3-bucket.md)
- [x] [[TASK-005: Bedrock Model Access — Verify Inference Profile and Smoke-Test]](../tasks/archive/TASK-005-bedrock-model-access.md)
- [x] [[TASK-006: dotenv and SSM Parameter Store for All Secrets]](../tasks/archive/TASK-006-dotenv-ssm-secrets.md)
- [x] [[TASK-007: TypeScript Strict Mode + ESLint + Prettier — Clean Baseline]](../tasks/archive/TASK-007-typescript-eslint-prettier-verify.md)

---

### Phase 2 — LLM Audit Trail (port from jobfinder)

- [ ] `LlmAuditLog` Prisma model: `userId` (plain String, no FK — survives user deletion), `feature` (`"zone-classification" | "case-extraction" | "medical-narrative" | "refinement" | "skeleton-generation"`), `model`, `provider`, `inputTokens`, `outputTokens`, `estimatedCostUsd`, `durationMs`; indexes on `userId`, `(feature, createdAt)`, `createdAt`
- [ ] `MODEL_PRICING` + `estimateCostUsd()` in `src/lib/ai.ts`: Sonnet 4.6 = $3.00/$15.00 per MTok input/output; Haiku 4.5 = $0.80/$4.00; update if Bedrock pricing differs
- [ ] AI provider wrapper `src/lib/ai-provider.ts`: wraps both streaming and non-streaming Bedrock calls; records `durationMs` via `Date.now()` diff; fire-and-forget `prisma.llmAuditLog.create(...).catch(() => {})` after each call (logging errors never break the request)
- [ ] `GET /admin/llm-costs`: aggregate by feature (calls, inputTokens, outputTokens, totalCostUsd) + last 100 raw rows; configurable `?days=30` lookback
- [ ] Cost dashboard page `/admin/usage`: per-feature cost table + recent log rows (port `llm-cost-section.tsx` from jobfinder)

---

### Phase 3 — Backend

- [ ] `POST /jobs` — create a generation job record in PostgreSQL; return job id
- [ ] `POST /jobs/:id/files` — upload DOCX template + PDF case docs to S3; insert rows into `files` table; validate file types
- [ ] `POST /jobs/:id/generate` — pull files from S3; send to Claude on Bedrock as inline base64 with a zero-shot prompt ("generate a demand letter matching this template using these case documents"); stream Claude response via SSE; log to `LlmAuditLog` via provider wrapper
- [ ] `GET /jobs/:id/output` — return the streamed output as plain text (naive DOCX wrapping is acceptable at this stage)
- [ ] Lambda handler wiring: SAM template routes each endpoint to its Lambda function; shared `db` layer as a Lambda layer

---

### Phase 4 — Frontend

- [ ] React + Vite + TypeScript + Tailwind scaffold in `packages/web`
- [ ] Upload form: template DOCX + case PDFs → `POST /jobs` then `POST /jobs/:id/files`
- [ ] "Generate" button → `POST /jobs/:id/generate` → SSE stream consumer → live streaming text display
- [ ] Download button: `GET /jobs/:id/output` → save file
- [ ] `/admin/usage` cost dashboard page (from Phase 2)

---

### Phase 5 — Verification

- [ ] Smoke test: upload Pat Donahue sample template + case docs → generation streams → output downloadable
- [ ] First token arrives within 5 seconds (PRD HTTP requirement)
- [ ] Cost dashboard shows one `LlmAuditLog` row per generation call with correct model, token counts, and USD estimate
- [ ] `pnpm typecheck` passes

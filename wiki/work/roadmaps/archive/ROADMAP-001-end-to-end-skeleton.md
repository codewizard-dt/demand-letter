---
id: ROADMAP-001
title: End-to-End Skeleton
status: done
created: 2026-06-22
updated: 2026-06-24
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

- [x] [[TASK-008: LlmAuditLog Prisma Model]](../tasks/archive/TASK-008-llm-audit-log-prisma-model.md)
- [x] [[TASK-009: MODEL_PRICING Map and estimateCostUsd() Utility]](../tasks/archive/TASK-009-model-pricing-estimate-cost.md)
- [x] [[TASK-010: AI Provider Wrapper with LLM Audit Logging]](../tasks/archive/TASK-010-ai-provider-wrapper.md)
- [x] [[TASK-011: GET /admin/llm-costs Endpoint]](../tasks/archive/TASK-011-admin-llm-costs-endpoint.md)
- [x] [[TASK-012: Admin Cost Dashboard Page /admin/usage]](../tasks/archive/TASK-012-admin-usage-dashboard-page.md)

---

### Phase 3 — Backend

- [x] [[TASK-013: POST /jobs Endpoint — Create Generation Job]](../tasks/archive/TASK-013-post-jobs-endpoint.md)
- [x] [[TASK-014: POST /jobs/:id/files Endpoint — Upload Template and Case Docs]](../tasks/archive/TASK-014-post-jobs-files-endpoint.md)
- [x] [[TASK-015: POST /jobs/:id/generate Endpoint — Naive Bedrock Generation with SSE]](../tasks/archive/TASK-015-post-jobs-generate-endpoint.md)
- [x] [[TASK-016: GET /jobs/:id/output Endpoint — Return Generation Output]](../tasks/archive/TASK-016-get-jobs-output-endpoint.md)
- [x] [[TASK-017: Lambda DbLayer and SAM Template Wiring]](../tasks/archive/TASK-017-lambda-db-layer-sam-wiring.md)

---

### Phase 4 — Frontend

- [x] [[TASK-018: Steno.com Style Audit and Generalized Style Guide]](../tasks/archive/TASK-018-steno-style-audit.md)
- [x] [[TASK-019: Add Tailwind CSS to Web Package]](../tasks/archive/TASK-019-tailwind-setup.md)
- [x] [[TASK-020: Upload Form — Template DOCX + Case PDFs]](../tasks/archive/TASK-020-upload-form.md)
- [x] [[TASK-021: Generate Button with SSE Streaming Display]](../tasks/archive/TASK-021-generate-button-sse.md)
- [x] [[TASK-022: Download Button for Generation Output]](../tasks/archive/TASK-022-download-button.md)
- [x] [[TASK-012: Admin Cost Dashboard Page /admin/usage]](../tasks/archive/TASK-012-admin-usage-dashboard-page.md)

---

### Phase 5 — Verification

- [x] [[TASK-023: End-to-End Smoke Test and Verification]](../tasks/archive/TASK-023-end-to-end-smoke-test.md)
- [x] [[TASK-024: Final Monorepo Typecheck Gate]](../tasks/archive/TASK-024-final-typecheck.md)

# Testing

This document summarizes every `*.test.ts` suite in the repo: what it covers, how it runs, and how the layers fit together.

**Totals:** 22 `*.test.ts` files · **143 test cases**, split across three runners.

| Layer | Runner / config | Files | Cases | Real dependencies |
|-------|-----------------|-------|-------|-------------------|
| Server unit | `vitest.config.ts` | 20 | 137 | none — Prisma & AWS mocked |
| Server integration | `vitest.config.integration.ts` | 1 | 4 | real Postgres + real S3 (only Bedrock mocked) |
| Frontend unit | `vitest` (Vite) | 1 | 2 | none |

---

## How to run

```bash
# Server unit tests (Prisma + AWS mocked, no external services)
pnpm --filter @demand-letter/server test
#   alias from repo root:
pnpm test:api

# Server integration tests (requires local Postgres + AWS creds)
pnpm --filter @demand-letter/server test:integration

# Frontend unit tests
pnpm --filter @demand-letter/web test

# Everything, recursively
pnpm -r test
```

Server unit runs emit JUnit XML to `app/server/test-results/junit.xml` (integration → `integration-junit.xml`) for CI ingestion.

---

## Layer 1 — Server unit tests

**Config:** `app/server/vitest.config.ts` — `environment: node`, includes `src/**/*.test.ts`, **excludes** `src/integration/**`. Coverage via v8.

**Mocking strategy** (see `app/server/__mocks__/` and `.serena/memories/api/testing/patterns`):
- **Prisma** — `vi.mock('@demand-letter/db')` swaps in a `mockDeep<PrismaClient>()` auto-reset each `beforeEach`.
- **AWS** — `aws-sdk-client-mock` + `aws-sdk-client-mock-vitest` for S3 / Textract / Bedrock / Comprehend clients.
- **Handlers** are Lambda functions, invoked directly: `handler(event, {} as any, {} as any)`.
- `console.error` on error-path tests is expected (handlers log in catch blocks).

### `src/lib/` — pure logic & DOCX machinery (14 files, 114 cases)

| File | Cases | Covers |
|------|------:|--------|
| `field-schema.test.ts` | 11 | `dbNameToTagName` / `tagNameToDbName` conversion + `FIELD_SCHEMA` integrity |
| `docx-system-fields.test.ts` | 14 | DOCX system fields (page numbers, dates) injection |
| `generation-data-builder.test.ts` | 13 | `buildDataObject` — assembles the docxtemplater data payload |
| `sufficiency-gate.test.ts` | 11 | `computeGapReport` — slot coverage / gap detection |
| `docx-literal-replace.test.ts` | 9 | `buildLiteralReplacements` / `applyLiteralReplacements` |
| `zone-classifier.test.ts` | 9 | `parseZoneClassifications` + `classifyZones` (LLM zone labelling) |
| `ai.test.ts` | 9 | `estimateCostUsd` + `MODEL_PRICING` token-cost math |
| `redact-text.test.ts` | 9 | `redactText` — offset → typed-token PHI/PII redaction |
| `merge-entities.test.ts` | 8 | `mergeEntities` — merge Comprehend Medical (PHI) + Comprehend (PII) offsets |
| `letter-proofread.test.ts` | 7 | letter proofreading pass |
| `docx-body-images.test.ts` | 5 | body image add/swap in the DOCX |
| `text-normalization.test.ts` | 5 | `normalizeExtractedText` — cleans OCR output |
| `docx-zone-extractor.test.ts` | 3 | `extractParagraphZones` — mid-sentence merge behavior |
| `extraction-service.test.ts` | 1 | `logCaseDocumentSlotCoverage` |

### `src/handlers/` — Lambda endpoint tests (6 files, 23 cases)

| File | Cases | Covers |
|------|------:|--------|
| `post-jobs-generate.test.ts` | 7 | generation trigger — status lifecycle |
| `get-jobs-gap-report.test.ts` | 5 | gap-report endpoint (mocks `computeGapReport`) |
| `get-jobs.test.ts` | 3 | job listing |
| `post-jobs-documents-ingest.test.ts` | 3 | case-document ingest kickoff |
| `post-jobs-files.test.ts` | 3 | file upload handling |
| `post-jobs.test.ts` | 2 | job creation |

---

## Layer 2 — Server integration test

**Config:** `app/server/vitest.config.integration.ts` — 60 s test timeout, 30 s hook timeout, `globalSetup: src/integration/global-setup.ts`. Runs against a **real `demand_letter_test` Postgres DB** (derived from `DATABASE_URL`, override with `DATABASE_URL_TEST`) and **real S3** (`DOCUMENTS_BUCKET`), Bedrock model pinned to Claude Haiku 4.5.

**`src/integration/job-lifecycle.test.ts` (4 cases)** — end-to-end job flow through the actual Lambda handlers:
- integration: job creation and file upload
- integration: document ingestion
- integration: job generation pipeline

**Mock boundary:** only `generateMedicalNarrative` (Bedrock streaming) is stubbed. Prisma writes, S3 upload/download, docxtemplater rendering, and DB status transitions all hit real services. Tests self-clean (delete job cascade + S3 keys in `afterEach`).

> Aligns with the team's E2E preference: real full-stack tests, no API mocking, long timeouts for Textract/Bedrock.

---

## Layer 3 — Frontend unit test

**Runner:** `vitest` via the Vite config. Single suite so far:

**`app/frontend/src/lib/editor/__tests__/readOnlyZonePlugin.test.ts` (2 cases)** — the TipTap ProseMirror plugin that makes boilerplate zones read-only in the editor.

---

## Beyond `*.test.ts`

Not counted above, but part of the test story:

- **Playwright E2E** (`app/frontend/e2e/*.spec.ts`) — full browser flows: `e2e.spec.ts`, `auth.spec.ts`, `full-job-lifecycle.spec.ts`, `account.spec.ts`, `admin-usage.spec.ts`, `jobs-list-after-lifecycle.spec.ts`. Run with `pnpm --filter @demand-letter/web test:e2e` (or the per-suite `test:e2e:*` scripts).
- **LLM evals** (`evals/run_evals.ts`) — golden-set / scenario harness for generation quality; run with `pnpm evals`.
- **Compliance smoke** (`app/server` `compliance-verify` script) — asserts `redactText` masks PHI spans; run with `pnpm --filter @demand-letter/server compliance-verify`.

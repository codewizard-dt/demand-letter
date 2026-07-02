# Server Package Testing Patterns

> Paths are `app/server/…` (NOT the old `packages/api/…`). The package is `@demand-letter/server`.
> Full human-readable breakdown lives at repo-root `TESTING.md`.

## Three runners
- **Server unit** — `app/server/vitest.config.ts`, includes `src/**/*.test.ts`, **excludes** `src/integration/**`. Prisma + AWS mocked. Run: `pnpm --filter @demand-letter/server test` (root alias `pnpm test:api`). JUnit → `app/server/test-results/junit.xml`.
- **Server integration** — `app/server/vitest.config.integration.ts`, includes `src/integration/**/*.test.ts`, `globalSetup: src/integration/global-setup.ts`, 60s test / 30s hook timeout. Real Postgres (`demand_letter_test`, derived from `DATABASE_URL`, override `DATABASE_URL_TEST`) + real S3 (`DOCUMENTS_BUCKET`); Bedrock pinned to Claude Haiku 4.5. Run: `pnpm --filter @demand-letter/server test:integration`.
- **Frontend unit** — Vite `vitest`. Run: `pnpm --filter @demand-letter/web test`.

## Mocks (server unit)
- **Prisma**: `vi.mock('@demand-letter/db')` → `mockDeep<PrismaClient>()`, auto-reset in `beforeEach`. Mock file in `app/server/__mocks__/`.
- **AWS**: `aws-sdk-client-mock` + `aws-sdk-client-mock-vitest` (S3 / Textract / Bedrock / Comprehend).
- **Handlers** are Lambdas — call directly: `handler(event, {} as any, {} as any)`.
- Mock a lib the handler calls when needed, e.g. `vi.mock('../lib/sufficiency-gate')`.
- `console.error` (stderr) on error-path tests is expected.

## Using the Prisma mock
```ts
vi.mock('@demand-letter/db')  // before other imports
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@demand-letter/db'
import { prisma } from '@demand-letter/db'
const prismaMock = prisma as DeepMockProxy<PrismaClient>
// prismaMock.job.findUnique.mockResolvedValue(...)
```

## Integration test mock boundary
`src/integration/job-lifecycle.test.ts`: only `generateMedicalNarrative` (Bedrock streaming) is mocked. Prisma writes, S3 up/download, docxtemplater render, DB status transitions are REAL. Tests self-clean (job cascade delete + S3 key delete in afterEach). Matches `mem:global/…` E2E preference (real full-stack, no API mocking, long timeouts).

## Coverage snapshot (as of 2026-07-01)
**22 `*.test.ts` files, 143 cases.** Server unit = 137 (20 files: 14 lib + 6 handlers); integration = 4 (1 file); frontend = 2 (1 file).

Server unit files live alongside source: `src/lib/<name>.test.ts`, `src/handlers/<name>.test.ts`.
- lib (cases): docx-system-fields 14, generation-data-builder 13, field-schema 11, sufficiency-gate 11, docx-literal-replace 9, zone-classifier 9, ai 9, redact-text 9, merge-entities 8, letter-proofread 7, docx-body-images 5, text-normalization 5, docx-zone-extractor 3, extraction-service 1
- handlers (cases): post-jobs-generate 7, get-jobs-gap-report 5, get-jobs 3, post-jobs-documents-ingest 3, post-jobs-files 3, post-jobs 2
- frontend: `app/frontend/src/lib/editor/__tests__/readOnlyZonePlugin.test.ts` 2

## Beyond *.test.ts
- Playwright E2E: `app/frontend/e2e/*.spec.ts` (e2e, auth, full-job-lifecycle, account, admin-usage, jobs-list-after-lifecycle) — `pnpm --filter @demand-letter/web test:e2e[:*]`.
- LLM evals: `evals/run_evals.ts` — `pnpm evals`.
- Compliance smoke: `pnpm --filter @demand-letter/server compliance-verify` (asserts `redactText` masks PHI).

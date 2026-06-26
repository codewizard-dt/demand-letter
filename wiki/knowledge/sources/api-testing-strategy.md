---
id: api-testing-strategy
title: Research — API Testing Strategy (Unit + Integration)
updated: 2026-06-26
sources:
  - ../../raw/research/api-test-strategy/index.md
tags: [testing, api, vitest, aws, prisma, lambda]
---

# Research — API Testing Strategy (Unit + Integration)

relates_to::[[../concepts/lambda-handler-testing.md]] | uses::[[../entities/tools/vitest.md]] | uses::[[../entities/tools/aws-sdk-client-mock.md]] | uses::[[../entities/tools/vitest-mock-extended.md]]

This research documents the recommended testing strategy for `packages/api`: adding **Vitest** (Node environment) as the test runner, using **`aws-sdk-client-mock`** for AWS SDK v3 client mocking, and **`vitest-mock-extended`** with `mockDeep<PrismaClient>()` for Prisma. The full findings back relates_to::[[../../work/roadmaps/ROADMAP-008-api-test-suite.md|ROADMAP-008]].

**Current gap:** `packages/api` has no test framework installed. `packages/web` already uses Vitest 2.x — adding the same framework to `packages/api` with `environment: 'node'` in `vitest.config.ts` provides consistency across the monorepo.

**Lib file split:** The 26 lib files divide into **18 pure-function** modules (no I/O — call directly with fixtures) and **8 AWS-dependent** modules that wrap SDK clients. Pure-function libs include `prosemirror-to-docx`, `zone-classifier`, `structured-parser`, `sufficiency-gate`, `generation-data-builder`, and all docx/schema utilities. AWS-dependent libs include `ai.ts`, `ai-provider.ts`, `textract-client.ts`, `comprehend-client.ts`, `comprehend-medical-client.ts`, `extraction-service.ts`, `medical-narrative.ts`, and `compliance-verify.ts`.

**Handler test scaffold:** All 28 handlers export a single `handler` const. Integration tests call `handler(mockEvent, ctx, vi.fn())` directly, mocking Prisma via `vi.mock('@demand-letter/db')` and AWS clients via `mockClient()` from `aws-sdk-client-mock`. No real database or network calls are needed. **Key constraint:** `pdfjs-dist` may require a `canvas` peer dep or `import.meta.url` shim in Node — PDF parser tests may need fixture bytes or should be deferred.

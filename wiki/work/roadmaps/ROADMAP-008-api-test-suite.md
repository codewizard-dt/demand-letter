---
id: ROADMAP-008
title: Add API test suite (unit + integration)
status: active
created: 2026-06-26
updated: 2026-06-26
owner: David Taylor
linked_requirements: —
linked_decisions: —
tags: [testing, api, infra]
---

# Roadmap 008: Add API test suite (unit + integration)

## Goal

Every `packages/api/src/lib/` file has unit tests and every `packages/api/src/handlers/` file has at least one integration test; a test script runs in CI — giving the team confidence to refactor and ship without regressions.

## Phase 1: Setup

- [ ] Add vitest, aws-sdk-client-mock, aws-sdk-client-mock-vitest, vitest-mock-extended to packages/api devDeps and add test + test:watch scripts to package.json
- [ ] Create packages/api/vitest.config.ts with `environment: 'node'`
- [ ] Create Prisma mock helper at packages/api/src/__mocks__/@demand-letter/db.ts using vitest-mock-extended deepMock
- [ ] Add `pnpm --filter api test` step to the CI workflow

## Phase 2: Lib: Pure

- [ ] Unit tests: DOCX utilities (docx-types, docx-inspect, docx-injector, docx-parser, docx-renderer)
- [ ] Unit tests: Schema/field (extraction-schema, field-schema, zone-field-schema)
- [ ] Unit tests: Core logic (zone-classifier, sufficiency-gate, generation-data-builder, document-type-detector)
- [ ] Unit tests: Utilities (cors, merge-entities, redact-text, index)
- [ ] Unit tests: Converters (prosemirror-to-docx, structured-parser)

## Phase 3: Lib: AWS

- [ ] Unit tests: ai.ts + ai-provider.ts (Bedrock mock via aws-sdk-client-mock)
- [ ] Unit tests: textract-client.ts
- [ ] Unit tests: comprehend-client.ts + comprehend-medical-client.ts
- [ ] Unit tests: extraction-service.ts
- [ ] Unit tests: medical-narrative.ts
- [ ] Unit tests: compliance-verify.ts

## Phase 4: Handlers

- [ ] Integration tests: Job CRUD (post-jobs, get-jobs)
- [ ] Integration tests: File/ingest (post-jobs-files, post-jobs-documents-ingest)
- [ ] Integration tests: Generation+Extract (post-jobs-generate, post-jobs-extract, sns-textract-completion)
- [ ] Integration tests: Template ops (get-jobs-template-slots, get-jobs-template-zones, patch-jobs-template-zones, post-jobs-templates-inject, post-jobs-templates-classify)
- [ ] Integration tests: Output/export (get-jobs-output, get-jobs-blocks, get-jobs-fields, get-jobs-gap-report, get-jobs-refinements, post-jobs-export-docx, get-jobs-export-docx)
- [ ] Integration tests: Refinement+Attorney (post-jobs-refine, patch-jobs-refine-accept, patch-jobs-refine-reject, post-jobs-attorney-judgment)
- [ ] Integration tests: Changes+WebSocket+Admin (get-jobs-changes, delete-jobs-changes, websocket-sync, merge-yjs-snapshot, get-admin-llm-costs)

## Notes


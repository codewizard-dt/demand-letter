---
id: aws-sdk-client-mock
title: aws-sdk-client-mock
aliases: [aws-sdk-client-mock, aws-sdk-client-mock-vitest]
updated: 2026-06-26
sources:
  - ../../../raw/research/api-test-strategy/index.md
tags: [testing, aws, mock, vitest]
---

# aws-sdk-client-mock

relates_to::[[../../sources/api-testing-strategy.md]] | relates_to::[[vitest.md]] | relates_to::[[aws-textract.md]] | relates_to::[[aws-comprehend-medical.md]]

`aws-sdk-client-mock` is the community-standard library (endorsed by the AWS SDK team) for mocking AWS SDK v3 clients in unit and integration tests. It intercepts `client.send(Command)` calls at the Smithy middleware layer — **no network access, no real AWS credentials required**. It is fully typed: TypeScript validates mock return values against the command's output type.

**Usage pattern:**
```ts
import { mockClient } from 'aws-sdk-client-mock'
import { TextractClient, GetDocumentAnalysisCommand } from '@aws-sdk/client-textract'

const textractMock = mockClient(TextractClient)
beforeEach(() => textractMock.reset())

textractMock.on(GetDocumentAnalysisCommand).resolves({ Blocks: [...] })
```

**Vitest extension:** `aws-sdk-client-mock-vitest` adds `toHaveReceivedCommand(CommandClass)` and `toHaveReceivedCommandWith(CommandClass, input)` matchers to Vitest's `expect`. Import `'aws-sdk-client-mock-vitest/extend'` in the Vitest setup file to activate.

**Scope in this project:** Used for all 8 AWS-dependent lib files and all 28 handler integration tests. Module-level singleton clients (e.g., `textractClient` exported from `textract-client.ts`) are safely intercepted without refactoring — `mockClient` patches at the SDK middleware level, not at the import level.

**Reference sources:** GitHub repo: `github.com/m-radzikowski/aws-sdk-client-mock` · npm companion: `npmjs.com/package/aws-sdk-client-mock-vitest` · AWS Developer Tools blog endorsement: `aws.amazon.com/blogs/developer/mocking-modular-aws-sdk-for-javascript-v3-in-unit-tests/`

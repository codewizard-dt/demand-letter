---
topic: unit and integration testing strategy for TypeScript API handlers and library modules — patterns for mocking AWS services (Textract, Comprehend Medical), ProseMirror, Yjs, and Prisma in Jest/Vitest; test scaffolding conventions for Lambda-style handlers
slug: api-test-strategy
researched: 2026-06-26
sources: [./sources.md]
---

# Research: API Testing Strategy

> **Recommendation:** Add Vitest (Node environment) to `packages/api`, split lib files into pure-function and AWS-dependent groups, use `aws-sdk-client-mock` for AWS client mocking, and use `vitest-mock-extended` deep-mock for Prisma. Integration tests for handlers should use Vitest with a `vi.mock()` boundary at the Prisma module, injecting real AWS mocks via `aws-sdk-client-mock`. No real database or cloud calls needed for the handler integration tier.

## Research Questions

1. What test framework does the repo already use, and can the API package reuse it?
2. How do you mock AWS SDK v3 clients in Vitest?
3. How do you mock Prisma in Vitest for handler integration tests?
4. Which lib files are pure functions (easy to unit test) vs. AWS-dependent (need mocking)?
5. What is the recommended scaffolding pattern for Lambda-style `handler` exports?

## Current State (Codebase)

- **`packages/web`** already uses Vitest 2.x (`"vitest": "^2.0.0"`) with `"test": "vitest run"`. One test file exists: `packages/web/src/lib/editor/__tests__/readOnlyZonePlugin.test.ts`. [S1]
- **`packages/api`** has **no test framework installed** — no vitest, jest, or any test runner in `package.json` devDependencies. [S2]
- All handlers export a single `handler` const typed as an AWS Lambda handler (e.g., `APIGatewayProxyHandler`).
- The API package uses AWS SDK v3 clients: `@aws-sdk/client-textract`, `@aws-sdk/client-comprehend`, `@aws-sdk/client-comprehendmedical`, `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-s3`, `@aws-sdk/client-dynamodb`. [S2]
- Prisma client is used via `@demand-letter/db` (workspace dependency). [S2]

### Lib file classification

**Pure-function libs** (no AWS or DB I/O — straightforward unit tests):
`cors.ts`, `docx-inspect.ts`, `docx-injector.ts`, `docx-parser.ts`, `docx-renderer.ts`, `docx-types.ts`, `extraction-schema.ts`, `field-schema.ts`, `generation-data-builder.ts`, `index.ts`, `merge-entities.ts`, `prosemirror-to-docx.ts`, `redact-text.ts`, `structured-parser.ts`, `sufficiency-gate.ts`, `zone-classifier.ts`, `zone-field-schema.ts`, `document-type-detector.ts`

**AWS-dependent libs** (need `aws-sdk-client-mock` or `vi.mock`):
`ai.ts`, `ai-provider.ts`, `comprehend-client.ts`, `comprehend-medical-client.ts`, `extraction-service.ts`, `medical-narrative.ts`, `textract-client.ts`, `compliance-verify.ts`

## Key Findings

- **Vitest for Node.js backend**: Vitest supports a `environment: 'node'` config (or `vitest.config.ts` with `test.environment = 'node'`), making it fully suitable for the Lambda API package. [S3]
- **AWS SDK v3 mocking**: The `aws-sdk-client-mock` library (`npm i -D aws-sdk-client-mock`) is the community-standard approach, endorsed by AWS themselves. It intercepts `client.send(Command)` calls without network access. A Vitest-specific extension `aws-sdk-client-mock-vitest` adds custom matchers (`toHaveReceivedCommand`). [S4, S5]
- **Prisma mocking**: The `vitest-mock-extended` pattern (deep-mock via `mockDeep<PrismaClient>()`) combined with a `__mocks__/@demand-letter/db.ts` manual mock file is the recommended unit/integration test approach. No real DB needed for handler-level tests. [S6]
- **Integration vs. real DB**: For handler integration tests, mock the Prisma client at the module level (`vi.mock('@demand-letter/db', ...)`). A real test DB (`prisma db push` against `DATABASE_URL` pointing to a local/test Postgres) is reserved for true data-layer integration tests — not needed for this roadmap scope. [S7]
- **Lambda handler test scaffold**: Call `handler(mockEvent, mockContext, vi.fn())` where `mockEvent` is a partial `APIGatewayProxyEvent`. Prisma and AWS clients must be mocked before import via `vi.mock`. [S8]

## Constraints

1. The API package has no `vitest.config.ts` — one must be created with `environment: 'node'` (not `jsdom`).
2. AWS SDK clients are instantiated at module level in several lib files (e.g., `textract-client.ts` exports `textractClient`). Tests must use `vi.mock` at the module boundary or refactor clients to be injectable. `aws-sdk-client-mock` handles this without refactoring.
3. `@demand-letter/db` is a workspace package — `vi.mock('@demand-letter/db')` is the cleanest approach for mocking Prisma in the API context.
4. Some handlers (`websocket-sync.ts`) use DynamoDB + API Gateway Management API — need additional AWS mocks.
5. The `compliance-verify.ts` is run as a script (`tsx src/lib/compliance-verify.ts`) with side-effectful constants — test only the exported `assert` function.

## Recommendation

### 1. Test framework setup (one-time)
Add to `packages/api/package.json` devDependencies:
```
"vitest": "^2.0.0",
"@vitest/coverage-v8": "^2.0.0",
"aws-sdk-client-mock": "^4.0.0",
"aws-sdk-client-mock-vitest": "^2.0.0",
"vitest-mock-extended": "^2.0.0"
```
Add to scripts: `"test": "vitest run", "test:watch": "vitest"`

Create `packages/api/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', globals: false }
})
```

### 2. Lib unit tests — pure functions
Co-locate tests at `packages/api/src/lib/__tests__/<name>.test.ts`. Use Vitest `describe/it/expect`. No mocks needed — call exported functions directly with fixtures.

### 3. Lib unit tests — AWS-dependent
Use `mockClient` from `aws-sdk-client-mock`:
```ts
import { mockClient } from 'aws-sdk-client-mock'
import { TextractClient } from '@aws-sdk/client-textract'
const textractMock = mockClient(TextractClient)
beforeEach(() => textractMock.reset())
```

### 4. Handler integration tests
Place tests at `packages/api/src/handlers/__tests__/<name>.test.ts`.
Pattern:
```ts
vi.mock('@demand-letter/db', () => ({ prisma: mockDeep<PrismaClient>() }))
import { handler } from '../get-jobs'
const mockEvent = { pathParameters: { jobId: '123' }, ... } as APIGatewayProxyEvent
const res = await handler(mockEvent, {} as Context, vi.fn())
expect(JSON.parse(res.body).id).toBe('123')
```

### Risks & Mitigations
- **Module-level singleton clients**: Some lib files create clients at import time. `aws-sdk-client-mock` mocks at the SDK level (not import), so this is safe without refactoring.
- **`yjs`/`prosemirror` in Node**: Both packages are isomorphic. Vitest node environment handles them fine.
- **`pdfjs-dist` in Node**: May need `canvas` peer dep or `import.meta.url` shim — skip PDF parser tests initially or use fixture bytes.

## Next Steps

- `/task-add` a setup task: "Add Vitest + aws-sdk-client-mock + vitest-mock-extended to packages/api"
- `/task-add` tasks per lib group (pure functions, AWS-dependent)
- `/task-add` tasks per handler group (CRUD handlers, file/document handlers, refinement handlers, export handlers)

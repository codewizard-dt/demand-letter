---
topic: unit and integration testing strategy for TypeScript API handlers and library modules — patterns for mocking AWS services (Textract, Comprehend Medical), ProseMirror, Yjs, and Prisma in Jest/Vitest; test scaffolding conventions for Lambda-style handlers
slug: api-test-strategy
researched: 2026-06-26
---

# Primary Sources — API Testing Strategy

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/web/src/lib/editor/__tests__/readOnlyZonePlugin.test.ts` | 2026-06-26 | Existing Vitest test pattern: `import { describe, it, expect } from 'vitest'` — confirms repo uses Vitest |
| S2 | codebase | `packages/api/package.json` | 2026-06-26 | No test runner in API devDependencies; lists all AWS SDK v3 clients and Prisma dep |
| S3 | web | https://daaru.medium.com/testing-lambda-functions-with-vitest-fc713caa975d | 2026-06-26 | Vitest Lambda testing pattern — inject mocked client, call handler directly |
| S4 | web | https://github.com/m-radzikowski/aws-sdk-client-mock | 2026-06-26 | `aws-sdk-client-mock` is the standard AWS SDK v3 mock library; works with Vitest |
| S5 | web | https://www.npmjs.com/package/aws-sdk-client-mock-vitest | 2026-06-26 | `aws-sdk-client-mock-vitest` adds `toHaveReceivedCommand` matcher for Vitest |
| S6 | web | https://dev.to/jay818/mastering-unit-testing-a-comprehensive-guide-ing | 2026-06-26 | `vitest-mock-extended` + `mockDeep<PrismaClient>()` pattern; `__mocks__/db.ts` file |
| S7 | web | https://www.simplethread.com/isolated-integration-testing-with-remix-vitest-and-prisma/ | 2026-06-26 | Real-DB integration test approach: `prisma db push` + dotenv-cli for test DB |
| S8 | web | https://cloudonaut.io/how-to-unit-test-aws-javascript-sdk-v3/ | 2026-06-26 | Unit test Lambda handler by calling `handler(event, ctx, cb)` with mocked SDK |

## Excerpts

### S3 — Testing Lambda functions with Vitest
https://daaru.medium.com/testing-lambda-functions-with-vitest-fc713caa975d
> "Now you can recover the 'core logic' function and test it by replacing the AWS SDK client with a mocked version: `const client = { send: async () => ({ Item: {} }) } // mocked client`"

### S4 — aws-sdk-client-mock
https://github.com/m-radzikowski/aws-sdk-client-mock
> "Easy and powerful mocking of AWS SDK v3 Clients. Let's take a simple Lambda function that takes a list of messages, sends them to SNS topic and returns message IDs"

### S5 — aws-sdk-client-mock-vitest
https://www.npmjs.com/package/aws-sdk-client-mock-vitest
> "import 'aws-sdk-client-mock-jest/vitest'; import { expect } from 'vitest'; // a PublishCommand was sent to SNS expect(snsMock).toHaveReceivedCommand(PublishCommand);"

### S6 — vitest-mock-extended Prisma pattern
https://dev.to/jay818/mastering-unit-testing-a-comprehensive-guide-ing
> "Create __mocks__/db.ts in the src folder, same folder in which db.ts resides. Its a type of convention, vitest looks for any __mocks__ file to know what to mock. import { PrismaClient } from '@prisma/client'; import { mockDeep } from 'vitest-mock-extended'; export const prismaClient = mockDeep<PrismaClient>();"

### S8 — Unit testing AWS Lambda handlers
https://cloudonaut.io/how-to-unit-test-aws-javascript-sdk-v3/
> "In the following, I will share my learnings from writing unit tests by using aws-sdk-client-mock by Maciej Radzikowski. Let's start with a simple example. The following code snippet shows the index.js file containing a handler() function, which could be deployed as a Lambda function."

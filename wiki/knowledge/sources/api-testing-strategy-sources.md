---
id: api-testing-strategy-sources
title: Primary Sources — API Testing Strategy
updated: 2026-06-26
sources:
  - ../../raw/research/api-test-strategy/sources.md
tags: [testing, api, vitest, aws, prisma, lambda, bibliography]
---

# Primary Sources — API Testing Strategy

derived_from::[[api-testing-strategy.md]] | uses::[[../entities/tools/vitest.md]] | uses::[[../entities/tools/aws-sdk-client-mock.md]] | uses::[[../entities/tools/vitest-mock-extended.md]]

Companion bibliography register for the API testing strategy research. Documents 8 primary sources — 2 codebase files and 6 web references — with verbatim excerpts confirming the key patterns.

**Codebase sources:** `packages/web/src/lib/editor/__tests__/readOnlyZonePlugin.test.ts` (S1) confirms the repo already uses `import { describe, it, expect } from 'vitest'`; `packages/api/package.json` (S2) confirms no test runner exists in the API package devDependencies.

**Web sources and their core claims:**
- **S3** (Fabio Gollinucci, Medium): Vitest Lambda testing — inject a mocked client object `{ send: async () => ({...}) }` and call the core logic function directly, separating it from AWS SDK calls.
- **S4** (`github.com/m-radzikowski/aws-sdk-client-mock`): The `aws-sdk-client-mock` library is the AWS SDK team-endorsed standard; it provides `mockClient(ClientClass)` to intercept `client.send(Command)` calls.
- **S5** (`npmjs.com/package/aws-sdk-client-mock-vitest`): The `aws-sdk-client-mock-vitest` extension adds `toHaveReceivedCommand(PublishCommand)` and related matchers to Vitest's `expect`.
- **S6** (dev.to, Jay818): `vitest-mock-extended` deep-mock pattern — create `__mocks__/db.ts` with `export const prismaClient = mockDeep<PrismaClient>()`.
- **S7** (SimpleThread): Real-DB integration path using `prisma db push` + `dotenv-cli` — documented as an upgrade path, not required for ROADMAP-008's handler integration tier.
- **S8** (cloudonaut.io): Unit testing Lambda handlers — call `handler(event, ctx, cb)` directly with mocked SDK clients; explicitly uses `aws-sdk-client-mock`.

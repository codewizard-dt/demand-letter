---
topic: "Assess package and dependency migration issues when moving from Node 20.20.2 to a newer Node version after AWS SDK v3 NodeVersionSupportWarning"
slug: node-22-migration-assessment
researched: 2026-06-28
---

# Primary Sources - Node 22 Migration Assessment

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `package.json` | 2026-06-28 | Root package uses pnpm 9, has no Node engine, and defines root scripts. |
| S2 | codebase | `pnpm-workspace.yaml` | 2026-06-28 | Workspace package scope is `packages/*`. |
| S3 | codebase | `packages/api/package.json` | 2026-06-28 | API dependency ranges include AWS SDK v3 clients, Prisma client, PDF/document libraries, Vitest, tsx, and `@types/node: "*"` with no Node engine. |
| S4 | codebase | `packages/web/package.json` | 2026-06-28 | Web dependency ranges include Vite, Vitest, Playwright, React, Tailwind, TypeScript, and no Node engine. |
| S5 | codebase | `packages/db/package.json` and `packages/db/prisma/schema.prisma` | 2026-06-28 | DB uses Prisma 5 and Node types; Prisma schema uses `native` and `rhel-openssl-3.0.x` binary targets. |
| S6 | codebase | `template.yaml` | 2026-06-28 | SAM template pins Lambda globals, explicit function runtimes, DB layer compatible runtimes, and build method to `nodejs20.x`. |
| S7 | codebase | `packages/api/scripts/build-handlers.mjs` | 2026-06-28 | API esbuild target is Node 20 and WebSocket build externalizes DynamoDB/API Gateway Management API SDK clients. |
| S8 | command | `pnpm list -r --depth 0` | 2026-06-28 | Resolved dependency versions: AWS SDK 3.107x, Prisma 5.22, Vite 5.4.21, Vitest 2.1.9, Playwright 1.61.1, TypeScript 5.9.3, `@types/node` 26.0.0. |
| S9 | codebase | `docker-compose.yml` and `template.yaml` | 2026-06-28 | Local Postgres is 16-alpine and RDS template uses PostgreSQL 16.3; DB runtime is not Node-bound except Prisma/client generation. |
| S10 | package metadata | `pnpm view pdfjs-dist@6.0.227 engines --json` | 2026-06-28 | `pdfjs-dist@6.0.227` requires Node `>=22.13.0 || >=24`. |
| S11 | package metadata | `pnpm view @aws-sdk/client-s3 engines version --json` | 2026-06-28 | Current AWS SDK package metadata reports `@aws-sdk/client-s3@3.1075.0` with `node >=20.0.0`. |
| S12 | runtime warning | Test output warning quoted by user | 2026-06-28 | AWS SDK v3 warning says versions after the first week of January 2027 require Node >=22 and current runtime was Node v20.20.2. |
| S13 | command | `pnpm outdated -r --format table` | 2026-06-28 | Identified major upgrade pressure across Prisma, Vite, Vitest, React, React Router, Tailwind, TypeScript, ESLint, and testing tools. |
| S14 | context7 | `/prisma/prisma` - "What Node.js versions are supported by Prisma 5.22, Prisma 6, and Prisma 7?" | 2026-06-28 | Prisma 7 requires Node `^20.19 || ^22.12 || >=24.0` and pnpm `>=10.15 <11`; Prisma 7 generator model differs from Prisma 5. |
| S15 | context7 | `/vitejs/vite/v5.4.21` - "What Node.js version does Vite 5.4 require?" | 2026-06-28 | Vite 5 requires Node 18+/20+; Vite 7/8 require Node 20.19+ or 22.12+. |
| S16 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm typecheck` | 2026-06-28 | Typecheck passed across DB, web, and API under Node 22.13.1. |
| S17 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm --filter @demand-letter/api build` | 2026-06-28 | API build passed and built 31 handlers under Node 22.13.1. |
| S18 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm --filter @demand-letter/web build` | 2026-06-28 | Web build passed under Node 22.13.1 with Vite CJS API and package type warnings. |
| S19 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm --filter @demand-letter/db db:generate` | 2026-06-28 | Prisma client generation passed under Node 22.13.1. |
| S20 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm --filter @demand-letter/api test` | 2026-06-28 | API test run reached integration tests and failed because `DATABASE_URL` was missing. |
| S21 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm --filter @demand-letter/web test` | 2026-06-28 | Web Vitest run failed because Vitest collected a Playwright e2e spec. |
| S22 | command | `npx -y -p node@22.13.1 -p pnpm@9 pnpm lint` | 2026-06-28 | Lint failed on existing API lint issue and warning budget. |

## Excerpts

### S10 - pdfjs-dist engine metadata

```json
{
  "node": ">=22.13.0 || >=24"
}
```

### S11 - AWS SDK package engine metadata

```json
{
  "engines": {
    "node": ">=20.0.0"
  },
  "version": "3.1075.0"
}
```

### S12 - AWS SDK warning observed by user

```text
Warning: NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)
versions published after the first week of January 2027
will require node >=22. You are running node v20.20.2.
```

### S14 - Prisma 7 engine metadata from Context7

```json
"engines": {
  "node": "^20.19 || ^22.12 || >=24.0",
  "pnpm": ">=10.15 <11"
}
```

### S15 - Vite Node version note from Context7

```text
Vite 7 now requires Node.js 20.19+ or 22.12+.
```

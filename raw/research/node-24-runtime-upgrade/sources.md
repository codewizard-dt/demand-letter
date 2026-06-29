---
topic: "the maximum version of node that would not have any pcompiatiyly issues and upgrade all services to that same version"
slug: node-24-runtime-upgrade
researched: 2026-06-29
---

# Primary Sources - Node 24 Runtime Upgrade

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `raw/research/node-22-migration-assessment/index.md` | 2026-06-29 | Prior repo-specific Node assessment recommended Node 22.13+ at that time and identified the same runtime surfaces to update. |
| S2 | codebase | `app/server/package.json`, `app/db/package.json` | 2026-06-29 | Active server/db packages used `@types/node: "*"` before the upgrade and now carry Node 24 engine/type policy. |
| S3 | codebase | `.github/workflows/ci.yml` | 2026-06-29 | CI previously used Node 20 and was updated to Node 24. |
| S4 | codebase | `template.yaml` | 2026-06-29 | SAM template contained many `nodejs20.x` runtime/build declarations and was updated to `nodejs24.x`. |
| S5 | codebase | `app/server/scripts/build-handlers.mjs` | 2026-06-29 | Handler esbuild target was `node20` and was updated to `node24`. |
| S6 | codebase | `packages/api/package.json`, `packages/db/package.json`, `packages/web/package.json`, `packages/api/scripts/build-handlers.mjs` | 2026-06-29 | Legacy package files still carried stale Node type/build policy and were aligned to Node 24. |
| S7 | web | https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html | 2026-06-29 | AWS Lambda supports `nodejs24.x`, lists Node 26 as an upcoming runtime, and recommends bundling SDK modules for dependency control. |
| S8 | web | https://nodejs.org/en/about/previous-releases | 2026-06-29 | Node release guidance says production apps should use Active or Maintenance LTS releases. |
| S9 | package metadata | `pnpm view vite@5.4.21 engines`, `vitest@2.1.9`, `@prisma/client@5.22.0`, `prisma@5.22.0`, `pdfjs-dist@6.0.227`, `@aws-sdk/client-s3@3.1075.0` | 2026-06-29 | Key package engine ranges all allow Node 24. |
| S10 | codebase search | `rg "callback\\(|context\\.succeed|context\\.fail|export const handler" app packages template.yaml .github package.json` | 2026-06-29 | Found async handler exports and no callback/context completion APIs in active handlers. |
| S11 | command | `npx -y -p node@24 -p pnpm@9 node -v` | 2026-06-29 | Node 24 resolved to `v24.18.0` for verification. |
| S12 | command | `pnpm install` | 2026-06-29 | Lockfile updated; ambient Node 26 produced expected engine warnings after adding Node 24 engines. |
| S13 | command | `npx -y -p node@24 -p pnpm@9 pnpm --filter @demand-letter/db db:generate` | 2026-06-29 | Prisma generate passed under Node 24. |
| S14 | command | `npx -y -p node@24 -p pnpm@9 pnpm --filter @demand-letter/server typecheck` and web typecheck | 2026-06-29 | Server and web typechecks passed under Node 24. |
| S15 | command | `npx -y -p node@24 -p pnpm@9 pnpm --filter @demand-letter/server build`, web build, db build | 2026-06-29 | Server, web, and db builds passed under Node 24; web build completed without the earlier Vite CJS/typeless package warnings. |
| S16 | command | `sam validate` and `sam validate --lint` | 2026-06-29 | Basic SAM validation passed with `nodejs24.x`; lint failed only on existing RDS/SNS warnings, not Node runtime syntax. |

## Excerpts

### S7 - AWS Lambda supported runtimes
https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
> Node.js 24
> `nodejs24.x`
> Amazon Linux 2023
> Apr 30, 2028

### S7 - AWS Lambda upcoming runtime
https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
> Node.js 26 - November 2026

### S7 - AWS Lambda SDK dependency control
https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
> we recommend that you always include the SDK modules your code uses

### S8 - Node.js production release guidance
https://nodejs.org/en/about/previous-releases
> Production applications should only use Active LTS or Maintenance LTS releases.

### S9 - package engine metadata

```json
vite@5.4.21: { "node": "^18.0.0 || >=20.0.0" }
vitest@2.1.9: { "node": "^18.0.0 || >=20.0.0" }
@prisma/client@5.22.0: { "node": ">=16.13" }
prisma@5.22.0: { "node": ">=16.13" }
pdfjs-dist@6.0.227: { "node": ">=22.13.0 || >=24" }
@aws-sdk/client-s3@3.1075.0: { "node": ">=20.0.0" }
```

### S11 - Node 24 verification version

```text
v24.18.0
```

### S16 - SAM validation

```text
template.yaml is a valid SAM Template
```

```text
Linting failed: Engine version '16.3' for engine 'postgres' is deprecated
```

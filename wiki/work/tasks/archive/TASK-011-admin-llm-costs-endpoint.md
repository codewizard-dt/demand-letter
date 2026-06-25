---
id: TASK-011
title: "GET /admin/llm-costs Endpoint"
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: [TASK-008]
blocks: []
parallel_safe_with: [TASK-012]
uat: "[[UAT-011]]"
tags: [api, admin, llm-audit, cost, phase-2]
---

# TASK-011 — GET /admin/llm-costs Endpoint

## Objective

Implement `GET /admin/llm-costs` — a Lambda-backed API endpoint that returns per-feature aggregate statistics (call count, total input/output tokens, total cost in USD) plus the last 100 raw `LlmAuditLog` rows. A `?days=N` query parameter (default 30) controls the lookback window. This endpoint powers the cost dashboard page and gives operators visibility into LLM spend broken down by feature.

## Approach

Query `LlmAuditLog` via Prisma with a `createdAt >= cutoff` filter. For aggregates, use `groupBy(['feature'])` with `_sum` and `_count`. For raw rows, use `findMany` with `orderBy: { createdAt: 'desc' }` and `take: 100`. Return JSON with `{ aggregates: [...], recentRows: [...] }`. Wire the Lambda in the SAM template under the existing API Gateway, following the pattern established by other handlers in `packages/api/src/handlers/`.

## Steps

### 1. Locate the handlers directory  <!-- agent: Explore -->

- [x] Use `mcp__serena__list_dir` on `packages/api/src/handlers/` to find existing handler files <!-- Completed: 2026-06-23 -->
  - Identify the naming convention (e.g., `get-jobs.ts`, `post-jobs.ts`)
  - Read one existing handler to understand the response shape and Prisma import pattern

### 2. Create `packages/api/src/handlers/get-admin-llm-costs.ts`  <!-- agent: general-purpose -->

- [x] Create the handler file: <!-- Completed: 2026-06-23 -->

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { prisma } from '@demand-letter/db';

export const handler: APIGatewayProxyHandler = async (event) => {
  const days = parseInt(event.queryStringParameters?.days ?? '30', 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [aggregates, recentRows] = await Promise.all([
    prisma.llmAuditLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: cutoff } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      orderBy: { _sum: { estimatedCostUsd: 'desc' } },
    }),
    prisma.llmAuditLog.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        feature: true,
        model: true,
        provider: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        durationMs: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aggregates, recentRows }),
  };
};
```

### 3. Register in SAM template  <!-- agent: general-purpose -->

- [x] Open `template.yaml` (repo root or `packages/api/template.yaml`) <!-- Completed: 2026-06-23 -->
- [x] Add a new Lambda function resource following the existing pattern: <!-- Completed: 2026-06-23 -->

```yaml
GetAdminLlmCostsFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/handlers/get-admin-llm-costs.handler
    Events:
      Api:
        Type: Api
        Properties:
          Path: /admin/llm-costs
          Method: get
    Layers:
      - !Ref DbLayer
    Environment:
      Variables:
        DATABASE_URL: !Sub '{{resolve:ssm:/${Stage}/demand-letter/db/url}}'
```

  - Adjust `Layers`, `CodeUri`, `Runtime`, and `Environment` to match the existing function resources

### 4. TypeScript compilation check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from repo root — must pass with zero errors <!-- Completed: 2026-06-23 -->
- [x] Verify the `estimatedCostUsd` aggregation compiles (Prisma `_sum` returns `Decimal | null` — cast or handle as needed) <!-- Completed: 2026-06-23 -->

### 5. Local smoke test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Run `sam local start-api` (or the project's dev server command)
- [DEFERRED-TO-UAT] `curl "http://localhost:3000/admin/llm-costs?days=30"` — must return `{ aggregates: [], recentRows: [] }` (empty DB is fine at this stage)

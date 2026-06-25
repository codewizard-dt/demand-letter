---
id: TASK-012
title: "Admin Cost Dashboard Page /admin/usage"
status: done
created: 2026-06-23
updated: 2026-06-23
depends_on: [TASK-011, TASK-013]
blocks: []
parallel_safe_with: []
uat: "[[UAT-012]]"
tags: [frontend, admin, llm-audit, cost, phase-2, phase-4]
---

# TASK-012 — Admin Cost Dashboard Page /admin/usage

## Objective

Build the `/admin/usage` React page in `packages/web` that fetches from `GET /admin/llm-costs` and renders: (1) a per-feature cost summary table with call counts, token totals, and USD costs; (2) a paginated/scrollable table of recent raw `LlmAuditLog` rows. This is a port of the `llm-cost-section.tsx` pattern from the jobfinder project, adapted to this app's stack and the Steno style guide (TASK-013 style tokens).

## Approach

Create a single-page React component at `packages/web/src/pages/admin/UsagePage.tsx`. Use `fetch` (or the app's API client) to call `GET /admin/llm-costs?days=30`. Render two tables using Tailwind utility classes consistent with the Steno style guide. Add a route entry in the app router. No auth guard is required at this skeleton stage — a comment noting it should be protected in production is sufficient.

## Steps

### 1. Confirm the frontend scaffold and router exist  <!-- agent: Explore -->

- [x] Use `mcp__serena__list_dir` on `packages/web/src/` to verify the scaffold from TASK-013 is in place <!-- Completed: 2026-06-23 — no scaffold exists yet; only main.tsx; no router, no pages/, no lib/ directory. Must bootstrap React Router + App.tsx as part of this task. -->
  - Locate the router file (likely `App.tsx`, `router.tsx`, or `routes.tsx`)
  - Identify the page directory convention (e.g., `src/pages/`)

### 2. Create the API client call  <!-- agent: general-purpose -->

- [x] In `packages/web/src/lib/api.ts` (create if absent), add: <!-- Completed: 2026-06-23 -->

```typescript
export interface LlmCostAggregate {
  feature: string;
  _count: { id: number };
  _sum: { inputTokens: number | null; outputTokens: number | null; estimatedCostUsd: string | null };
}

export interface LlmAuditRow {
  id: string;
  userId: string;
  feature: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: string;
  durationMs: number;
  createdAt: string;
}

export async function fetchLlmCosts(days = 30): Promise<{
  aggregates: LlmCostAggregate[];
  recentRows: LlmAuditRow[];
}> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/llm-costs?days=${days}`);
  if (!res.ok) throw new Error(`llm-costs fetch failed: ${res.status}`);
  return res.json();
}
```

### 3. Create `packages/web/src/pages/admin/UsagePage.tsx`  <!-- agent: general-purpose -->

- [x] Create the page component: <!-- Completed: 2026-06-23 -->

```tsx
import { useEffect, useState } from 'react';
import { fetchLlmCosts, LlmCostAggregate, LlmAuditRow } from '../../lib/api';

export default function UsagePage() {
  const [aggregates, setAggregates] = useState<LlmCostAggregate[]>([]);
  const [recentRows, setRecentRows] = useState<LlmAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLlmCosts(30)
      .then(({ aggregates, recentRows }) => {
        setAggregates(aggregates);
        setRecentRows(recentRows);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-sm text-gray-500">Loading...</p>;
  if (error) return <p className="p-6 text-sm text-red-500">{error}</p>;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">LLM Usage & Cost</h1>

      {/* Per-feature aggregate table */}
      <section>
        <h2 className="mb-3 text-lg font-medium">By Feature (last 30 days)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Feature</th>
              <th className="pb-2 pr-4 text-right">Calls</th>
              <th className="pb-2 pr-4 text-right">Input Tokens</th>
              <th className="pb-2 pr-4 text-right">Output Tokens</th>
              <th className="pb-2 text-right">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {aggregates.map((row) => (
              <tr key={row.feature} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{row.feature}</td>
                <td className="py-2 pr-4 text-right">{row._count.id}</td>
                <td className="py-2 pr-4 text-right">{(row._sum.inputTokens ?? 0).toLocaleString()}</td>
                <td className="py-2 pr-4 text-right">{(row._sum.outputTokens ?? 0).toLocaleString()}</td>
                <td className="py-2 text-right">${parseFloat(row._sum.estimatedCostUsd ?? '0').toFixed(4)}</td>
              </tr>
            ))}
            {aggregates.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-gray-400">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Recent raw rows */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Recent Calls (last 100)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3">When</th>
                <th className="pb-2 pr-3">Feature</th>
                <th className="pb-2 pr-3">Model</th>
                <th className="pb-2 pr-3 text-right">In</th>
                <th className="pb-2 pr-3 text-right">Out</th>
                <th className="pb-2 pr-3 text-right">Cost</th>
                <th className="pb-2 text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 text-gray-400">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="py-1.5 pr-3 font-mono">{row.feature}</td>
                  <td className="py-1.5 pr-3 text-gray-500">{row.model}</td>
                  <td className="py-1.5 pr-3 text-right">{row.inputTokens.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right">{row.outputTokens.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right">${parseFloat(row.estimatedCostUsd).toFixed(6)}</td>
                  <td className="py-1.5 text-right">{row.durationMs}</td>
                </tr>
              ))}
              {recentRows.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-400">No calls recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

  - Apply Steno style tokens (colors, font stack) from the style guide produced in TASK-013 once available — Tailwind classes above are placeholders

### 4. Register the route  <!-- agent: general-purpose -->

- [x] In the app router file (e.g., `packages/web/src/App.tsx` or `routes.tsx`), add: <!-- Completed: 2026-06-23 — Created App.tsx with BrowserRouter + Routes; / redirects to /admin/usage; also updated main.tsx to render <App /> -->
  ```tsx
  import UsagePage from './pages/admin/UsagePage';
  // ...
  <Route path="/admin/usage" element={<UsagePage />} />
  ```
  - If using React Router v6, confirm the `<Routes>` wrapper pattern matches existing routes

### 5. TypeScript compilation check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from repo root — must pass with zero errors <!-- Completed: 2026-06-23 — zero errors; tsconfig.json was updated with "types": ["vite/client"] to fix ImportMeta.env -->
- [DEFERRED-TO-UAT] Verify the page renders without runtime errors when `VITE_API_URL` is set to the local SAM endpoint

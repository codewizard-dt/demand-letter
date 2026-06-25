---
id: TASK-047
title: "Generate Button Gap Gate: Disable Until Gap Report Clears"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: []
parallel_safe_with: [TASK-045, TASK-046]
uat: "[[UAT-047]]"
tags: [frontend, generation, gap-report, sufficiency]
---

# TASK-047 — Generate Button Gap Gate: Disable Until Gap Report Clears

## Objective

Update `packages/web/src/pages/GeneratePage.tsx` so the "Generate Demand Letter" button is disabled by default and only becomes enabled once `GET /jobs/:id/gap-report` returns a response with an empty `gaps` array (meaning all required template slots are covered). While gaps remain, the button shows `disabled:opacity-50 disabled:cursor-not-allowed` styling, a native `title` tooltip on hover, and a persistent inline `<p>` message beneath the button explaining exactly how many slots are uncovered and directing the attorney to the gap report page. Also extract the shared `GapReport`/`GapItem` TypeScript interfaces and the `fetchGapReport` API helper into `packages/web/src/lib/api.ts` to eliminate duplication with `GapReportPage.tsx`.

## Approach

The codebase uses plain `fetch`, `useState`, and `useEffect` — no SWR or React Query. `GapReportPage.tsx` already implements the gap-report fetch pattern (`useCallback` + `useEffect`) and gates its own "Proceed to Generate" button on `report.gaps.length > 0`. `GeneratePage.tsx` does not currently fetch the gap report at all; its button is only gated on the `isGenerating` boolean.

The fix has three parts:
1. Promote `GapReport`/`GapItem` interfaces and a new `fetchGapReport()` helper to `api.ts` so both pages share them.
2. Add a `useEffect` to `GeneratePage` that calls `fetchGapReport` on mount and stores the result.
3. Gate the Generate button on `gapReport?.gaps.length === 0`, add a `title` tooltip, and render an inline message while gaps remain.

No new npm packages are needed. Tailwind's `disabled:cursor-not-allowed` is added to the button's className alongside the existing `disabled:opacity-50`. The inline message uses a plain `<p>` with Tailwind utility classes.

The `GapReportPage.tsx` local interface declarations (`GapItem`, `GapReport`) are replaced with imports from `api.ts` to keep types in sync. Its fetch logic remains unchanged.

## Steps

### 1. Add shared types and `fetchGapReport` to `api.ts`  <!-- agent: general-purpose -->

File: `packages/web/src/lib/api.ts`

- [x] Use `mcp__serena__get_symbols_overview` on `packages/web/src/lib/api.ts` to see the current symbol list (confirm there is no existing `GapReport` / `fetchGapReport`). <!-- Completed: 2026-06-25 -->
- [x] Add the following exports **before** the first existing function in the file (use `mcp__serena__insert_before_symbol` with the first function symbol `createJob`): <!-- Completed: 2026-06-25 -->
  ```ts
  export interface GapItem {
    fieldName: string;
    nullReason: string | null;
    acceptMissing: boolean;
  }

  export interface GapReport {
    covered: number;
    total: number;
    gaps: GapItem[];
  }

  export async function fetchGapReport(jobId: string): Promise<GapReport> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/gap-report`);
    if (!res.ok) throw new Error(`GET /jobs/${jobId}/gap-report failed: ${res.status}`);
    return res.json() as Promise<GapReport>;
  }
  ```
  - The `API_BASE` constant is already defined in this file at the module level — no new import needed.

### 2. Update `GapReportPage.tsx` to import types from `api.ts`  <!-- agent: general-purpose -->

File: `packages/web/src/pages/GapReportPage.tsx`

- [x] Use `mcp__serena__find_symbol` on `GapItem` and `GapReport` to locate the local interface declarations (lines 3–13, 0-based). Confirm their exact line range. <!-- Completed: 2026-06-25 -->
- [x] Use `mcp__serena__delete_lines` to remove the two local interface blocks (`GapItem` lines 3–8, `GapReport` lines 9–13 — verify exact 0-based line numbers first). <!-- Completed: 2026-06-25 -->
- [x] Use `mcp__serena__replace_content` (literal mode) to add the import at the top of the file. The current first import is `import { useState, useCallback, useEffect } from 'react';` (line 0). Insert after it:
  ```ts
  import { fetchGapReport, GapReport, GapItem } from '../lib/api';
  ```
  Replace the existing `import { useState, useCallback, useEffect } from 'react';` line with:
  ```ts
  import { useState, useCallback, useEffect } from 'react';
  import { GapReport, GapItem } from '../lib/api';
  ```
  (Keep `fetchGapReport` out of this import since `GapReportPage` uses its own inline `fetch` for the callback pattern — only the types need importing here.) <!-- Completed: 2026-06-25 -->
- [x] Verify the file still references `GapReport` and `GapItem` types correctly via the import (TypeScript will catch it at typecheck time). <!-- Completed: 2026-06-25 -->

### 3. Rewrite `GeneratePage.tsx` to gate the button on gap-report state  <!-- agent: general-purpose -->

File: `packages/web/src/pages/GeneratePage.tsx`

- [x] Use `mcp__serena__find_symbol` with `include_body=true` on `GeneratePage` to read the current full component body. <!-- Completed: 2026-06-25 -->
- [x] Add the `fetchGapReport` and `GapReport` import. The current imports are:
  - Check line 0–3 of the file for existing imports using `get_symbols_overview` or `find_symbol`.
  - Use `mcp__serena__replace_content` (literal) to update the existing React import line and add a new api import. Expected current imports:
    ```ts
    import { useParams } from 'react-router-dom';
    import { useState } from 'react';
    import { generateJob, downloadOutput } from '../lib/api';
    ```
    Replace the `api` import line with:
    ```ts
    import { generateJob, downloadOutput, fetchGapReport, GapReport } from '../lib/api';
    ```
  <!-- Completed: 2026-06-25 -->
- [x] Add gap-report state variables. Use `mcp__serena__replace_content` (literal) to insert after the line `const [isDownloading, setIsDownloading] = useState(false);`:
  ```ts
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [gapLoading, setGapLoading] = useState(true);
  const [gapError, setGapError] = useState<string | null>(null);
  ```
  <!-- Completed: 2026-06-25 -->
- [x] Add a `useEffect` to fetch the gap report on mount. Add it after the state declarations block and before the `handleGenerate` function. Use `mcp__serena__insert_before_symbol` targeting `handleGenerate`:
  ```ts
  useEffect(() => {
    if (!id) return;
    setGapLoading(true);
    fetchGapReport(id)
      .then((report) => setGapReport(report))
      .catch((e: Error) => setGapError(e.message))
      .finally(() => setGapLoading(false));
  }, [id]);
  ```
  - Also add `useEffect` to the React import: update `import { useState } from 'react';` → `import { useState, useEffect } from 'react';`
  <!-- Completed: 2026-06-25 -->
- [x] Add derived state for button enablement. Insert before the `return` statement (use `mcp__serena__replace_content` literal to inject just before `return (`):
  ```ts
  const canGenerate = !gapLoading && !gapError && gapReport !== null && gapReport.gaps.length === 0;
  const disabledReason = gapLoading
    ? 'Checking sufficiency — please wait…'
    : gapError
      ? `Could not check gap report: ${gapError}`
      : gapReport && gapReport.gaps.length > 0
        ? `${gapReport.gaps.length} required slot${gapReport.gaps.length === 1 ? '' : 's'} still uncovered. Go to the Gap Report to fill or accept them before generating.`
        : null;
  ```
  <!-- Completed: 2026-06-25 -->
- [x] Update the Generate button JSX. Use `mcp__serena__replace_content` (literal) to replace the current button block:
  ```tsx
  {!isDone && (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {isGenerating ? 'Generating…' : 'Generate Demand Letter'}
    </button>
  )}
  ```
  With:
  ```tsx
  {!isDone && (
    <div>
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        title={disabledReason ?? undefined}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Generating…' : 'Generate Demand Letter'}
      </button>
      {disabledReason && !isGenerating && (
        <p className="mt-2 text-sm text-yellow-700">{disabledReason}</p>
      )}
    </div>
  )}
  ```
  <!-- Completed: 2026-06-25 -->

### 4. Typecheck the web package  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/web typecheck` from the repo root.
  - Expected: exits 0 with no type errors.
  - If errors appear:
    - `Property 'gaps' does not exist` → the `GapReport` import is missing or wrong path; verify step 1 and step 3 imports.
    - `useEffect is not defined` → add `useEffect` to the React import in `GeneratePage.tsx`.
    - Any `GapItem`/`GapReport` "not exported" errors → verify step 1 added `export interface` (not just `interface`).
  - Fix any errors before marking this step done.
  <!-- Completed: 2026-06-25 — Also fixed pre-existing PRIORITY_SLOTS undefined error in GapReportPage.tsx -->

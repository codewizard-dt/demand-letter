---
topic: "How is the frontend generation page currently structured, and how does GET /jobs/:id/gap-report work? I need to understand: (1) the React component file for the generation page/view, (2) any existing hooks or fetchers for /jobs/:id/gap-report, (3) how the Generate button is currently rendered and what controls its state, (4) any tooltip or disabled-state patterns already used in the frontend. The goal is to write a task file for disabling the Generate button until the gap report returns no gaps."
slug: generate-button-gap-gate
researched: 2026-06-25
sources: [./sources.md]
---

# Research: Generate Button Gap Gate

> The frontend already has two separate pages handling generation (`GeneratePage.tsx`) and the sufficiency gate (`GapReportPage.tsx`). The Generate button in `GeneratePage.tsx` is only gated on `isGenerating` state — it has no awareness of the gap report. `GapReportPage.tsx` **already** fetches `GET /jobs/:id/gap-report` and disables its own "Proceed to Generate" button on `report.gaps.length > 0`, but that page navigates to `/jobs/:id/output` rather than to `GeneratePage`. The task is to wire `GeneratePage` to fetch the gap report on mount and disable/explain the Generate button until gaps === 0. No new packages are needed; the pattern uses plain `fetch` + React state, consistent with the existing codebase.

## Research Questions

1. What is the current structure of `GeneratePage.tsx` — state, event handlers, JSX?
2. How does `GET /jobs/:id/gap-report` work and what does it return?
3. Does a fetcher/hook for the gap-report endpoint already exist in `packages/web/src/lib/api.ts`?
4. What disabled-state and tooltip patterns are already used in the frontend?
5. Are there shared types for `GapReport` / `GapItem` or are they local to `GapReportPage.tsx`?

## Current State (Codebase)

### `packages/web/src/pages/GeneratePage.tsx` [S1]

The component has these state variables:
- `output: string` — accumulated SSE chunks
- `isGenerating: boolean` — true while SSE stream is in flight
- `isDone: boolean` — true once stream completes
- `error: string | null`
- `isDownloading: boolean`

The Generate button is rendered as:
```tsx
<button
  onClick={handleGenerate}
  disabled={isGenerating}
  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
>
  {isGenerating ? 'Generating…' : 'Generate Demand Letter'}
</button>
```

No gap-report awareness. The button is enabled as soon as the page loads (unless actively generating).

### `packages/api/src/handlers/get-jobs-gap-report.ts` [S2]

Handler calls `computeGapReport(jobId)` from `packages/api/src/lib/sufficiency-gate.ts` [S3] and returns:
```json
{ "covered": 12, "total": 14, "gaps": [{ "fieldName": "...", "nullReason": "...", "acceptMissing": false }] }
```
`gaps` is an empty array `[]` when all slots are covered.

### `packages/web/src/pages/GapReportPage.tsx` [S4]

- Fetches `GET /jobs/:id/gap-report` inline via `fetch()` in a `useCallback` + `useEffect` pattern
- Defines local interfaces `GapItem` and `GapReport` — **not exported or shared**
- Has a "Proceed to Generate" button that is `disabled={report.gaps.length > 0 || generating}`
- When clicked, it calls `POST /jobs/:id/generate` directly and navigates to `/jobs/:id/output` (not to `GeneratePage`)
- Uses `style={{ cursor: ... }}` for visual disabled state — no `title` tooltip attribute

### `packages/web/src/lib/api.ts` [S5]

Contains `generateJob()` (SSE streamer) but **no function for fetching the gap report**. Gap report is fetched ad-hoc in `GapReportPage.tsx`.

### Routing — `packages/web/src/App.tsx` [S6]

```
/jobs/:id/generate   → GeneratePage
/jobs/:id/gap-report → GapReportPage
```

These are separate routes/pages. `GeneratePage` is a standalone route — it does not share state with `GapReportPage`.

### Disabled-state conventions [S1, S4]

- Tailwind pattern: `disabled:opacity-50` on the button
- `GapReportPage` also sets inline `cursor: 'not-allowed'` but `GeneratePage` does not
- No tooltip (`title` attribute) is used anywhere in the codebase currently
- No shared tooltip component exists

### Tech stack [S7]

React 18, React Router v6, Tailwind CSS 3, Vite. No component library (no Radix, MUI, etc.). Any tooltip must be implemented with a native `title` attribute or a lightweight inline approach.

## Key Findings

1. **`GeneratePage.tsx` has zero gap-report awareness** [S1] — the button is always enabled on page load.
2. **`GapReportPage.tsx` already has the fetch + disable pattern** [S4] — it can serve as a reference implementation.
3. **No shared `fetchGapReport` API function exists** [S5] — one should be added to `packages/web/src/lib/api.ts` so both pages can share it.
4. **`GapReport` / `GapItem` types are local to `GapReportPage.tsx`** [S4] — for sharing they either need to be exported from that file or moved to `api.ts`.
5. **Tooltip mechanism**: the codebase uses no tooltip library. The simplest correct approach is the native HTML `title` attribute on the button (or its wrapper) — visible on hover, no new dependency. An inline message (`<p>`) is a valid alternative for always-visible explanation.
6. **Two generate paths exist**: `GapReportPage` calls `POST /generate` directly; `GeneratePage` calls it via `generateJob()` in `api.ts`. The task must gate `GeneratePage`'s button, not `GapReportPage`'s (which is already gated).

## Constraints

- No component library installed — tooltips must use native `title` attribute or inline text.
- Patterns use plain `fetch`, `useState`, `useEffect` — no SWR, React Query, or custom hooks beyond `useCallback`.
- `GapReport` / `GapItem` types must be exported or duplicated so `GeneratePage` can use them.
- The gap-report fetch should use the same `API_BASE` constant (from `api.ts`).
- Existing disabled pattern is `disabled:opacity-50` (Tailwind) — the new button state should be consistent.

## Recommendation

**Add a `fetchGapReport(jobId)` function to `packages/web/src/lib/api.ts` and export the `GapReport` / `GapItem` interfaces from there. In `GeneratePage.tsx`, call `fetchGapReport` on mount (and re-call after each generate attempt if needed), store the result in state, and gate the button on `gapReport?.gaps.length === 0`.**

### Implementation outline

1. **`packages/web/src/lib/api.ts`** — add and export:
   ```ts
   export interface GapItem { fieldName: string; nullReason: string | null; acceptMissing: boolean; }
   export interface GapReport { covered: number; total: number; gaps: GapItem[]; }
   export async function fetchGapReport(jobId: string): Promise<GapReport> {
     const res = await fetch(`${API_BASE}/jobs/${jobId}/gap-report`);
     if (!res.ok) throw new Error(`GET /jobs/${jobId}/gap-report failed: ${res.status}`);
     return res.json();
   }
   ```

2. **`packages/web/src/pages/GeneratePage.tsx`** — add state + effect:
   ```ts
   const [gapReport, setGapReport] = useState<GapReport | null>(null);
   const [gapLoading, setGapLoading] = useState(true);
   const [gapError, setGapError] = useState<string | null>(null);
   ```
   On mount:
   ```ts
   useEffect(() => {
     if (!id) return;
     fetchGapReport(id)
       .then(setGapReport)
       .catch(e => setGapError(e.message))
       .finally(() => setGapLoading(false));
   }, [id]);
   ```
   Gate the button:
   ```tsx
   const canGenerate = gapReport !== null && gapReport.gaps.length === 0;
   const disabledReason = gapLoading
     ? 'Checking sufficiency…'
     : gapError
       ? 'Could not load gap report'
       : gapReport && gapReport.gaps.length > 0
         ? `${gapReport.gaps.length} required slot(s) still uncovered — complete the gap report first`
         : null;
   ```
   Button:
   ```tsx
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
   ```

3. **`packages/web/src/pages/GapReportPage.tsx`** — replace local `GapReport`/`GapItem` interface declarations with imports from `api.ts`. (This is a refactor step to avoid type duplication; the fetch logic in `GapReportPage` stays as-is since it uses `fetchReport` internally.)

### Risks and mitigations

- **Race condition**: user navigates directly to `/jobs/:id/generate` before extraction is complete. Mitigated by showing "Checking sufficiency…" while `gapLoading` is true and keeping the button disabled.
- **Stale gap state**: if the user fills gaps in `GapReportPage` then navigates to `GeneratePage` without the page remounting. The `useEffect` fires on mount so it will always fetch fresh on arrival.
- **Type duplication**: `GapReport`/`GapItem` defined in two files. Mitigated by moving them to `api.ts` in step 3.

## Next Steps

- Task created for this work — see `wiki/work/tasks/TASK-045-generate-button-gap-gate.md`
- Run `/uat-generate TASK-045` after implementation to create UAT tests
- After UAT passes, check off the roadmap item in ROADMAP-004 Phase 4

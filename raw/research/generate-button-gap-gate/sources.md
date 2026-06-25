---
topic: "How is the frontend generation page currently structured, and how does GET /jobs/:id/gap-report work? I need to understand: (1) the React component file for the generation page/view, (2) any existing hooks or fetchers for /jobs/:id/gap-report, (3) how the Generate button is currently rendered and what controls its state, (4) any tooltip or disabled-state patterns already used in the frontend. The goal is to write a task file for disabling the Generate button until the gap report returns no gaps."
slug: generate-button-gap-gate
researched: 2026-06-25
---

# Primary Sources — Generate Button Gap Gate

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/web/src/pages/GeneratePage.tsx::GeneratePage` | 2026-06-25 | Full component body: state variables (`isGenerating`, `isDone`, etc.), Generate button JSX with `disabled={isGenerating}`, Tailwind `disabled:opacity-50` pattern |
| S2 | codebase | `packages/api/src/handlers/get-jobs-gap-report.ts::handler` | 2026-06-25 | Handler calls `computeGapReport(jobId)` and returns `{ covered, total, gaps }` JSON; no auth on the route itself |
| S3 | codebase | `packages/api/src/lib/sufficiency-gate.ts::computeGapReport` | 2026-06-25 | Gap logic: slots not covered when confidence < threshold OR not attorney-filled OR not acceptMissing; `gaps` is empty array when all satisfied |
| S4 | codebase | `packages/web/src/pages/GapReportPage.tsx::GapReportPage` | 2026-06-25 | Reference implementation for fetching gap report (useCallback + useEffect), local `GapReport`/`GapItem` interfaces, "Proceed to Generate" button gated on `report.gaps.length > 0`, uses `style.cursor` for disabled visual, no `title` tooltip |
| S5 | codebase | `packages/web/src/lib/api.ts` | 2026-06-25 | `generateJob()` function (SSE), `API_BASE` constant — **no `fetchGapReport` function** exists |
| S6 | codebase | `packages/web/src/App.tsx::App` | 2026-06-25 | Routing: `/jobs/:id/generate` → `GeneratePage`; `/jobs/:id/gap-report` → `GapReportPage` — separate routes |
| S7 | codebase | `packages/web/package.json` | 2026-06-25 | React 18, react-router-dom ^6.30.4, Tailwind CSS 3 — no component library (no Radix, MUI, etc.) |

## Excerpts

### S1 — GeneratePage Generate button
`packages/web/src/pages/GeneratePage.tsx`, lines 50–57 (0-based)
```tsx
<button
  onClick={handleGenerate}
  disabled={isGenerating}
  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
>
  {isGenerating ? 'Generating…' : 'Generate Demand Letter'}
</button>
```
*Only gated on `isGenerating`; no gap-report awareness.*

### S2 — gap-report handler return
`packages/api/src/handlers/get-jobs-gap-report.ts`, lines 14–18 (0-based)
```ts
const report = await computeGapReport(jobId);
return {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(report),
};
```

### S3 — computeGapReport gap condition
`packages/api/src/lib/sufficiency-gate.ts`, lines 35–45 (0-based)
```ts
const covered =
  f !== undefined &&
  (
    f.acceptMissing ||
    f.source === 'attorney-judgment' ||
    (!f.isNull && f.confidence >= threshold)
  );
if (!covered) {
  gaps.push({ fieldName: slot.slotName, nullReason: f?.nullReason ?? null, acceptMissing: f?.acceptMissing ?? false });
}
```

### S4 — GapReportPage "Proceed to Generate" button
`packages/web/src/pages/GapReportPage.tsx`, lines 163–166 (0-based)
```tsx
<button
  onClick={handleGenerate}
  disabled={report.gaps.length > 0 || generating}
  style={{ padding: '8px 16px', cursor: report.gaps.length === 0 && !generating ? 'pointer' : 'not-allowed' }}
>
```
*Already gated; but this is a different page from `GeneratePage`.*

### S4b — GapReportPage local interfaces (not exported)
`packages/web/src/pages/GapReportPage.tsx`, lines 3–13 (0-based)
```ts
interface GapItem {
  acceptMissing: boolean;
  fieldName: string;
  nullReason: string | null;
}

interface GapReport {
  covered: number;
  total: number;
  gaps: GapItem[];
}
```

### S5 — api.ts has no gap-report fetcher
`packages/web/src/lib/api.ts` — symbols overview shows: `createJob`, `downloadOutput`, `fetchLlmCosts`, `generateJob`, `getTemplateZones`, `patchTemplateZones`, `uploadFile`. No `fetchGapReport`.

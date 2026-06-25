---
topic: "Frontend SSE consumer architecture: how should the React frontend connect to POST /jobs/:id/generate, read SSE data: chunks with fetch + ReadableStream, show a \"Building document…\" progress indicator/spinner, and stop on event: complete — covering the relevant frontend component files, state management approach, and API client patterns already in use in this codebase."
slug: frontend-sse-consumer
researched: 2026-06-25
sources: [./sources.md]
---

# Research: Frontend SSE Consumer Architecture

> The `generateJob` function in `packages/web/src/lib/api.ts` already uses `fetch` + `ReadableStream` but **does not parse SSE format** — it passes raw bytes to `onChunk`. The backend (TASK-042) emits `data: <chunk>\n\n` lines and terminates with `event: complete\ndata: \n\n`. The fix is: (1) update `generateJob` to buffer incoming text, split on `\n\n`, strip `data: ` prefixes, detect `event: complete` and stop; (2) update `GeneratePage` to replace the button-label-only indicator with a Tailwind spinner + "Building document…" text while generating. No new dependencies needed.

## Research Questions

1. What does the current `generateJob` function do, and what does it need to change to parse SSE format?
2. What SSE event format does the backend emit (from TASK-042)?
3. What state and UI exists in `GeneratePage.tsx` today?
4. What is the minimal correct SSE parsing approach for `fetch` + `ReadableStream` in a browser?
5. What spinner/progress component fits the existing Tailwind-based UI?

## Current State (Codebase)

### `packages/web/src/lib/api.ts` — `generateJob` [S1]

```ts
export async function generateJob(jobId: string, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/generate failed: ${res.status}`);
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
```

**Problem**: passes raw bytes to `onChunk` — the `data: ` SSE prefix and `\n\n` separators are included verbatim. Does not detect `event: complete` to stop early.

### `packages/web/src/pages/GeneratePage.tsx` — `GeneratePage` [S2]

State: `output`, `isGenerating`, `isDone`, `error`, `isDownloading`.

- `handleGenerate` calls `generateJob(id!, (chunk) => setOutput((prev) => prev + chunk))` and sets `isDone = true` on completion.
- UI: button label changes to `"Generating…"` while active — no spinner, no "Building document…" text.
- After done: "Download Demand Letter" button appears.

### Backend SSE format (TASK-042) [S3]

```ts
const chunks = narrativeText.match(/.{1,80}/gs) ?? [narrativeText];
const sseBody = chunks.map(c => `data: ${c}\n\n`).join('') + 'event: complete\ndata: \n\n';
```

Each text chunk: `data: <text>\n\n`
Completion event: `event: complete\ndata: \n\n`

### Stack constraints [S4]

- React 18, react-router-dom v6, Tailwind CSS 3, TypeScript, Vite (no Redux, no Zustand, local `useState` only)
- No new runtime dependencies may be added for this task (all needed APIs are browser-native)
- `API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`

## Key Findings

**Finding 1 — SSE parsing gap** [S1, S3]: `generateJob` calls `onChunk` with the raw SSE-formatted bytes including `data: ` prefixes and `\n\n` terminators. The `GeneratePage` therefore renders the SSE formatting noise into the `<pre>` output box. The fix must: buffer decoded text, split on `\n\n`, check each block for `event:` line (stop if `event: complete`), extract the `data:` payload, and call `onChunk` with clean text only.

**Finding 2 — `event: complete` never terminates the loop early** [S1, S3]: The current `while (true)` loop only stops when `done === true` (TCP close). The backend closes the connection after sending `event: complete\ndata: \n\n`, so in practice `done` eventually becomes true, but the SSE semantics require stopping at `event: complete` explicitly (future versions may keep the connection alive or send further events).

**Finding 3 — UI has no visual spinner** [S2]: The only progress signal is a disabled button with text `"Generating…"`. The roadmap item requires a `"Building document…"` progress indicator. Tailwind CSS 3 supports CSS `animate-spin` on an SVG circle element — zero new deps.

**Finding 4 — `onChunk` accumulation pattern is correct** [S2]: `setOutput((prev) => prev + chunk)` is the right functional update pattern for concurrent React rendering. Keep this; just ensure `chunk` is the clean text (no `data:` prefix).

**Finding 5 — no `AbortController` currently** [S1]: If the user navigates away mid-stream, the fetch continues. An `AbortController` tied to a `useEffect` cleanup would be best practice, but is optional for the initial implementation since the Lambda response is short-lived.

## Constraints

1. No new npm packages — use browser `fetch` + `ReadableStream` + `TextDecoder` (all available in React 18 / Vite browser target).
2. The `generateJob` function signature `(jobId: string, onChunk: (text: string) => void): Promise<void>` must remain compatible — `GeneratePage` calls it with a callback.
3. The spinner must fit within the existing Tailwind + inline-style mixed UI (the page uses both; prefer Tailwind `className` for new elements).
4. TypeScript strict mode — no `any` without justification.

## Solution Comparison

| Criteria | Option A: Fix `generateJob` + Tailwind spinner | Option B: Replace with `EventSource` |
|----------|-----------------------------------------------|--------------------------------------|
| **Approach** | Buffer raw bytes, parse SSE lines in `generateJob`, add Tailwind `animate-spin` SVG in `GeneratePage` | Use browser `EventSource` API (GET-only) — not usable since endpoint is POST |
| **Pros** | Minimal change; keeps existing `fetch` POST; no new deps | Native SSE parsing built-in |
| **Cons** | Manual SSE parsing (simple but manual) | EventSource only supports GET — **cannot be used here** |
| **Complexity** | Low | N/A — ruled out |
| **Dependencies** | None | None (but incompatible) |
| **Codebase fit** | Perfect — extends existing pattern | Incompatible with POST endpoint |

**Option B is ruled out**: `EventSource` only supports GET requests. The endpoint is `POST /jobs/:id/generate`.

## Recommendation

**Implement Option A**: update `generateJob` to properly parse SSE, and update `GeneratePage` to show a spinner.

### `generateJob` — new SSE parsing logic

```ts
export async function generateJob(jobId: string, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/generate`, { method: 'POST' });
  if (!res.ok) throw new Error(`POST /jobs/${jobId}/generate failed: ${res.status}`);
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Split on SSE block separator
    const blocks = buffer.split('\n\n');
    // Keep the last (potentially incomplete) block in the buffer
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const lines = block.split('\n');
      const eventLine = lines.find(l => l.startsWith('event:'));
      const dataLine = lines.find(l => l.startsWith('data:'));
      if (eventLine?.trim() === 'event: complete') {
        reader.cancel();
        return;
      }
      if (dataLine) {
        const text = dataLine.slice('data:'.length).trimStart();
        if (text) onChunk(text);
      }
    }
  }
}
```

### `GeneratePage` — spinner/progress UI

Replace the existing button-only indicator with:

```tsx
{isGenerating && (
  <div className="flex items-center gap-3 mt-4">
    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    <span className="text-blue-700 font-medium">Building document…</span>
  </div>
)}
```

Keep the `<pre>` output box to stream text as it arrives (the medical narrative is visible in real time).

### Risks and mitigations

- **Risk**: The backend closes the stream before sending `event: complete` (error path). The `while` loop's `done === true` guard catches this; the `Promise` resolves and `setIsDone(false)` stays, so the Generate button remains available. The `error` state is set by `handleGenerate`'s catch block.
- **Risk**: Partially buffered `data:` lines at TCP chunk boundaries. Mitigated by the `buffer` accumulation pattern — we only process complete `\n\n`-terminated blocks.

## Next Steps

- Create TASK-045 to implement these two targeted changes:
  1. `packages/web/src/lib/api.ts` — update `generateJob` SSE parsing
  2. `packages/web/src/pages/GeneratePage.tsx` — add Tailwind spinner + "Building document…" text
  3. Typecheck: `pnpm typecheck`
- Run `/uat-generate TASK-045` to generate browser tests for the SSE consumer

---
id: TASK-046
title: "SSE consumer: parse SSE stream from POST /jobs/:id/generate and show \"Building document…\" progress indicator"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-042]
blocks: []
parallel_safe_with: [TASK-045]
uat: "[[UAT-046]]"
tags: [frontend, sse, streaming, generation, ui]
---

# TASK-046 — SSE Consumer: Frontend Progress Indicator

## Objective

Update the React frontend to correctly parse the SSE stream emitted by `POST /jobs/:id/generate` and display a "Building document…" spinner/progress bar while generation is in progress. The `generateJob` function in `packages/web/src/lib/api.ts` currently passes raw SSE-formatted bytes (including `data:` prefixes and `\n\n` separators) directly to its `onChunk` callback — it must buffer decoded text, split on `\n\n` block boundaries, strip the `data:` prefix, call `onChunk` with clean text, and stop early on `event: complete`. The `GeneratePage` component must replace its button-label-only progress indicator with a Tailwind `animate-spin` SVG spinner + "Building document…" text shown while `isGenerating === true`.

## Approach

The backend (implemented in TASK-042) sends:
- `data: <up-to-80-char chunk>\n\n` — one per text segment
- `event: complete\ndata: \n\n` — terminates the stream

The browser `EventSource` API cannot be used here because the endpoint is a POST. The existing `fetch` + `ReadableStream` + `TextDecoder` approach in `generateJob` is the right tool — it just needs proper SSE line parsing. The fix is a buffered split-on-`\n\n` loop: accumulate decoded text in a `buffer` string, split on `\n\n`, retain the last incomplete fragment, then parse each complete block for `event:` (stop if `event: complete`) and `data:` (call `onChunk` with the payload minus the `data: ` prefix).

No new npm dependencies are required. The Tailwind `animate-spin` utility class drives the spinner SVG. No changes to backend, routing, or data model.

## Steps

### 1. Update `generateJob` in `packages/web/src/lib/api.ts`  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/lib/api.ts` via Serena (`get_symbols_overview`, then `find_symbol generateJob include_body=true`). <!-- Completed: 2026-06-25 -->
- [x] Replace the body of `generateJob` with the following SSE-parsing implementation using `replace_symbol_body`: <!-- Completed: 2026-06-25 -->
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
      // Split on SSE block separator (\n\n); retain last potentially incomplete block
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const lines = block.split('\n');
        const eventLine = lines.find((l) => l.startsWith('event:'));
        const dataLine = lines.find((l) => l.startsWith('data:'));
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
  - Key invariants: `onChunk` is called only with clean text (no `data:` prefix, no `\n\n`); `event: complete` triggers `reader.cancel()` + early return; TCP close (`done === true`) also terminates cleanly.

### 2. Update `GeneratePage.tsx` — add spinner and "Building document…" indicator  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/GeneratePage.tsx` via Serena (`find_symbol GeneratePage include_body=true`). <!-- Completed: 2026-06-25 -->
- [x] Within the JSX return, find the `{isGenerating ? 'Generating…' : 'Generate Demand Letter'}` button label — change it to just `'Generate Demand Letter'` (the button stays disabled while `isGenerating`; the spinner below communicates progress). <!-- Completed: 2026-06-25 -->
- [x] Below the Generate button (and before the `{error && …}` block), insert the spinner/progress block using `replace_content`: <!-- Completed: 2026-06-25 -->
  ```tsx
  {isGenerating && (
    <div className="flex items-center gap-3 mt-4">
      <svg
        className="animate-spin h-5 w-5 text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      <span className="text-blue-700 font-medium">Building document…</span>
    </div>
  )}
  ```
  - The spinner is shown only while `isGenerating === true`; it disappears automatically when `handleGenerate` resolves (either success → `isDone = true` or error → `error` state set).
- [x] The `<pre>` output box (existing) continues to stream text chunks as they arrive — no change needed there. <!-- Completed: 2026-06-25 -->

### 3. Typecheck  <!-- agent: general-purpose -->

- [x] Run `make typecheck` from the repo root. <!-- Completed: 2026-06-25 -->
  - Expected: 0 errors across all 3 packages (`@demand-letter/web`, `@demand-letter/api`, `@demand-letter/db`).
- [x] If errors appear in `api.ts`: verify `reader.cancel()` return type (it returns `Promise<void>` — `await` it if needed, or note that the function returns immediately after `return`). <!-- No errors — skipped -->
- [x] Fix all errors before marking done. <!-- No errors — nothing to fix -->

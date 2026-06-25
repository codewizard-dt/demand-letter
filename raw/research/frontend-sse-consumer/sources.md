---
topic: "Frontend SSE consumer architecture: how should the React frontend connect to POST /jobs/:id/generate, read SSE data: chunks with fetch + ReadableStream, show a \"Building document…\" progress indicator/spinner, and stop on event: complete — covering the relevant frontend component files, state management approach, and API client patterns already in use in this codebase."
slug: frontend-sse-consumer
researched: 2026-06-25
---

# Primary Sources — Frontend SSE Consumer Architecture

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/web/src/lib/api.ts::generateJob` | 2026-06-25 | Current SSE reader implementation — uses `fetch` + `ReadableStream` but does not parse SSE line format; passes raw bytes to `onChunk` |
| S2 | codebase | `packages/web/src/pages/GeneratePage.tsx::GeneratePage` | 2026-06-25 | Current UI state (`isGenerating`, `isDone`, `output`, `error`), button-label-only progress indicator, `onChunk` accumulation pattern |
| S3 | codebase | `wiki/work/tasks/completed/TASK-042-sse-streaming-medical-narrative.md` | 2026-06-25 | Backend SSE format: `data: <chunk>\n\n` per text chunk, `event: complete\ndata: \n\n` terminator |
| S4 | codebase | `packages/web/package.json` | 2026-06-25 | Stack: React 18, react-router-dom v6, Tailwind CSS 3, TypeScript, Vite — no Zustand/Redux, no SSE utility libs |

## Excerpts

### S1 — `generateJob` current implementation

`packages/web/src/lib/api.ts`, lines 30–41:

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

> Passes raw decoded bytes directly to `onChunk` — `data: ` prefix and `\n\n` separators are visible to the caller.

### S2 — `GeneratePage` current state and UI

`packages/web/src/pages/GeneratePage.tsx`, lines 4–80:

```tsx
const [output, setOutput] = useState('');
const [isGenerating, setIsGenerating] = useState(false);
const [isDone, setIsDone] = useState(false);
// ...
await generateJob(id!, (chunk) => setOutput((prev) => prev + chunk));
// ...
{isGenerating ? 'Generating…' : 'Generate Demand Letter'}
```

> Only progress indicator is button text "Generating…" — no spinner or "Building document…" text.

### S3 — Backend SSE format (TASK-042)

`wiki/work/tasks/completed/TASK-042-sse-streaming-medical-narrative.md`, Step 3:

```ts
const chunks = narrativeText.match(/.{1,80}/gs) ?? [narrativeText];
const sseBody = chunks.map(c => `data: ${c}\n\n`).join('') + 'event: complete\ndata: \n\n';
```

> Each text chunk prefixed with `data: ` and double-newline terminated. Completion signalled by `event: complete\ndata: \n\n`.

### S4 — Web package dependencies

`packages/web/package.json`:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.30.4"
  }
}
```

> No SSE utility libraries. Tailwind CSS 3 available for `animate-spin` spinner.

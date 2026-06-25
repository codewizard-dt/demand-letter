---
id: TASK-021
title: "Generate Button with SSE Streaming Display"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-015, TASK-019]
blocks: []
parallel_safe_with: [TASK-020, TASK-022]
uat: "[[UAT-021]]"
tags: [frontend, generate, sse, streaming, phase-4]
---

# TASK-021 — Generate Button with SSE Streaming Display

## Objective

Build `packages/web/src/pages/GeneratePage.tsx` — the page a user lands on after uploading files. It shows a "Generate Demand Letter" button. When clicked it calls `POST /jobs/:id/generate`, consumes the response as a stream (or polls if the endpoint returns a full body), and displays the growing text in real time. Once generation completes, a "Download" button becomes visible linking to the output page.

## Approach

At the skeleton stage `POST /jobs/:id/generate` returns the full output in a single response body (`text/plain`). Consume it as a streaming `fetch` using `ReadableStream` on the response body. Accumulate chunks into a state variable and render in a `<pre>` or `<textarea>` that updates live. When the fetch resolves (stream closed), set a `done` flag and show the Download button.

## Steps

### 1. Add `generateJob` helper to `packages/web/src/lib/api.ts`  <!-- agent: general-purpose -->

- [x] Add: <!-- Completed: 2026-06-24 -->
  ```typescript
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

### 2. Create `packages/web/src/pages/GeneratePage.tsx`  <!-- agent: general-purpose -->

- [x] Read `jobId` from URL params: `const { id } = useParams<{ id: string }>();` <!-- Completed: 2026-06-24 -->
- [x] State: `output: string`, `isGenerating: boolean`, `isDone: boolean`, `error: string | null` <!-- Completed: 2026-06-24 -->
- [x] "Generate Demand Letter" button — on click: <!-- Completed: 2026-06-24 -->
  1. Set `isGenerating = true`
  2. Call `generateJob(id, chunk => setOutput(prev => prev + chunk))`
  3. On resolve: set `isDone = true`, `isGenerating = false`
  4. On error: set `error = err.message`, `isGenerating = false`
- [x] Display: <!-- Completed: 2026-06-24 -->
  - Disabled spinner button while generating
  - `<pre className="whitespace-pre-wrap ...">` showing `output` as it grows
  - When `isDone`: a "Download" link → `/jobs/${id}/output` (or a button calling the download API)

### 3. Wire the route in `App.tsx`  <!-- agent: general-purpose -->

- [x] Add import and route: <!-- Completed: 2026-06-24 -->
  ```tsx
  import GeneratePage from './pages/GeneratePage';
  // ...
  <Route path="/jobs/:id/generate" element={<GeneratePage />} />
  ```

### 4. TypeScript check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` — must pass with zero errors <!-- Completed: 2026-06-24 -->

---
id: UAT-046
title: "UAT: SSE Consumer — Frontend Progress Indicator"
status: passed
task: TASK-046
created: 2026-06-25
updated: 2026-06-25
---

# UAT-046 — UAT: SSE Consumer — Frontend Progress Indicator

implements::[[TASK-046]]

> **Source task**: [[TASK-046]]
> **Generated**: 2026-06-25

Verifies that `generateJob` in `packages/web/src/lib/api.ts` correctly parses the SSE stream from `POST /jobs/:id/generate`, and that `GeneratePage` shows the `animate-spin` SVG spinner with "Building document…" text while generation is in progress.

---

## Prerequisites

- [ ] The full stack is running locally: `pnpm dev` in `packages/web` (Vite on port 5173) and the API on port 3000 (or `VITE_API_URL` set accordingly)
- [ ] A job exists in the database with at least one file uploaded and a zero-gap gap report (so the Generate button is enabled)
- [ ] You have a valid auth session (log in via `/login` first — all routes under `<ProtectedRoute />` require auth)
- [ ] Note the job ID — it appears in the URL at `/jobs/:id/generate`

---

## Test Cases

### UAT-UI-001: Spinner and "Building document…" text appear while generation is in progress

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that the `animate-spin` SVG spinner and "Building document…" label are rendered in the DOM while `isGenerating === true`, i.e., during the `generateJob` fetch call.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job with zero uncovered slots (gap report clean).
  2. Confirm the "Generate Demand Letter" button is enabled (not greyed-out).
  3. Open DevTools → Network tab → enable "Slow 3G" throttling (or set a breakpoint after `setIsGenerating(true)` in `handleGenerate`) to extend the generation window.
  4. Click **Generate Demand Letter**.
  5. While the network request is still in-flight, inspect the DOM (Elements tab or accessibility tree) for the spinner block.
- **Expected Result**:
  - An SVG element with `class` containing `animate-spin h-5 w-5 text-blue-600` is present in the DOM.
  - A `<span>` with text `Building document…` and class `text-blue-700 font-medium` is present alongside the SVG.
  - The button label reads `Generate Demand Letter` (static — it no longer changes to "Generating…").
  - The button is disabled (`disabled` attribute set) while `isGenerating` is true.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Spinner disappears after generation completes successfully

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that once the SSE stream is consumed to completion (`event: complete` received), `isGenerating` is set to `false`, the spinner/label block is unmounted, and the "Download Demand Letter" button appears.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a clean job (zero gaps).
  2. Click **Generate Demand Letter** and wait for the full generation to complete (the `<pre>` output box should fill with text).
  3. Once the request finishes, inspect the page.
- **Expected Result**:
  - The spinner SVG and "Building document…" label are **no longer present** in the DOM.
  - The "Generate Demand Letter" button is **no longer visible** (hidden by `{!isDone && ...}` guard).
  - A **"Download Demand Letter"** button is visible.
  - The `<pre>` output box contains the streamed text (non-empty).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Generate button is disabled and shows reason when gap report has open slots

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the sufficiency gate UI — when the gap report returns one or more uncovered slots, the Generate button is disabled and a human-readable reason is shown.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job that has **at least one uncovered required slot** (i.e., gap report returns `gaps.length > 0`).
  2. Wait for the gap report to load (the page makes a `GET /jobs/:id/gap-report` call on mount).
  3. Observe the Generate button state.
- **Expected Result**:
  - The "Generate Demand Letter" button is **disabled** (greyed out, `disabled:opacity-50` applied).
  - A `<p>` element with class `mt-2 text-sm text-yellow-700` is visible below the button containing the text: `N required slot(s) still uncovered. Go to the Gap Report to fill or accept them before generating.` (where N is the number of gaps).
  - The spinner/progress indicator is **not visible** (generation has not started).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Generate button shows loading state while gap report is fetching

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies the gap-loading transient state — while the `fetchGapReport` call is in-flight, the button is disabled and the reason text shows the waiting message.
- **Steps**:
  1. Open DevTools → Network tab.
  2. Navigate to `/jobs/:id/generate`.
  3. Immediately after the page loads (before the gap-report XHR resolves), observe the button.
- **Expected Result**:
  - The "Generate Demand Letter" button is **disabled**.
  - A `<p>` with class `mt-2 text-sm text-yellow-700` shows `Checking sufficiency — please wait…`.
  - Once the gap report resolves with zero gaps, the button becomes enabled and the reason text disappears.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-005: Streamed text chunks appear in the output box as they arrive

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that `onChunk` calls accumulate in the `output` state and are reflected in the `<pre>` box in real time (not all at once after completion).
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a clean job.
  2. Open DevTools → Network tab, locate the `POST .../generate` request, observe the streaming response.
  3. Click **Generate Demand Letter**.
  4. Watch the `<pre>` output box while the spinner is still shown.
- **Expected Result**:
  - Text appears in the `<pre className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">` box **before** the spinner disappears (i.e., while `isGenerating` is still `true`).
  - The accumulated text contains no `data:` prefixes, no `\n\n` separators — only clean text content.
  - The text in the `<pre>` box at completion matches the full narrative (concatenation of all `onChunk` calls).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-006: Error state shown correctly when generation fails

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that if `generateJob` throws (e.g., the API returns a non-2xx status), the error message is displayed and the spinner disappears.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job that has a clean gap report but will fail generation (e.g., temporarily point `VITE_API_URL` to a non-existent server, or use a non-existent job ID after forcing the gap-report mock to pass).
  2. Alternatively: modify the request URL temporarily to force a 500 response from the server.
  3. Click **Generate Demand Letter**.
  4. Wait for the request to fail.
- **Expected Result**:
  - The spinner and "Building document…" label **disappear**.
  - A `<p className="mt-4 text-red-600">` element is visible containing the error message (e.g., `POST /jobs/:id/generate failed: 500`).
  - The "Generate Demand Letter" button is **re-enabled** (since `isGenerating` is back to `false` and `isDone` is still `false`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: SSE `event: complete` block terminates stream early and does not call onChunk with empty data

- **Page**: `/jobs/:id/generate` (observe via DevTools Network)
- **Description**: Verifies the frontend correctly handles the SSE termination signal. The backend emits `event: complete\ndata: \n\n` as the final block. The parser must stop on `event: complete` and must NOT call `onChunk` with the empty `data:` payload from that termination block.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a clean job.
  2. Click **Generate Demand Letter**.
  3. After generation completes, open DevTools → Network → select the `generate` request → Preview/Response tab. Confirm the last SSE block contains `event: complete\ndata: \n\n`.
  4. Observe the `<pre>` output: the final character should be the last real text character, not a trailing space or newline from the termination block's `data: ` line.
- **Expected Result**:
  - The `<pre>` output does **not** end with extra whitespace from the `data: ` line of the `event: complete` block.
  - Generation terminates cleanly (no infinite loop, no hanging spinner after the `event: complete` block is processed).
  - The "Download Demand Letter" button appears, confirming `isDone = true` was set.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Generate button label is static — never changes to "Generating…"

- **Page**: `/jobs/:id/generate`
- **Description**: The old implementation changed the button label to "Generating…" while in-progress. TASK-046 removes this in favor of the separate spinner. Verifies the button text is always `Generate Demand Letter` regardless of `isGenerating` state.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a clean job.
  2. Click **Generate Demand Letter**.
  3. While the spinner is visible and `isGenerating` is `true`, observe the button area (the button is inside `{!isDone && ...}` so it is still rendered during generation).
- **Expected Result**:
  - The Generate button is **not visible** during generation — the `{!isDone && ...}` block wraps it, but more precisely: the button IS rendered while `isGenerating` is `true` (since `isDone` is only set on success). Its label reads `Generate Demand Letter` (not `Generating…`). The button has `disabled` attribute set.
  - At no point does the button label change to "Generating…" or any other text.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-003: TCP close (`done === true`) terminates stream gracefully without error

- **Page**: `/jobs/:id/generate` (observe via DevTools)
- **Description**: Verifies the fallback termination path: if the server closes the connection (`done === true` from `reader.read()`) without an `event: complete` block, the `while` loop exits cleanly and `isGenerating` is set to `false` without throwing.
- **Steps**:
  1. Use DevTools → Network → select the `generate` request.
  2. Confirm normal generation completes. Note: in standard operation the `event: complete` block fires before TCP close, but this test confirms the `if (done) break` guard also works correctly.
  3. As a proxy: after a successful generation, confirm no uncaught exceptions appear in the Console tab.
- **Expected Result**:
  - No `Uncaught` errors or unhandled promise rejections in the DevTools Console tab.
  - The spinner disappears and the page reaches a terminal state (either `isDone = true` with Download button, or error state).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

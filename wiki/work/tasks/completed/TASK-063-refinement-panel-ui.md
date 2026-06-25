---
id: TASK-063
title: "Refinement panel UI — instruction input, SSE consumer, inline diff, accept/revert buttons"
status: done
created: 2026-06-25
updated: 2026-06-25
tackled: 2026-06-25
depends_on: [TASK-061, TASK-062]
blocks: [TASK-064]
parallel_safe_with: []
uat: "[[UAT-063]]"
tags: [frontend, refinement, sse, diff, roadmap-006]
---

# TASK-063 — Refinement panel UI

## Objective

Add a refinement panel to `GeneratePage.tsx` that lets attorneys type an instruction, optionally pick a scope section, stream the revised text in real-time via SSE, see a diff between the before and after text, and accept or revert the change.

## Approach

Add the panel below the generated letter output in `GeneratePage.tsx`. Use the `diff` npm package for line-level diff rendering. Scope dropdown is populated from a static list of template slot names (or fetched from the DB if a `GET /jobs/:id/template-slots` endpoint already exists). The panel only appears once `isDone === true` (letter has been generated). State: `instruction`, `scope`, `isRefining`, `refinedText`, `refinementId`, `showDiff`.

## Steps

### 1. Install diff package  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/web add diff` <!-- Completed: 2026-06-25 -->
- [x] Run `pnpm --filter @demand-letter/web add -D @types/diff` <!-- Completed: 2026-06-25 -->

### 2. Build RefinementPanel component  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/components/RefinementPanel.tsx` <!-- Completed: 2026-06-25 -->
- [x] Props: `jobId: string`, `currentText: string`, `onAccepted: (newText: string) => void` <!-- Completed: 2026-06-25 -->
- [x] State:
  - `instruction: string` — text input value
  - `scope: string` — dropdown value, default `'all'`
  - `isRefining: boolean`
  - `refinedText: string` — streamed output accumulator
  - `refinementId: string | null` — set after the Refinement record is created (returned in SSE `complete` event or as a follow-up fetch)
  - `showDiff: boolean` — toggle between raw view and diff view
  - `error: string | null` <!-- Completed: 2026-06-25 -->

- [x] Scope options: `['all', 'medical_narrative', 'damages', 'liability', 'demand_amount']` (static list matching common `template_slots.slotName` values) <!-- Completed: 2026-06-25 -->

- [x] `handleRefine()`:
  1. Set `isRefining = true`, `refinedText = ''`
  2. Call `refineJob(jobId, instruction, scope === 'all' ? undefined : scope, chunk => setRefinedText(prev => prev + chunk))`
  3. On completion, `setRefinementId(id)` — update `refineJob` in api.ts to return `{ afterText, refinementId }` via the `event: complete` data payload (see TASK-061: the handler should emit `event: complete\ndata: ${JSON.stringify({ refinementId })}\n\n` at the end)
  4. `setIsRefining(false)` <!-- Completed: 2026-06-25 -->

- [x] Diff rendering: import `diffLines` from `diff`; compute `diffLines(currentText, refinedText)`; render each line with green background for additions, red/strikethrough for removals, no style for unchanged <!-- Completed: 2026-06-25 -->

- [x] Accept button: calls `acceptRefinement(jobId, refinementId!)`, then calls `onAccepted(refinedText)` to replace the letter in the parent <!-- Completed: 2026-06-25 -->
- [x] Revert button: calls `rejectRefinement(jobId, refinementId!)`, resets `refinedText = ''` and `refinementId = null` <!-- Completed: 2026-06-25 -->

- [x] Layout: `<textarea>` for instruction, `<select>` for scope, "Refine" button; below: show `refinedText` in `<pre>` while streaming; after streaming show diff view toggle + accept/revert buttons <!-- Completed: 2026-06-25 -->

### 3. Wire into GeneratePage  <!-- agent: general-purpose -->

- [x] In `GeneratePage.tsx`, import `RefinementPanel` <!-- Completed: 2026-06-25 -->
- [x] Add state: `output` (already exists) — passed as `currentText` <!-- Completed: 2026-06-25 -->
- [x] Render `<RefinementPanel jobId={id!} currentText={output} onAccepted={(newText) => setOutput(newText)} />` below the output `<pre>` block, but only when `isDone === true` <!-- Completed: 2026-06-25 -->

### 4. Update api.ts refineJob signature  <!-- agent: general-purpose -->

- [x] Update `refineJob` in `packages/web/src/lib/api.ts` to return `{ afterText: string; refinementId: string }`: <!-- Completed: 2026-06-25 -->
  - Collect text from `data:` events as before
  - On `event: complete`, parse `data:` as JSON to extract `refinementId`
  - Return `{ afterText, refinementId }`

### 5. Build and dev-server check  <!-- agent: general-purpose -->

- [x] Run `pnpm --filter @demand-letter/web build` (or `pnpm dev`) to confirm TypeScript compiles without errors <!-- Completed: 2026-06-25 -->
- [DEFERRED-TO-UAT] Manually verify: after generating a letter, the refinement panel appears; typing an instruction and clicking "Refine" calls the SSE endpoint; streamed text appears; diff is shown; Accept/Revert buttons are present

---
id: TASK-108
title: "Replace streaming output pre block with styled prose container in GeneratePage"
status: in-progress
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-099, TASK-100, TASK-101, TASK-103, TASK-104, TASK-105, TASK-106, TASK-107]
uat: "[[UAT-108]]"
tags: [ui, frontend, generate]
---

# TASK-108 — Replace streaming output pre block with styled prose container in GeneratePage

## Objective

Replace the `<pre>` block used to display streaming generation output in `packages/web/src/pages/GeneratePage.tsx` with a styled `<div>` that renders the letter text as flowing prose rather than monospace code output.

## Background

`GeneratePage.tsx` currently renders the streaming letter output inside a `<pre>` element with class `"mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm"`. The `<pre>` tag forces monospace font (browser default) and gives the output a raw, code-like appearance. Attorneys reading a generated demand letter expect flowing readable prose, not preformatted code output.

## Approach

1. Locate the `{output && (...)}` block in `GeneratePage.tsx` (currently at around line 109 of the file, within the `GeneratePage` function body).
2. Replace the `<pre>` element with a `<div>` that applies `whitespace-pre-wrap font-sans text-sm leading-relaxed` Tailwind classes along with the existing container styles (`mt-6 bg-gray-50 p-4 rounded`).
3. No other logic changes are needed — the `{output}` content render and the surrounding conditional remain identical.

## Steps

### 1. Replace `<pre>` with styled prose `<div>` in GeneratePage  <!-- agent: general-purpose -->

File: `packages/web/src/pages/GeneratePage.tsx`

- [x] Replace the `<pre>` output block: <!-- Completed: 2026-06-26 -->
  ```tsx
  {output && (
    <pre className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">
      {output}
    </pre>
  )}
  ```
  with a prose-styled `<div>`:
  ```tsx
  {output && (
    <div className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded">
      {output}
    </div>
  )}
  ```
- [x] Verify the TypeScript build passes with no new errors (`pnpm -F web build` or `pnpm -F web typecheck`). <!-- Completed: 2026-06-26 -->

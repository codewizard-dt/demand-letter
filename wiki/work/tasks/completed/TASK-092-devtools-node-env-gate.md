---
id: TASK-092
title: "Gate TanStack Query DevTools behind NODE_ENV check"
status: done
created: 2026-06-26
updated: 2026-06-26 <!-- tackle completed -->
depends_on: []
blocks: []
parallel_safe_with: [TASK-089, TASK-090, TASK-091, TASK-093, TASK-094, TASK-095, TASK-096, TASK-097]
uat: "[[UAT-092]]"
tags: [ui, frontend, devtools]
---

# TASK-092 — Gate TanStack Query DevTools behind NODE_ENV check

## Objective

Prevent the ReactQueryDevtools panel from rendering in production builds by wrapping its usage in a `NODE_ENV` guard in `packages/web/src/main.tsx`.

## Approach

In Vite, `import.meta.env.MODE` is `'development'` in dev and `'production'` in built output. Wrap `<ReactQueryDevtools />` in a conditional `{import.meta.env.DEV && <ReactQueryDevtools />}`. This is the idiomatic Vite pattern — Vite's tree-shaker will eliminate the import in production builds when the condition is statically false.

## Steps

### 1. Wrap ReactQueryDevtools in a dev-only guard  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/main.tsx`
- [x] Change `<ReactQueryDevtools initialIsOpen={false} />` to `{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}`
- [x] Keep the existing import (`import { ReactQueryDevtools } from '@tanstack/react-query-devtools'`) — Vite handles dead-code elimination at build time <!-- Completed: 2026-06-26 -->

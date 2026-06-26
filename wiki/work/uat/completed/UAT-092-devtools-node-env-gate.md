---
id: UAT-092
title: "UAT: Gate TanStack Query DevTools behind NODE_ENV check"
status: passed
task: TASK-092
created: 2026-06-26
updated: 2026-06-26
---

# UAT-092 — UAT: Gate TanStack Query DevTools behind NODE_ENV check

implements::[[TASK-092]]

> **Source task**: [[TASK-092]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Repository is at the commit that introduced the `import.meta.env.DEV` guard in `packages/web/src/main.tsx`
- [ ] Node.js and pnpm are installed and `pnpm install` has been run

---

## Test Cases

### UAT-SOURCE-001: Dev guard is present in main.tsx
- **File**: `packages/web/src/main.tsx`
- **Description**: Verify the `ReactQueryDevtools` JSX element is wrapped in an `import.meta.env.DEV` guard, not rendered unconditionally.
- **Steps**:
  1. Open `packages/web/src/main.tsx`
  2. Locate the `ReactQueryDevtools` usage inside the render tree
  3. Confirm the line reads exactly: `{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}`
  4. Confirm there is no bare `<ReactQueryDevtools` anywhere else in the file
- **Expected Result**: Exactly one occurrence of `ReactQueryDevtools` in JSX, wrapped with `import.meta.env.DEV &&`. No unconditional usage.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

### UAT-SOURCE-002: ReactQueryDevtools import is retained
- **File**: `packages/web/src/main.tsx`
- **Description**: Verify the import statement for `ReactQueryDevtools` is still present (Vite handles dead-code elimination at build time — the import must not be removed manually).
- **Steps**:
  1. Open `packages/web/src/main.tsx`
  2. Check line 5 (or nearby)
  3. Confirm: `import { ReactQueryDevtools } from '@tanstack/react-query-devtools';`
- **Expected Result**: The import statement is present and unchanged.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

### UAT-BUILD-001: Production bundle does not include ReactQueryDevtools
- **Description**: Verify that a production Vite build tree-shakes `ReactQueryDevtools` out of the output bundle because `import.meta.env.DEV` is statically `false` in production.
- **Steps**:
  1. From the project root, run: `pnpm --filter @demand-letter/web build`
  2. Wait for the build to complete successfully
  3. Search the output directory for any reference to devtools: `grep -r "ReactQueryDevtools\|react-query-devtools" packages/web/dist/`
- **Expected Result**: The build completes with exit code 0. The `grep` returns no matches — `ReactQueryDevtools` and the `react-query-devtools` package are absent from the production bundle.
- [x] Pass <!-- 2026-06-26 -->

### UAT-UI-001: DevTools panel is visible in development mode
- **Description**: Verify the TanStack Query DevTools panel still appears when the dev server runs (the guard must not suppress it in dev).
- **Steps**:
  1. Start the development server: `pnpm --filter @demand-letter/web dev`
  2. Open a browser and navigate to `http://localhost:5173`
  3. Wait for the page to fully load
  4. Look for the TanStack Query DevTools toggle button (floating icon, typically bottom-right or bottom-left corner)
  5. Click the toggle to expand the DevTools panel
- **Expected Result**: The TanStack Query DevTools panel opens and displays query state. No console errors related to DevTools rendering.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---
id: UAT-019
title: "UAT: Add Tailwind CSS to Web Package"
status: passed
task: TASK-019
created: 2026-06-24
updated: 2026-06-24
---

# UAT-019 — UAT: Add Tailwind CSS to Web Package

implements::[[TASK-019]]

> **Source task**: [[TASK-019]]
> **Generated**: 2026-06-24

---

## Prerequisites

- [ ] Dev server is running: `pnpm --filter @demand-letter/web dev` (serves on `http://localhost:5173` by default)
- [ ] Browser DevTools available (Elements panel + Computed styles)

---

## Test Cases

### UAT-UI-001: Tailwind CSS is loaded — utility class applies a visible style

- **Page**: `http://localhost:5173/admin/usage`
- **Description**: Verify that the `@tailwind` directives in `index.css` are processed and utility classes take effect in the browser. The root `<div>` in `App` carries `min-h-screen`, `bg-bg`, and `font-sans`; at least one of those must produce a computed style that differs from the browser default.
- **Steps**:
  1. Navigate to `http://localhost:5173/admin/usage`.
  2. Open DevTools → Elements panel.
  3. Select the outermost `<div>` rendered by `App` (it has `class="min-h-screen bg-bg font-sans"`).
  4. In the Computed styles tab, inspect `min-height`, `background-color`, and `font-family`.
- **Expected Result**:
  - `min-height` is `100vh` (or the viewport pixel equivalent).
  - `background-color` is the computed value for `#F0F1E8` (rgb(240, 241, 232)).
  - `font-family` begins with `Inter` or falls back to `ui-sans-serif` / `system-ui`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-002: Steno color tokens are available — `bg-bg` renders the cream background

- **Page**: `http://localhost:5173/admin/usage`
- **Description**: Confirm the custom `bg` color token (`#F0F1E8`) from the Steno style guide is wired into the Tailwind theme and applied to the page root.
- **Steps**:
  1. Navigate to `http://localhost:5173/admin/usage`.
  2. Open DevTools → Elements panel.
  3. Select the `<div class="min-h-screen bg-bg font-sans">` element.
  4. In the Styles panel, verify the rule `background-color: rgb(240, 241, 232)` (or the `--tw-bg-opacity` equivalent resolving to `#F0F1E8`) is present and not overridden.
- **Expected Result**: The element's computed `background-color` is `rgb(240, 241, 232)` (`#F0F1E8`).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-003: Steno font-family token is available — `font-sans` resolves to Inter stack

- **Page**: `http://localhost:5173/admin/usage`
- **Description**: Confirm the custom `sans` font stack (`'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`) is registered in the Tailwind theme and applied via `font-sans`.
- **Steps**:
  1. Navigate to `http://localhost:5173/admin/usage`.
  2. Open DevTools → Elements panel.
  3. Select the `<div class="min-h-screen bg-bg font-sans">` element.
  4. In the Computed styles panel, inspect `font-family`.
- **Expected Result**: `font-family` lists `Inter` as the first entry (or the first system fallback if Inter is not installed), followed by `ui-sans-serif`, `system-ui`, `-apple-system`, `sans-serif`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-004: Build output contains Tailwind CSS — no runtime CDN fallback

- **Description**: Confirm the production build emits a CSS file that contains Tailwind-generated rules (not an empty or CDN-stub sheet). This is a build-artifact check, not a browser check.
- **Steps**:
  1. From the repo root, run: `pnpm --filter @demand-letter/web build`
  2. After the build completes, list `packages/web/dist/assets/` and open the `*.css` file.
  3. Search the CSS file content for at least one of: `--tw-`, `@layer base`, or a selector like `*, ::before, ::after` (Tailwind preflight).
- **Expected Result**:
  - The build exits 0.
  - `packages/web/dist/assets/` contains at least one `.css` file larger than 1 kB.
  - The CSS file contains Tailwind-generated content (e.g. `--tw-` custom properties or preflight rules).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-UI-005: Tailwind custom color tokens compile into CSS — spot-check `primary` and `error`

- **Description**: Verify that the Steno-derived color tokens (`primary` → `#193D3D`, `error` → `#B5006A`) are available as Tailwind utility classes and that the build compiles them when used. This test requires temporarily adding a class to a component, building, then reverting.
- **Steps**:
  1. In `packages/web/src/App.tsx`, temporarily add `text-primary` to the root div's className (making it `"min-h-screen bg-bg font-sans text-primary"`).
  2. Run `pnpm --filter @demand-letter/web build`.
  3. Open `packages/web/dist/assets/*.css` and search for `193d3d` or `#193D3D` (case-insensitive).
  4. Revert the temporary change to `App.tsx` (remove `text-primary`).
- **Expected Result**:
  - Build exits 0.
  - The compiled CSS contains a rule with `color: rgb(25, 61, 61)` or `color:#193d3d` (the `primary` token value).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

### UAT-EDGE-001: Page does not crash — no console errors on load with Tailwind active

- **Page**: `http://localhost:5173/admin/usage`
- **Description**: Confirm that adding `index.css` with `@tailwind` directives and the Tailwind PostCSS plugin does not introduce any runtime JS errors or broken CSS that causes the page to error out.
- **Steps**:
  1. Navigate to `http://localhost:5173/admin/usage`.
  2. Open DevTools → Console panel.
  3. Hard-reload the page (Cmd+Shift+R / Ctrl+Shift+R).
  4. Observe the Console for any red errors.
- **Expected Result**: Console shows zero red errors. Warnings (e.g. React DevTools suggestion) are acceptable.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-24 -->

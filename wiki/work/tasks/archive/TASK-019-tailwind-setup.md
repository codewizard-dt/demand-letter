---
id: TASK-019
title: "Add Tailwind CSS to Web Package"
status: done
created: 2026-06-23
updated: 2026-06-24
depends_on: [TASK-018]
blocks: []
parallel_safe_with: []
uat: "[[UAT-019]]"
tags: [frontend, tailwind, scaffold, phase-4]
---

# TASK-019 — Add Tailwind CSS to Web Package

## Objective

Install and configure Tailwind CSS v3 in `packages/web` so every subsequent page task can use utility classes without additional setup. Apply the color palette, font family, and spacing tokens derived from the Steno.com style audit (TASK-018). Verify Tailwind classes render correctly by adding a minimal styled wrapper to `App.tsx`.

## Approach

Use the standard Vite + Tailwind setup: install `tailwindcss`, `postcss`, and `autoprefixer`; generate `tailwind.config.js`; create `postcss.config.js`; add `@tailwind` directives to a global CSS file imported in `main.tsx`. Apply the Steno-derived theme tokens from `style-guide.md`.

## Steps

### 1. Install Tailwind dependencies  <!-- agent: general-purpose -->

- [x] Run from `packages/web/`:
  ```
  pnpm add -D tailwindcss postcss autoprefixer
  ```
- [x] Verify they appear in `packages/web/package.json` devDependencies <!-- Completed: 2026-06-24 -->

### 2. Initialize Tailwind config  <!-- agent: general-purpose -->

- [x] Create `packages/web/tailwind.config.js`:
  ```js
  /** @type {import('tailwindcss').Config} */
  export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
      extend: {
        // Paste Steno-derived tokens from style-guide.md here
      },
    },
    plugins: [],
  };
  ```
- [x] Apply the `colors`, `fontFamily`, and `borderRadius` overrides from `packages/web/src/styles/style-guide.md` <!-- Completed: 2026-06-24 -->

### 3. Create `postcss.config.js`  <!-- agent: general-purpose -->

- [x] Create `packages/web/postcss.config.js`:
  ```js
  export default {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  ``` <!-- Completed: 2026-06-24 -->

### 4. Add global CSS file  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/index.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- [x] In `packages/web/src/main.tsx`, add at the top: `import './index.css';` <!-- Completed: 2026-06-24 -->

### 5. Apply base styling to `App.tsx`  <!-- agent: general-purpose -->

- [x] Wrap the `<BrowserRouter>` in a `<div className="min-h-screen bg-bg font-sans">` (Steno bg token used)
- [x] Confirm the layout renders without error <!-- Completed: 2026-06-24 -->

### 6. TypeScript and build check  <!-- agent: general-purpose -->

- [x] Run `pnpm typecheck` from the repo root — must pass
- [x] Run `pnpm --filter @demand-letter/web build` — must succeed with no errors <!-- Completed: 2026-06-24 -->

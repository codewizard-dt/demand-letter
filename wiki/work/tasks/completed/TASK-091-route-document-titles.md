---
id: TASK-091
title: "Add route-specific document titles to all pages"
status: in-progress
created: 2026-06-26
updated: 2026-06-26
depends_on: [TASK-089, TASK-090]
blocks: []
parallel_safe_with: [TASK-092, TASK-093, TASK-094, TASK-095, TASK-096, TASK-097]
uat: "[[UAT-091]]"
tags: [ui, frontend, a11y]
---

# TASK-091 — Add route-specific document titles to all pages

## Objective

Set a meaningful `document.title` on every page so browser tabs and screen readers identify the current view. The pattern is `"<Page Name> — Steno"`.

## Approach

Create a tiny `useDocumentTitle(title: string)` hook that calls `document.title = title` in a `useEffect`. Call the hook at the top of each page component. This approach requires no third-party library, zero bundle size increase, and no routing config changes. TASK-089 and TASK-090 must complete first to avoid edit conflicts on UploadPage and GapReportPage.

## Steps

### 1. Create the useDocumentTitle hook  <!-- agent: general-purpose -->

- [x] Create `packages/web/src/hooks/useDocumentTitle.ts`:
  ```ts
  import { useEffect } from 'react';
  export function useDocumentTitle(title: string) {
    useEffect(() => {
      document.title = title;
      return () => { document.title = 'Steno'; };
    }, [title]);
  }
  ```

### 2. Add title to each protected page  <!-- agent: general-purpose -->

- [x] `packages/web/src/pages/UploadPage.tsx` — add `useDocumentTitle('Upload Documents — Steno')` inside the component body, import the hook
- [x] `packages/web/src/pages/GapReportPage.tsx` — add `useDocumentTitle('Gap Report — Steno')`
- [x] `packages/web/src/pages/AnnotatePage.tsx` — add `useDocumentTitle('Annotate Template — Steno')`
- [x] `packages/web/src/pages/GeneratePage.tsx` — add `useDocumentTitle('Generate — Steno')`
- [x] `packages/web/src/pages/AccountPage.tsx` — add `useDocumentTitle('Account — Steno')`
- [x] `packages/web/src/pages/EditorPage.tsx` — add `useDocumentTitle('Editor — Steno')`

### 3. Add title to auth pages  <!-- agent: general-purpose -->

- [x] `packages/web/src/pages/auth/LoginPage.tsx` — add `useDocumentTitle('Sign In — Steno')`
- [x] `packages/web/src/pages/auth/RegisterPage.tsx` — add `useDocumentTitle('Create Account — Steno')`
- [x] `packages/web/src/pages/auth/ForgotPasswordPage.tsx` — add `useDocumentTitle('Reset Password — Steno')`

### 4. Set default title in index.html  <!-- agent: general-purpose -->

- [x] Open `packages/web/index.html` and verify `<title>` is set to `Steno` (or update it to `Steno` if it is something else like "Vite App")

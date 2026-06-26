---
id: TASK-098
title: "Add show/hide password toggle to all three auth forms"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: [TASK-099]
parallel_safe_with: [TASK-100, TASK-101, TASK-102, TASK-103, TASK-104, TASK-105, TASK-106]
uat: "[[UAT-098]]"
tags: [ui, frontend, auth, ux]
---

# TASK-098 — Add show/hide password toggle to all three auth forms

## Objective

Add a show/hide eye toggle button to every password input on the three auth pages (LoginPage, RegisterPage, ForgotPasswordPage has no password field), so attorneys can verify what they typed.

## Approach

For each page with a password `<input type="password">`, convert it to a controlled toggle using a local `showPassword` boolean state. Wrap the input in a `relative` container and overlay a small toggle button. No new component needed — inline pattern per page is sufficient. ForgotPasswordPage has no password input so only LoginPage and RegisterPage need changes.

## Steps

### 1. Add password toggle to LoginPage  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/auth/LoginPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Add `const [showPassword, setShowPassword] = useState(false);` after existing state <!-- Completed: 2026-06-26 -->
- [x] Wrap the password `<input>` in `<div className="relative">...</div>` <!-- Completed: 2026-06-26 -->
- [x] Change input `type="password"` to `type={showPassword ? 'text' : 'password'}` <!-- Completed: 2026-06-26 -->
- [x] Add after the input: <!-- Completed: 2026-06-26 -->
  ```tsx
  <button
    type="button"
    onClick={() => setShowPassword(v => !v)}
    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-primary"
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? 'Hide' : 'Show'}
  </button>
  ```

### 2. Add password toggle to RegisterPage (password field)  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/auth/RegisterPage.tsx` <!-- Completed: 2026-06-26 -->
- [x] Add `const [showPassword, setShowPassword] = useState(false);` after existing state <!-- Completed: 2026-06-26 -->
- [x] Wrap the `id="password"` input in `<div className="relative">` and add toggle button (same pattern as LoginPage) <!-- Completed: 2026-06-26 -->
- [x] Change `type="password"` to `type={showPassword ? 'text' : 'password'}` on the password field <!-- Completed: 2026-06-26 -->

### 3. Add confirm password toggle to RegisterPage  <!-- agent: general-purpose -->

- [x] Add `const [showConfirm, setShowConfirm] = useState(false);` after the showPassword state <!-- Completed: 2026-06-26 -->
- [x] Wrap the `id="confirm"` input in `<div className="relative">` and add a separate toggle button using `showConfirm`/`setShowConfirm` <!-- Completed: 2026-06-26 -->
- [x] Change `type="password"` to `type={showConfirm ? 'text' : 'password'}` on the confirm field <!-- Completed: 2026-06-26 -->
- [x] Verify TypeScript compiles clean across all packages <!-- Completed: 2026-06-26 -->

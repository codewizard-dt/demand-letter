---
id: TASK-093
title: "Remove duplicate Sign-out button from AccountPage"
status: done
created: 2026-06-26
updated: 2026-06-26
depends_on: []
blocks: []
parallel_safe_with: [TASK-089, TASK-090, TASK-091, TASK-092, TASK-094, TASK-095, TASK-096, TASK-097]
uat: "[[UAT-093]]"
tags: [ui, frontend]
---

# TASK-093 — Remove duplicate Sign-out button from AccountPage

## Objective

Remove the "Sign out" button from `packages/web/src/pages/AccountPage.tsx` since the navbar dropdown in `AuthLayout.tsx` already provides a "Logout" action, making AccountPage's button redundant.

## Approach

Delete the `<button onClick={logout} ...>Sign out</button>` element and its surrounding whitespace from AccountPage. Also remove the unused `logout` destructure from `useAuth()` if it's no longer needed by the component. The navbar dropdown in `AuthLayout.tsx` is the canonical sign-out affordance.

## Steps

### 1. Remove the Sign-out button and unused logout import  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/pages/AccountPage.tsx`
- [x] Remove the `<button onClick={logout} ...>Sign out</button>` block (lines 31-37)
- [x] Change `const { user, logout } = useAuth();` to `const { user } = useAuth();` since `logout` is no longer used
- [x] Verify the file compiles without TypeScript errors (no unused variable warnings) <!-- Completed: 2026-06-26 -->

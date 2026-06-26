---
id: TASK-096
title: "Add active-page indicator to navbar"
status: done
created: 2026-06-26
updated: 2026-06-26
<!-- Updated: 2026-06-26 -->
depends_on: []
blocks: []
parallel_safe_with: [TASK-089, TASK-090, TASK-091, TASK-092, TASK-093, TASK-094, TASK-095, TASK-097]
uat: "[[UAT-096]]"
tags: [ui, frontend, navigation]
---

# TASK-096 — Add active-page indicator to navbar

## Objective

Highlight the current route in the `AuthLayout` navbar dropdown so users have a visual cue of which page they are on.

## Approach

Use `useLocation` from `react-router-dom` in `packages/web/src/components/AuthLayout.tsx`. The navbar currently only has an "Account" link in the dropdown — when the user is on `/account`, apply an active style (e.g. `bg-bg font-medium` or a left accent border) to that link. Extend the same pattern to any additional top-level nav links that may be added later (e.g. home/jobs).

## Steps

### 1. Add active-link styling to AuthLayout dropdown  <!-- agent: general-purpose -->

- [x] Open `packages/web/src/components/AuthLayout.tsx`
- [x] Add `import { useLocation } from 'react-router-dom';` (it's already imported from the same package, so add `useLocation` to the existing import)
- [x] Call `const location = useLocation();` inside the component
- [x] Update the Account `<Link>` to apply an active class when `location.pathname === '/account'`:
  ```tsx
  <Link
    to="/account"
    onClick={() => setOpen(false)}
    className={`block px-4 py-2.5 text-sm transition-colors ${
      location.pathname === '/account'
        ? 'text-primary font-medium bg-bg'
        : 'text-primary hover:bg-bg'
    }`}
  >
    Account
  </Link>
  ```
- [DEFERRED-TO-UAT] Verify the dropdown still closes on click and the active state renders correctly

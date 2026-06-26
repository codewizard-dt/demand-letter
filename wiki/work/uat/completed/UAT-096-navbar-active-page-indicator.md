---
id: UAT-096
title: "UAT: Add active-page indicator to navbar"
status: passed
task: TASK-096
created: 2026-06-26
updated: 2026-06-26
---

# UAT-096 — UAT: Add active-page indicator to navbar

implements::[[TASK-096]]

> **Source task**: [[TASK-096]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App is running locally (`pnpm --filter @demand-letter/web dev` → http://localhost:5173)
- [ ] A registered user account exists (use the Register flow at `/register` if needed)
- [ ] You are logged in to the app

---

## Test Cases

### UAT-UI-001: Account link shows active styling when on /account
- **Page**: `http://localhost:5173/account`
- **Description**: Verifies that when the user is on the `/account` route, the Account link inside the user dropdown displays the active state (`font-medium` weight and `bg-bg` background) to indicate the current page.
- **Steps**:
  1. Navigate to `http://localhost:5173/account` (log in first if redirected to `/login`)
  2. Click the circular avatar button in the top-right of the navbar to open the user dropdown
  3. Inspect the "Account" link in the dropdown
- **Expected Result**: The "Account" link has a **bold/medium font weight** and a **light background fill** (`bg-bg`) — visually distinct from the "Logout" button. It should not change appearance on hover (the active state is already applied).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Account link shows inactive styling when on a non-account page
- **Page**: `http://localhost:5173/` (or any page other than `/account`)
- **Description**: Verifies that when the user is on a route other than `/account`, the Account link in the dropdown shows only the default (inactive) state — no bold weight, background only appears on hover.
- **Steps**:
  1. Navigate to `http://localhost:5173/` (the jobs/home page)
  2. Click the circular avatar button in the top-right of the navbar to open the user dropdown
  3. Inspect the "Account" link in the dropdown — observe its resting state (do not hover)
  4. Hover over the "Account" link and observe the hover state
- **Expected Result**: At rest, the "Account" link has **no bold weight** and **no background fill**. On hover, a background fill (`bg-bg`) appears. The link must be visually identical in weight to the "Logout" button at rest.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: Dropdown closes after clicking the Account link
- **Page**: Any authenticated page
- **Description**: Verifies that clicking the "Account" link in the dropdown both navigates to `/account` and dismisses the dropdown, so it does not remain open overlaying the page.
- **Steps**:
  1. Open the user dropdown by clicking the avatar button
  2. Confirm the dropdown is visible (user email, Account link, and Logout button are displayed)
  3. Click the "Account" link
- **Expected Result**: The dropdown **closes immediately** (it is no longer visible). The browser navigates to `/account`. The active styling from UAT-UI-001 is now applied to the Account link if the dropdown is re-opened.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: Active styling does not persist after navigating away from /account
- **Page**: `http://localhost:5173/account` → then navigate away
- **Description**: Verifies that the active state is route-reactive — it disappears when the user leaves `/account`, confirming `useLocation` is live and not stale.
- **Steps**:
  1. Navigate to `http://localhost:5173/account`
  2. Open the dropdown — confirm the Account link shows active styling (bold + `bg-bg`)
  3. Close the dropdown (click outside it)
  4. Click the Steno logo in the top-left navbar to navigate to `/`
  5. Re-open the dropdown
- **Expected Result**: After navigating to `/`, the Account link in the dropdown **no longer** shows bold weight or a static background fill. Only hover state applies.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

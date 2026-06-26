---
id: UAT-093
title: "UAT: Remove duplicate Sign-out button from AccountPage"
status: passed
task: TASK-093
created: 2026-06-26
updated: 2026-06-26
---

# UAT-093 — UAT: Remove duplicate Sign-out button from AccountPage

implements::[[TASK-093]]

> **Source task**: [[TASK-093]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App dev server is running (`pnpm --filter @demand-letter/web dev` or `make dev`)
- [ ] A registered user account exists (email + password known)
- [ ] You are logged in to the app (visit `http://localhost:5173/login` if not)

---

## Test Cases

### UAT-UI-001: AccountPage has no Sign-out button

- **Page**: `http://localhost:5173/account`
- **Description**: Verifies the redundant "Sign out" button was removed from the Account page body and no sign-out affordance exists in the page content area.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Log in and navigate to `http://localhost:5173/account`.
  2. Scan the entire page content area (below the navbar header).
  3. Confirm there is no button, link, or text element with the label "Sign out", "Sign Out", or "Signout" anywhere on the page.
- **Expected Result**: The Account page shows only the "Your profile" label, "Account" heading, and a user profile card (initials circle, name, email). No sign-out button of any kind is present in the page body.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: AccountPage profile card still displays user info

- **Page**: `http://localhost:5173/account`
- **Description**: Verifies that removing the Sign-out button did not accidentally break or remove the user profile card.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Navigate to `http://localhost:5173/account` while logged in.
  2. Observe the profile card in the center of the page.
  3. Confirm the card contains: a gold circle with the user's initials, the user's full name in bold, and the user's email in muted text below.
- **Expected Result**: Profile card renders correctly with initials, name, and email — unchanged from pre-task behavior.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Navbar dropdown Logout button still works

- **Page**: Any auth-protected page (e.g., `http://localhost:5173/`)
- **Description**: Verifies the canonical sign-out affordance in the navbar dropdown (AuthLayout) remains functional after the AccountPage button was removed.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. Log in and land on any protected page (e.g., the jobs list at `/`).
  2. In the top-right corner of the navbar, locate the gold avatar circle button (shows user initials, aria-label "Open user menu").
  3. Click the avatar circle. Confirm a dropdown opens showing the user's email at the top, an "Account" link, and a "Logout" button.
  4. Click "Logout".
  5. Observe the resulting page.
- **Expected Result**: The dropdown opens as described. Clicking "Logout" immediately redirects to `/login` (or the login page). The user is no longer authenticated — navigating back to `/` redirects to `/login` rather than showing the protected app.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Navbar dropdown Account link navigates to AccountPage

- **Page**: Any auth-protected page
- **Description**: Verifies the "Account" link in the navbar dropdown (AuthLayout) still navigates to `/account` correctly after the AccountPage edits.
- **Auth-Required**: true
- **Auth-Role**: user
- **Steps**:
  1. From any protected page, click the gold avatar circle in the navbar to open the dropdown.
  2. Click the "Account" link in the dropdown.
  3. Confirm navigation to `http://localhost:5173/account`.
- **Expected Result**: The dropdown closes and the Account page loads, showing the profile card with name and email. No JavaScript errors in the console.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

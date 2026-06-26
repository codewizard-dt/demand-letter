---
id: UAT-091
title: "UAT: Add route-specific document titles to all pages"
status: pending
task: TASK-091
created: 2026-06-26
updated: 2026-06-26
---

# UAT-091 — UAT: Add route-specific document titles to all pages

implements::[[TASK-091]]

> **Source task**: [[TASK-091]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running: `pnpm --filter @demand-letter/web dev` (default port 5173)
- [ ] A registered user account exists for auth-gated routes
- [ ] At least one job exists in the database for job-specific routes (`/jobs/:id/...`)
- [ ] Browser DevTools console accessible (to inspect `document.title`)

---

## Test Cases

### UAT-UI-001: Default HTML title is "Steno"

- **Page**: `packages/web/index.html`
- **Description**: Verifies the static `<title>` fallback in `index.html` is `Steno` (not "Vite App" or "Demand Letter Generator").
- **Steps**:
  1. Open `packages/web/index.html` in a text editor or view source.
  2. Locate the `<title>` tag in the `<head>`.
  3. Confirm the value is exactly `Steno`.
- **Expected Result**: `<title>Steno</title>` — no other value.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Sign-in page sets title "Sign In — Steno"

- **Page**: `http://localhost:5173/login`
- **Description**: Verifies `document.title` is set when the login page mounts.
- **Steps**:
  1. Navigate to `http://localhost:5173/login`.
  2. Wait for the page to fully render (sign-in form visible).
  3. Open DevTools console and run: `document.title`
- **Expected Result**: `Sign In — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: Register page sets title "Create Account — Steno"

- **Page**: `http://localhost:5173/register`
- **Description**: Verifies `document.title` is set when the register page mounts.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`.
  2. Wait for the page to fully render.
  3. Open DevTools console and run: `document.title`
- **Expected Result**: `Create Account — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: Forgot-password page sets title "Reset Password — Steno"

- **Page**: `http://localhost:5173/forgot-password`
- **Description**: Verifies `document.title` is set when the forgot-password page mounts.
- **Steps**:
  1. Navigate to `http://localhost:5173/forgot-password`.
  2. Wait for the page to fully render.
  3. Open DevTools console and run: `document.title`
- **Expected Result**: `Reset Password — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-005: Upload page sets title "Upload Documents — Steno"

- **Page**: `http://localhost:5173/upload`
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies `document.title` is set when the upload page mounts.
- **Steps**:
  1. Log in with a valid user account.
  2. Navigate to `http://localhost:5173/upload`.
  3. Wait for the upload form to render.
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Upload Documents — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-006: Account page sets title "Account — Steno"

- **Page**: `http://localhost:5173/account`
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies `document.title` is set when the account page mounts.
- **Steps**:
  1. Log in with a valid user account.
  2. Navigate to `http://localhost:5173/account`.
  3. Wait for the page to render.
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Account — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-007: Generate page sets title "Generate — Steno"

- **Page**: `http://localhost:5173/jobs/:id/generate` (substitute a real job id)
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies `document.title` is set when the generate page mounts.
- **Steps**:
  1. Log in with a valid user account.
  2. Navigate to `http://localhost:5173/jobs/<REAL_JOB_ID>/generate`.
  3. Wait for the page to render (loading spinner resolves or generate button appears).
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Generate — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-008: Gap Report page sets title "Gap Report — Steno"

- **Page**: `http://localhost:5173/jobs/:id/gap-report` (substitute a real job id)
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies `document.title` is set when the gap report page mounts.
- **Steps**:
  1. Log in with a valid user account.
  2. Navigate to `http://localhost:5173/jobs/<REAL_JOB_ID>/gap-report`.
  3. Wait for the page to render.
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Gap Report — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-009: Annotate page sets title "Annotate Template — Steno"

- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies `document.title` is set when the annotate page mounts.
- **Steps**:
  1. Log in with a valid user account.
  2. Navigate to `http://localhost:5173/jobs/<REAL_JOB_ID>/templates/<REAL_TEMPLATE_ID>/annotate`.
  3. Wait for the page to render.
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Annotate Template — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-010: Editor page sets title "Editor — Steno"

- **Page**: `http://localhost:5173/jobs/:id/editor` (substitute a real job id)
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies `document.title` is set when the editor page mounts.
- **Steps**:
  1. Log in with a valid user account.
  2. Navigate to `http://localhost:5173/jobs/<REAL_JOB_ID>/editor`.
  3. Wait for the page to render (editor toolbar/content area visible).
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Editor — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-011: Title resets to "Steno" on unmount

- **Page**: Any titled page → navigate away
- **Auth-Required**: true
- **Auth-Role**: user
- **Description**: Verifies the `useDocumentTitle` cleanup function resets `document.title` to `Steno` when navigating away from a page.
- **Steps**:
  1. Log in and navigate to `http://localhost:5173/upload` (title should be "Upload Documents — Steno").
  2. Confirm `document.title` is `Upload Documents — Steno` in console.
  3. Navigate to `http://localhost:5173/account`.
  4. Open DevTools console and run: `document.title`
- **Expected Result**: `Account — Steno` (the incoming page's title, set after unmount cleanup of the previous page)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-012: Browser tab displays correct title

- **Page**: `http://localhost:5173/login`
- **Description**: Verifies the title is visible in the browser tab (not just `document.title` in JS — the two should match but the tab is the user-visible artifact).
- **Steps**:
  1. Navigate to `http://localhost:5173/login`.
  2. Observe the browser tab label.
- **Expected Result**: Browser tab displays `Sign In — Steno`
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

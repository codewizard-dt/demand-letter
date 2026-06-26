---
id: UAT-099
title: "UAT: Add password strength indicator and match validation on RegisterPage"
status: pending
task: TASK-099
created: 2026-06-26
updated: 2026-06-26
---

# UAT-099 — UAT: Add password strength indicator and match validation on RegisterPage

implements::[[TASK-099]]

> **Source task**: [[TASK-099]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App is running (`pnpm dev` from project root) and accessible at `http://localhost:5173`
- [ ] Navigate to `http://localhost:5173/register` to reach the RegisterPage

---

## Test Cases

### UAT-UI-001: Strength bar is hidden when the password field is empty

- **Page**: `http://localhost:5173/register`
- **Description**: The strength bar and label must not appear before any password is typed.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Do not interact with the Password field — leave it blank
  3. Observe the area immediately below the Password input
- **Expected Result**: No strength bar (coloured segments) and no strength label ("Weak", "Moderate", or "Strong") is visible below the Password field
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Weak password shows red bar and "Weak" label

- **Page**: `http://localhost:5173/register`
- **Description**: A password that is ≥8 chars but lacks both mixed case and a digit must display a red first segment and a "Weak" label.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Click the Password field and type `aaaaaaaa` (8 lowercase letters, no digit, no uppercase, no symbol)
  3. Observe the strength bar and label below the Password field
- **Expected Result**: A 3-segment bar appears; the first segment is red, the second and third segments are grey. A small label reading **"Weak"** is visible in red text below the bar
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Moderate password shows partial green bar and "Moderate" label

- **Page**: `http://localhost:5173/register`
- **Description**: A password of ≥8 chars that has a digit (or mixed case) but does not meet strong criteria must display a "Moderate" state.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Click the Password field and type `password1` (9 chars, lowercase + digit, no uppercase, no symbol)
  3. Observe the strength bar and label below the Password field
- **Expected Result**: The first two bar segments are green and the third is grey. A small label reading **"Moderate"** is visible in amber text below the bar
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Strong password shows full green bar and "Strong" label

- **Page**: `http://localhost:5173/register`
- **Description**: A password of ≥12 chars with lowercase, uppercase, a digit, and a symbol must show "Strong".
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Click the Password field and type `Password1!abc` (13 chars: upper, lower, digit, symbol)
  3. Observe the strength bar and label below the Password field
- **Expected Result**: All three bar segments are green (the third segment uses a darker green). A small label reading **"Strong"** is visible in green text below the bar
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-005: Match indicator is absent when the confirm field is empty

- **Page**: `http://localhost:5173/register`
- **Description**: The "Passwords do not match" message must not appear before the user types anything into the confirm field.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Type `password1` into the Password field
  3. Leave the Confirm password field completely empty
  4. Observe the area below the Confirm password input
- **Expected Result**: No "Passwords do not match" message is visible
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-006: Match indicator appears when confirm does not match password

- **Page**: `http://localhost:5173/register`
- **Description**: Typing a different value in the confirm field while it is non-empty must trigger the real-time mismatch warning.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Type `password1` into the Password field
  3. Click the Confirm password field and type `password2`
  4. Observe the area below the Confirm password input
- **Expected Result**: A red message reading **"Passwords do not match"** is visible immediately below the Confirm password field (no form submission required)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-007: Match indicator disappears when passwords match

- **Page**: `http://localhost:5173/register`
- **Description**: Correcting the confirm field to match the password must make the warning disappear in real time.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Type `password1` into the Password field
  3. Type `password2` into the Confirm password field — observe "Passwords do not match" appears
  4. Clear the Confirm password field and retype `password1`
  5. Observe the area below the Confirm password input
- **Expected Result**: The "Passwords do not match" message is no longer visible once the two fields contain the same value
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: Strength bar updates in real time as the password is typed

- **Page**: `http://localhost:5173/register`
- **Description**: The strength bar must respond to every keystroke without requiring form submission.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Click the Password field and type `a` — observe the bar (should show "Weak")
  3. Continue typing to reach `aaaaaaaa` (8 chars) — observe the bar (still "Weak" — no digit/mixed case)
  4. Append `1` to get `aaaaaaaa1` (9 chars, lowercase + digit) — observe the bar
- **Expected Result**: At step 2 the bar appears showing "Weak". At step 3 it still shows "Weak". At step 4 it transitions to **"Moderate"** without any page reload or form submission
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

---

### UAT-EDGE-002: Match indicator disappears when the confirm field is cleared

- **Page**: `http://localhost:5173/register`
- **Description**: Clearing the confirm field (making it empty) must hide the mismatch warning.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Type `password1` into the Password field
  3. Type `wrongpass` into the Confirm password field — observe "Passwords do not match" appears
  4. Select all text in the Confirm password field and delete it
  5. Observe the area below the Confirm password input
- **Expected Result**: The "Passwords do not match" message disappears once the confirm field is empty
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

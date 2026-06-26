---
id: UAT-098
title: "UAT: Add show/hide password toggle to all three auth forms"
status: pending
task: TASK-098
created: 2026-06-26
updated: 2026-06-26
---

# UAT-098 — UAT: Add show/hide password toggle to all three auth forms

implements::[[TASK-098]]

> **Source task**: [[TASK-098]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App is running locally (`pnpm dev` from project root, or equivalent)
- [ ] Login page accessible at `http://localhost:5173/login` (or the local dev port)
- [ ] Register page accessible at `http://localhost:5173/register`
- [ ] No user login is required to view these pages

---

## Test Cases

### UAT-UI-001: LoginPage — password field toggles from masked to visible on "Show" click
- **Page**: `/login`
- **Description**: Verifies the Show/Hide toggle button on the LoginPage password field changes the input type between `password` and `text`.
- **Steps**:
  1. Navigate to `http://localhost:5173/login` (use the actual dev port if different)
  2. Locate the **Password** label and its input field
  3. Confirm the input field is masked (dots or bullets — standard `type="password"` appearance)
  4. Confirm a "Show" button is visible to the right of the password input
  5. Click the "Show" button
  6. Observe that the password input now shows plain text characters (if any were typed), and the button text changes to "Hide"
  7. Click "Hide"
  8. Observe that the input returns to masked display and the button text returns to "Show"
- **Expected Result**:
  - Initially: password input is masked; toggle button reads "Show" with `aria-label="Show password"`
  - After clicking "Show": input type is `text` (characters visible); button reads "Hide" with `aria-label="Hide password"`
  - After clicking "Hide": input returns to masked; button reads "Show"
  - The toggle does **not** submit the form (clicking it keeps you on the login page)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: RegisterPage — password field toggles from masked to visible
- **Page**: `/register`
- **Description**: Verifies the Show/Hide toggle button on the RegisterPage **Password** field works correctly and independently.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Locate the **Password** label (not "Confirm password") and its input (`id="password"`)
  3. Confirm the input is masked and a "Show" button appears to the right of the input
  4. Type a test password (e.g. `hunter2`) into the Password field
  5. Click the "Show" button next to the **Password** field
  6. Verify the typed characters are now visible in the Password input
  7. Verify the button text changed to "Hide"
  8. Click "Hide" and verify the field returns to masked display
- **Expected Result**:
  - Initially: Password input is masked; button reads "Show" with `aria-label="Show password"`
  - After clicking "Show": typed characters are visible; button reads "Hide"
  - After clicking "Hide": input returns to masked; button reads "Show"
  - The Confirm password field below remains **unaffected** by this toggle
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: RegisterPage — confirm password field has its own independent toggle
- **Page**: `/register`
- **Description**: Verifies the Show/Hide toggle on the **Confirm password** field works independently of the Password field toggle.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Locate the **Confirm password** label and its input (`id="confirm"`)
  3. Confirm the confirm input is masked and a "Show" button appears to the right of it
  4. Type a value (e.g. `hunter2`) into the Confirm password field
  5. Click the "Show" button next to the **Confirm password** field
  6. Verify the typed characters are now visible in the Confirm input
  7. Verify the button text changed to "Hide"
  8. Click "Hide" and verify the Confirm field returns to masked display
- **Expected Result**:
  - Initially: Confirm input is masked; button reads "Show" with `aria-label="Show password"`
  - After clicking "Show": typed characters visible; button reads "Hide"
  - After clicking "Hide": input returns to masked; button reads "Show"
  - The Password field above remains **unaffected** by toggling the Confirm toggle
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-EDGE-001: RegisterPage — password and confirm toggles are fully independent
- **Scenario**: Toggling the password field toggle must not reveal the confirm field, and vice versa. The two state variables (`showPassword`, `showConfirm`) must be independent.
- **Steps**:
  1. Navigate to `http://localhost:5173/register`
  2. Type `abc123` into the **Password** field and `abc123` into the **Confirm password** field
  3. Click "Show" next to the **Password** field (not the Confirm field)
  4. Observe: Password field shows `abc123` in plain text; Confirm field remains masked
  5. Click "Show" next to the **Confirm password** field
  6. Observe: both fields are now visible
  7. Click "Hide" next to the **Password** field
  8. Observe: Password field is masked again; Confirm field remains visible
- **Expected Result**:
  - After step 4: Only the Password field is visible; Confirm remains masked
  - After step 6: Both fields are visible
  - After step 8: Only Confirm field is visible; Password field is masked
  - Each toggle button controls only its own field; no cross-contamination between the two state variables
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

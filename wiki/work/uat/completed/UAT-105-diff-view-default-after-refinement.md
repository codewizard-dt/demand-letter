---
id: UAT-105
title: "UAT: Default to diff view after refinement completes"
status: pending
task: TASK-105
created: 2026-06-26
updated: 2026-06-26
---

# UAT-105 — UAT: Default to diff view after refinement completes

implements::[[TASK-105]]

> **Source task**: [[TASK-105]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App is running locally (`pnpm dev` or equivalent)
- [ ] A test job exists with a fully generated letter (status `generate_complete` or equivalent) so the Generate page shows output and `RefinementPanel` is accessible
- [ ] You are logged in as a valid user
- [ ] Navigate to `/jobs/:id/generate` where `:id` is your test job ID — the "Refine Letter" panel must be visible on the page

---

## Test Cases

### UAT-UI-001: Diff view activates automatically when refinement completes

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that after a refinement succeeds, the diff view is shown by default — the user does not need to click "Show Diff" manually.
- **Steps**:
  1. Navigate to `/jobs/:id/generate` for a job that has a generated letter.
  2. In the "Refine Letter" panel, type any instruction in the textarea (e.g. `Make the demand amount stronger`).
  3. Click the **Refine** button.
  4. Wait for the spinner ("Refining…") to disappear, indicating the refinement has completed.
  5. Observe the result area below the textarea.
- **Expected Result**:
  - The diff view is shown immediately after the spinner clears — **no click on "Show Diff" is required**.
  - The diff view shows colored line-diff markup: lines added are green with `+` prefix, lines removed are red with `- ` prefix and strikethrough, unchanged lines are gray.
  - The toggle button reads **"Show Text"** (not "Show Diff"), confirming diff mode is active.
  - The "Accept" and "Revert" buttons are visible and enabled.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: "Show Text" toggle switches to plain text view

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that clicking "Show Text" from the auto-activated diff view reverts to the plain text (streamed) output.
- **Steps**:
  1. Complete a refinement as in UAT-UI-001 (diff view is now shown automatically).
  2. Confirm the toggle button reads **"Show Text"**.
  3. Click the **"Show Text"** button.
  4. Observe the result area.
- **Expected Result**:
  - The diff markup disappears; the panel shows the plain refined text in a monospace `<pre>` block with a light-gray background.
  - The toggle button now reads **"Show Diff"**.
  - The "Accept" and "Revert" buttons remain visible and enabled.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: "Show Diff" toggle re-activates diff view from plain text

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies round-trip toggling — after switching to text view, clicking "Show Diff" restores the diff view.
- **Steps**:
  1. From the state at the end of UAT-UI-002 (plain text view, button reads "Show Diff").
  2. Click the **"Show Diff"** button.
  3. Observe the result area.
- **Expected Result**:
  - The diff view is restored with the same colored markup as in UAT-UI-001.
  - The toggle button reads **"Show Text"** again.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Starting a second refinement resets to text mode; diff auto-activates again on completion

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that `handleRefine` resets `showDiff` to `false` at the start of each new refinement, and that `setShowDiff(true)` fires again when the second refinement completes.
- **Steps**:
  1. Complete a first refinement (diff view is shown, toggle reads "Show Text").
  2. Enter a new instruction in the textarea (e.g. `Shorten the opening paragraph`).
  3. Click **Refine** again.
  4. Observe the panel while "Refining…" is active.
  5. Wait for the spinner to disappear (second refinement complete).
  6. Observe the result area.
- **Expected Result**:
  - **During** the second refinement: the spinner is shown; the toggle/accept/revert buttons are hidden (the component is in streaming/pending state).
  - **After** the second refinement completes: the diff view is shown automatically again — the user does not need to click "Show Diff".
  - The toggle button reads **"Show Text"**, confirming diff mode is active for the new result.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-005: Diff view is not shown during active streaming (only after completion)

- **Page**: `/jobs/:id/generate`
- **Description**: Verifies that the diff view does not appear mid-stream — it only activates once `isRefining` is false and `hasResult` is true.
- **Steps**:
  1. Enter an instruction and click **Refine**.
  2. Observe the panel immediately after clicking while "Refining…" is displayed and streaming text is accumulating.
- **Expected Result**:
  - While streaming, the component shows the spinner and the accumulating plain text (in the `<pre>` block if text has started arriving), but **no diff view and no toggle/accept/revert buttons**.
  - The toggle button ("Show Text" / "Show Diff") does **not** appear until the refinement is fully complete.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->


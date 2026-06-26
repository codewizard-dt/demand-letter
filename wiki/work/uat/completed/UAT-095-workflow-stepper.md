---
id: UAT-095
title: "UAT: Add workflow stepper component to all 5 stages"
status: pending
task: TASK-095
created: 2026-06-26
updated: 2026-06-26
---

# UAT-095 — UAT: Add workflow stepper component to all 5 stages

implements::[[TASK-095]]

> **Source task**: [[TASK-095]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] App running at `http://localhost:5173` (or equivalent dev server)
- [ ] Authenticated user session (logged in via `/login`)
- [ ] At least one existing job ID available for `/jobs/:id/*` routes
- [ ] A job that has passed the gap-report stage (for Generate and Editor pages)

---

## Test Cases

### UAT-UI-001: WorkflowStepper renders on UploadPage with "Upload" active
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/upload`
- **Description**: Verifies that the workflow stepper appears at the top of the Upload page with "Upload" as the active (highlighted) step.
- **Steps**:
  1. Log in and navigate to `/upload`.
  2. Observe the top of the page, above the "Upload Documents" heading.
  3. Locate the `<nav aria-label="Workflow progress">` element.
  4. Confirm all 5 step labels are visible: "Upload", "Gap Report", "Generate", "Editor", "Done".
  5. Confirm the "Upload" step label has a distinct active style (primary background color / white text) compared to the other steps.
  6. Confirm the step indicator for "Upload" shows "1" (not a checkmark) with an inverted color (white circle, primary text).
  7. Confirm "Gap Report", "Generate", "Editor", "Done" are rendered in a muted/greyed style (not active, not done).
- **Expected Result**: The stepper `<nav>` is visible above the page heading. "Upload" is highlighted as the active step. Steps 2–5 are in muted styling. No step shows a checkmark (since nothing is "done" relative to step 0).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: WorkflowStepper renders on GapReportPage with "Gap Report" active and "Upload" done
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/jobs/:id/gap-report` (substitute a real job ID)
- **Description**: Verifies the stepper on the Gap Report page marks "Upload" as done (checkmark) and "Gap Report" as active.
- **Steps**:
  1. Navigate to `/jobs/<job-id>/gap-report`.
  2. Wait for the gap report to load.
  3. Observe the top of the page, above the grid layout.
  4. Locate the `<nav aria-label="Workflow progress">` element.
  5. Confirm "Upload" shows a checkmark (✓) indicator and uses done styling (primary-colored label).
  6. Confirm "Gap Report" is highlighted as the active step (primary background/white text).
  7. Confirm "Generate", "Editor", "Done" are in muted/greyed styling.
  8. Confirm the connector line between "Upload" and "Gap Report" uses the primary color (done-line styling), while lines between subsequent steps use grey.
- **Expected Result**: "Upload" shows ✓ with done styling. "Gap Report" is the active highlighted step. All subsequent steps are muted. The connector after "Upload" is primary-colored.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: WorkflowStepper renders on GeneratePage with "Generate" active
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/jobs/:id/generate` (substitute a real job ID)
- **Description**: Verifies the stepper on the Generate page marks steps 0–1 as done and "Generate" as active.
- **Steps**:
  1. Navigate to `/jobs/<job-id>/generate`.
  2. Observe the stepper above the "Generate Demand Letter" heading.
  3. Confirm "Upload" shows ✓ (done) styling.
  4. Confirm "Gap Report" shows ✓ (done) styling.
  5. Confirm "Generate" is highlighted as the active step (primary background/white text, step number "3").
  6. Confirm "Editor" and "Done" are in muted styling.
- **Expected Result**: Steps 1–2 show checkmarks with done styling. "Generate" is the active highlighted step. "Editor" and "Done" are muted.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: WorkflowStepper renders on EditorPage with "Editor" active
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/jobs/:id/editor` (substitute a real job ID that has generated output)
- **Description**: Verifies the stepper on the Editor page marks steps 0–2 as done and "Editor" as active.
- **Steps**:
  1. Navigate to `/jobs/<job-id>/editor`.
  2. Wait for the editor to load (past the "Loading document…" spinner).
  3. Observe the stepper above the "Edit Demand Letter" heading.
  4. Confirm "Upload" shows ✓ (done) styling.
  5. Confirm "Gap Report" shows ✓ (done) styling.
  6. Confirm "Generate" shows ✓ (done) styling.
  7. Confirm "Editor" is highlighted as the active step (primary background/white text, step number "4").
  8. Confirm "Done" is in muted styling (step number "5").
- **Expected Result**: Steps 1–3 show checkmarks with done styling. "Editor" is the active highlighted step. "Done" is muted.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-005: Stepper accessibility — nav landmark with aria-label
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/upload` (or any workflow page)
- **Description**: Verifies the stepper renders as a `<nav>` landmark with the correct accessible label, ensuring screen readers can identify it as workflow navigation.
- **Steps**:
  1. Navigate to `/upload`.
  2. Open browser DevTools → Elements panel.
  3. Inspect the stepper element at the top of the page (above the "Upload Documents" heading).
  4. Confirm the outermost element of the stepper is a `<nav>` tag.
  5. Confirm it has the attribute `aria-label="Workflow progress"`.
- **Expected Result**: The stepper renders as `<nav aria-label="Workflow progress">` — a proper landmark with an accessible name.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-006: Stepper positioned before main page content
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/upload`
- **Description**: Verifies the stepper appears above the page heading, not below or inside the form.
- **Steps**:
  1. Navigate to `/upload`.
  2. Observe the vertical order of page elements.
  3. Confirm the workflow stepper (with labels "Upload", "Gap Report", etc.) appears above the "Upload Documents" `<h1>`.
  4. Confirm the stepper is not inside the `<form>` element.
- **Expected Result**: The stepper is the first visible element in the page's main content area, appearing before the page title and the upload form.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-007: Connector lines between steps render correctly
- **Auth-Required**: true
- **Auth-Role**: user
- **Page**: `/jobs/:id/gap-report`
- **Description**: Verifies that horizontal connector lines appear between each step label and that lines after done steps use primary color, while future-step lines use grey.
- **Steps**:
  1. Navigate to `/jobs/<job-id>/gap-report` (step 1 active).
  2. Observe the connectors between the 5 step pills.
  3. Confirm a visible horizontal connector appears between each adjacent pair of steps (4 total connectors).
  4. Confirm the connector between "Upload" and "Gap Report" is primary-colored (indicating the previous step is done).
  5. Confirm connectors between "Gap Report"→"Generate", "Generate"→"Editor", "Editor"→"Done" are grey (future steps).
  6. Confirm no connector appears after "Done" (it is the last step).
- **Expected Result**: 4 connector lines are visible. The first connector (Upload→Gap Report) uses the primary color. The remaining 3 connectors are grey. No connector after "Done".
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

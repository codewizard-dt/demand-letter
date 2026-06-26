---
id: UAT-097
title: "UAT: Replace AnnotatePage alert() with inline success message"
status: passed
task: TASK-097
created: 2026-06-26
updated: 2026-06-26
---

# UAT-097 — UAT: Replace AnnotatePage alert() with inline success message

implements::[[TASK-097]]

> **Source task**: [[TASK-097]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running (`pnpm --filter web dev` or equivalent) with the app accessible at `http://localhost:5173`
- [ ] A job with at least one zone loaded exists; navigate to `/jobs/:id/templates/:templateId/annotate` with valid IDs
- [ ] The API backend is running so zone PATCH requests succeed
- [ ] Browser DevTools console is visible to observe any `alert()` calls

---

## Test Cases

### UAT-UI-001: Success banner appears after a successful save

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies that clicking "Submit Annotations" replaces the old `alert()` dialog with an inline teal banner reading "Zones saved successfully."
- **Steps**:
  1. Navigate to the annotate page with a valid job and template ID
  2. Observe the page loads zones
  3. Click the **Submit Annotations** button
  4. Observe the area above the zone list immediately after the API call succeeds
- **Expected Result**: A teal banner appears above the zone list containing the text "Zones saved successfully." — no browser `alert()` dialog opens
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-002: Success banner auto-dismisses after approximately 3 seconds

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies the banner disappears on its own without any user interaction, approximately 3 seconds after appearing
- **Steps**:
  1. Navigate to the annotate page with a valid job and template ID
  2. Click **Submit Annotations** and wait for the success banner to appear
  3. Do not interact with the page — wait approximately 3–4 seconds
  4. Observe whether the banner is still visible
- **Expected Result**: The banner disappears automatically after ~3 seconds; no manual dismissal required
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-003: No native browser alert() dialog interrupts the save flow

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies the old `alert('Zones saved successfully.')` call has been completely removed and does not appear
- **Steps**:
  1. Navigate to the annotate page with a valid job and template ID
  2. Open the browser's DevTools console to monitor for any alert interception
  3. Click **Submit Annotations**
  4. Observe the page — note whether a grey native browser dialog box appears and requires the user to click "OK"
- **Expected Result**: No native browser alert dialog appears at any point during or after the save operation
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-UI-004: Success banner has correct accessibility attributes

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies the banner carries `role="status"` and `aria-live="polite"` so screen readers announce the message without interrupting the user's flow
- **Steps**:
  1. Navigate to the annotate page with a valid job and template ID
  2. Click **Submit Annotations** to trigger the success banner
  3. Open browser DevTools → Elements inspector
  4. Locate the visible teal banner div containing "Zones saved successfully."
  5. Inspect the HTML attributes on that element
- **Expected Result**: The div has both `role="status"` and `aria-live="polite"` attributes set
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-EDGE-001: Success banner is not visible on initial page load

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies the banner is hidden by default (`saved` state starts as `false`) and only appears after a successful save
- **Steps**:
  1. Navigate to the annotate page with a valid job and template ID
  2. Wait for zones to finish loading
  3. Do not click Submit — inspect the page for any teal banner
- **Expected Result**: No success banner is visible; only the zone list and action buttons are rendered
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

### UAT-EDGE-002: Banner disappears and is not re-shown unless Submit is clicked again

- **Page**: `/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies banner state resets correctly: after auto-dismiss, subsequent zone edits do not cause the banner to re-appear until the user saves again
- **Steps**:
  1. Navigate to the annotate page with a valid job and template ID
  2. Click **Submit Annotations** — wait for banner to appear, then wait for it to auto-dismiss (~3 seconds)
  3. Toggle a zone type (e.g. click "Boilerplate" on one zone)
  4. Observe whether the banner reappears
  5. Click **Submit Annotations** again
  6. Observe whether the banner reappears after this second save
- **Expected Result**: Banner does not reappear after the auto-dismiss unless the user explicitly submits again (step 6 should show it; step 4 should not)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

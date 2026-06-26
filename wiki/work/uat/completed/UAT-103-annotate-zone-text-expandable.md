---
id: UAT-103
title: "UAT: Make zone text expandable on AnnotatePage"
status: pending
task: TASK-103
created: 2026-06-26
updated: 2026-06-26
---

# UAT-103 — UAT: Make zone text expandable on AnnotatePage

implements::[[TASK-103]]

> **Source task**: [[TASK-103]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running: `pnpm --filter web dev` → `http://localhost:5173`
- [ ] Logged in with a valid user account
- [ ] At least one job exists with a template that has annotatable zones; navigate to `/jobs/:id/templates/:templateId/annotate`
- [ ] At least one zone must have text content longer than 80 characters to exercise the expand/collapse path

---

## Test Cases

### UAT-UI-001: Zone with long text shows "Show more" button by default

- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies that zones whose `textContent` exceeds 80 characters display a "Show more" button and that text is clamped to 2 lines on initial render.
- **Steps**:
  1. Navigate to the Annotate page for a job/template with at least one zone containing more than 80 characters of text.
  2. Observe each zone card.
  3. Find a zone whose text is visually truncated to two lines.
- **Expected Result**: For every zone with > 80 chars text, a "Show more" button is visible below the text paragraph. No "Show less" button is present. The `<p>` element has the `line-clamp-2` CSS class applied.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Clicking "Show more" expands zone text

- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies that clicking "Show more" removes the text clamp and changes the toggle label to "Show less".
- **Steps**:
  1. Navigate to the Annotate page with a zone whose text is longer than 80 characters.
  2. Confirm the "Show more" button is visible for that zone.
  3. Click the "Show more" button.
- **Expected Result**: The zone's `<p>` element no longer has `line-clamp-2` applied (full text is visible). The button label changes from "Show more" to "Show less". No page reload or navigation occurs.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Clicking "Show less" collapses zone text

- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies that clicking "Show less" (after expanding) re-applies the clamp and restores the "Show more" label.
- **Steps**:
  1. Follow UAT-UI-002 to expand a zone.
  2. Confirm the button now reads "Show less".
  3. Click the "Show less" button.
- **Expected Result**: The `<p>` element is clamped to 2 lines again (`line-clamp-2` class present). The button label reverts to "Show more". Full text is no longer visible (visually truncated).
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-004: Zone with short text (≤ 80 chars) shows no expand button

- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies that the "Show more" / "Show less" button is NOT rendered for zones whose text is 80 characters or fewer.
- **Steps**:
  1. Navigate to the Annotate page.
  2. Identify a zone card where the text content is visually short (single line or clearly under 80 chars).
- **Expected Result**: No "Show more" or "Show less" button is rendered inside that zone's card. The `<p>` element is present but the toggle button is absent.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: Multiple zones expand and collapse independently

- **Page**: `http://localhost:5173/jobs/:id/templates/:templateId/annotate`
- **Description**: Verifies that expanding one zone does not affect the expand/collapse state of other zones.
- **Steps**:
  1. Navigate to the Annotate page with at least two zones that both have text longer than 80 characters.
  2. Click "Show more" on the first zone only.
  3. Observe the state of the second (unexpanded) zone.
- **Expected Result**: The first zone shows full text with a "Show less" button. The second zone remains clamped to 2 lines and still shows "Show more". Expanding/collapsing any zone has no effect on the other zones' states.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

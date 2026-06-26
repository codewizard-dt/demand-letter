---
id: UAT-107
title: "UAT: Make WS-missing banner dismissible on EditorPage"
status: pending
task: TASK-107
created: 2026-06-26
updated: 2026-06-26
---

# UAT-107 — UAT: Make WS-missing banner dismissible on EditorPage

implements::[[TASK-107]]

> **Source task**: [[TASK-107]]
> **Generated**: 2026-06-26

---

## Prerequisites

- [ ] Dev server running (`pnpm dev` in `packages/web`) on `http://localhost:5173`
- [ ] `VITE_WS_API_URL` is **not** set in the environment (unset or absent from `.env.local`) so that the WS-missing banner is shown
- [ ] A valid job exists in the system and its ID is known (navigate to `/jobs/:id/editor`)
- [ ] User is authenticated

---

## Test Cases

### UAT-UI-001: Banner is visible on initial load when VITE_WS_API_URL is absent

- **Page**: `/jobs/:id/editor` (substitute a real job ID)
- **Description**: Verifies the amber WS-missing warning banner renders on page load when no WebSocket server URL is configured.
- **Steps**:
  1. Confirm `VITE_WS_API_URL` is not set (check `.env.local` or environment).
  2. Navigate to `/jobs/:id/editor` while authenticated.
  3. Wait for the editor to load (spinner disappears, document content appears).
  4. Observe the area between the "Export to Word" button and the track-changes toolbar.
- **Expected Result**: An amber banner is visible containing the text "Collaborative editing requires a deployed WebSocket server. Export to Word is still available." and an `×` close button on the right.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-002: Clicking × button dismisses the banner

- **Page**: `/jobs/:id/editor`
- **Description**: Verifies clicking the dismiss button removes the amber banner from the page.
- **Steps**:
  1. Follow UAT-UI-001 steps 1–4 to confirm the banner is visible.
  2. Click the `×` button on the right side of the amber banner (the button has `aria-label="Dismiss"`).
  3. Observe the page immediately after clicking.
- **Expected Result**: The amber banner disappears immediately. No other page elements are affected — the "Export to Word" button, track-changes toolbar, and editor content remain visible and functional.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-UI-003: Banner remains dismissed while staying on the page

- **Page**: `/jobs/:id/editor`
- **Description**: Verifies the dismissed banner does not reappear during continued use of the editor.
- **Steps**:
  1. Follow UAT-UI-002 to dismiss the banner.
  2. Interact with the editor: click into the document and type a character.
  3. Click the "Export to Word" button (cancel if a download dialog appears).
  4. Scroll up and down the page.
- **Expected Result**: The amber banner stays hidden throughout all interactions. It does not flash or reappear.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-26 -->

---

### UAT-EDGE-001: Banner is absent when VITE_WS_API_URL is set

- **Scenario**: Verifies the banner is not shown when a WebSocket server URL is configured.
- **Steps**:
  1. Set `VITE_WS_API_URL=ws://localhost:1234` in `.env.local` and restart the dev server.
  2. Navigate to `/jobs/:id/editor` while authenticated.
  3. Wait for the editor to load.
  4. Observe the area between the "Export to Word" button and the editor.
- **Expected Result**: No amber banner appears. The WS-missing notice is completely absent from the page.
- [FAIL: auto-judge: manual test requires human verification] <!-- 2026-06-26 -->

---
id: UAT-080
title: "UAT: Verify two browser windows on same job editor sync edits in real-time"
status: pending
task: TASK-080
created: 2026-06-25
updated: 2026-06-25
---

# UAT-080 — UAT: Verify two browser windows on same job editor sync edits in real-time

implements::[[TASK-080]]

> **Source task**: [[TASK-080]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] Web dev server is running: `pnpm --filter @demand-letter/web dev` (http://localhost:5173)
- [ ] For static tests only: no additional prerequisites
- [ ] For deployed WebSocket tests: `VITE_WS_API_URL` set to a deployed API Gateway WebSocket URL, `wscat` installed (`npm install -g wscat`)
- [ ] For two-browser sync tests: two browser windows/profiles pointing to the same `/jobs/:id/editor` URL with a job that has generated output

---

## Test Cases

### UAT-STATIC-001: WebsocketProvider import present in EditorPage
- **Scenario**: EditorPage imports `WebsocketProvider` from `y-websocket`
- **Description**: Verifies the WebSocket collaboration dependency is wired in source
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Confirm line: `import { WebsocketProvider } from 'y-websocket';`
- **Expected Result**: The import statement is present exactly as shown
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-002: Collaboration and CollaborationCursor extensions wired
- **Scenario**: EditorPage registers both `Collaboration` and `CollaborationCursor` in TipTap extensions
- **Description**: Verifies both Y.js collaboration extensions are active in the editor
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Find the `extensions` array passed to `useEditor`
  3. Confirm `Collaboration.configure({ document: ydoc })` is present
  4. Confirm `CollaborationCursor.configure({ provider, user: { name: userName, color: '#6366f1' } })` is present
- **Expected Result**: Both extensions appear in the extensions array with the documented configuration
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-003: wsUrl query params include userId and userName
- **Scenario**: WebSocket URL encodes user identity for cursor attribution
- **Description**: Verifies the wsUrl construction passes `userId` and `userName` as query params
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Find the `wsUrl` constant
  3. Confirm it matches: `` `${import.meta.env.VITE_WS_API_URL as string}?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}` ``
- **Expected Result**: The wsUrl template literal includes both `userId` and `userName` via `encodeURIComponent`
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-004: Y.js room name uses job-{id} pattern
- **Scenario**: WebsocketProvider room name is scoped to the job
- **Description**: Verifies the room name isolates collaboration state per job
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Find the `WebsocketProvider` call in `useMemo`
  3. Confirm the second argument (room name) is `` `job-${id}` ``
- **Expected Result**: The room name is `` `job-${id}` `` — no other room name pattern
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-005: Amber banner condition is VITE_WS_API_URL falsy
- **Scenario**: Banner is shown exactly when the WebSocket env var is absent
- **Description**: Verifies the conditional rendering logic is correct
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Find the amber banner JSX block
  3. Confirm the condition is `{!import.meta.env.VITE_WS_API_URL && (...)}`
- **Expected Result**: The banner renders only when `VITE_WS_API_URL` is falsy
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-006: Amber banner message text is correct
- **Scenario**: Fallback message accurately describes the limitation
- **Description**: Verifies the exact banner copy matches the acceptance criterion
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Find the amber banner div (`className` containing `bg-amber-50`)
  3. Confirm text content: `"Collaborative editing requires a deployed WebSocket server. Export to Word is still available."`
- **Expected Result**: Banner text matches exactly, including period placement
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-007: JSDoc comment about real-time sync requirement present
- **Scenario**: Developer-facing comment explains the deployment requirement
- **Description**: Verifies the JSDoc note added by TASK-080 step 3 is in source
- **Steps**:
  1. Open `packages/web/src/pages/EditorPage.tsx`
  2. Find the comment: `// Real-time sync requires VITE_WS_API_URL to point to a deployed WebSocket API`
- **Expected Result**: The comment is present in the file above the `EditorPage` function
- [x] Pass <!-- 2026-06-25 -->

### UAT-STATIC-008: VITE_WS_API_URL documented in .env.example
- **Scenario**: Environment variable is discoverable by new developers
- **Description**: Verifies .env.example contains the WebSocket URL variable
- **Steps**:
  1. Open `.env.example`
  2. Find `VITE_WS_API_URL`
  3. Confirm the value shows a plausible API Gateway WebSocket URL (e.g. `wss://...execute-api...amazonaws.com/prod`)
- **Expected Result**: `VITE_WS_API_URL=wss://your-api-id.execute-api.us-east-1.amazonaws.com/prod` (or similar) is present
- [x] Pass <!-- 2026-06-25 -->

### UAT-UI-001: Amber banner renders in browser when VITE_WS_API_URL is unset
- **Page**: `http://localhost:5173/jobs/<any-job-id>/editor`
- **Description**: Confirms the amber fallback banner is visible when the WebSocket env var is not set at build time
- **Steps**:
  1. Ensure the dev server was started WITHOUT `VITE_WS_API_URL` set in environment
  2. Navigate to `http://localhost:5173/jobs/test-job-123/editor`
  3. After the page loads (or shows the loading spinner), observe the area above the editor
  4. Look for an amber/yellow-bordered box
- **Expected Result**: A visible amber box (yellow-orange background, border, dark text) contains "Collaborative editing requires a deployed WebSocket server. Export to Word is still available."
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-002: Editor page heading renders
- **Page**: `http://localhost:5173/jobs/<any-job-id>/editor`
- **Description**: Confirms the EditorPage renders its H1 heading
- **Steps**:
  1. Navigate to `http://localhost:5173/jobs/test-job-123/editor` (logged-in session)
  2. Wait for the page to load
  3. Observe the page heading
- **Expected Result**: Page shows `"Edit Demand Letter"` as the main heading
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-003: WebSocket connection via wscat
- **Scenario**: Deployed WebSocket API accepts connections with job + user params
- **Auth-Required**: false
- **Steps**:
  1. Ensure `VITE_WS_API_URL` is set: `export WS_URL="<your-deployed-ws-url>"`
  2. Run:
  ```bash
  wscat -c "${WS_URL}?jobId=test-job-001&userId=user-a&userName=TesterA"
  ```
  3. Observe the connection output — wait up to 5 seconds
- **Expected Result**: wscat prints `Connected (press CTRL+C to quit)` with no immediate error or disconnect. The connection remains open.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-004: Two-browser real-time sync — A types, B receives
- **Page**: `http://localhost:5173/jobs/:id/editor` (same job ID in both windows)
- **Description**: Core acceptance criterion — edits from one window appear in the other within ~1 second
- **Steps**:
  1. Start the web dev server with `VITE_WS_API_URL` pointing to the deployed WebSocket API
  2. Open Window A in a normal browser profile; navigate to `/jobs/<job-id>/editor`; log in
  3. Open Window B in a separate browser profile or incognito; navigate to the same URL; log in as a different user
  4. In Window A, click inside the editor (`.tiptap-editor` div) and type the text: `Hello from A`
  5. Observe Window B within 2 seconds
- **Expected Result**: The text `"Hello from A"` appears in Window B's editor without any manual refresh. The sync latency should be under ~1 second on a typical connection.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-005: Two-browser real-time sync — B types, A receives
- **Page**: `http://localhost:5173/jobs/:id/editor` (same job ID, same two windows as UAT-UI-004)
- **Description**: Verifies bidirectional sync — the second window can also broadcast edits
- **Steps**:
  1. Using the same two-window setup from UAT-UI-004
  2. In Window B, click inside the editor and type: `Hello from B`
  3. Observe Window A within 2 seconds
- **Expected Result**: The text `"Hello from B"` appears in Window A's editor without manual refresh
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

### UAT-UI-006: Cursor presence — remote user name badge visible
- **Page**: `http://localhost:5173/jobs/:id/editor` (same two windows)
- **Description**: Verifies CollaborationCursor shows a name badge for the remote user
- **Steps**:
  1. Using the same two-window setup from UAT-UI-004 and UAT-UI-005
  2. In Window A, click inside the editor and place the cursor in the middle of some text
  3. Observe Window B's editor view around the cursor position
- **Expected Result**: Window B shows a cursor indicator (colored caret or flag) with the Window A user's name visible as a badge or tooltip. The cursor color is `#6366f1` (indigo)
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

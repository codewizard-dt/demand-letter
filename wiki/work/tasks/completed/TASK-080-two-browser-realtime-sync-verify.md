---
id: TASK-080
title: "Verify two browser windows on same job editor sync edits in real-time"
status: todo
created: 2026-06-25
updated: 2026-06-25
depends_on: []
blocks: []
parallel_safe_with: [TASK-075, TASK-076, TASK-081]
uat: "[[UAT-080]]"
tags: [yjs, websocket, collaboration, verification, real-time-sync]
---

# TASK-080 — Two-Browser Real-Time Sync Verification

## Objective

Verify that two browser windows (or tabs) opened to the same `/jobs/:id/editor` route exchange Y.js updates in real-time: typing in one window appears within ~100 ms in the other. Also verify cursor presence (user name badge) for the second connection.

## Approach

This is a verification task. The WebSocket infrastructure was built in TASK-070 and TASK-071. This task confirms it works end-to-end in a browser context: two windows, same job, edits visible in both directions. If the WebSocket server is not deployed, document the local setup procedure.

## Steps

### 1. Confirm WebSocket server is reachable  <!-- agent: general-purpose -->

- [x] Read `.env.example` to confirm `VITE_WS_API_URL` is documented <!-- Completed: 2026-06-25 — already present with descriptive comment -->
- [DEFERRED-TO-UAT] If a deployed stack is available: set `VITE_WS_API_URL` to the API Gateway WebSocket URL and verify `wscat -c "$VITE_WS_API_URL?jobId=test&userId=u1&userName=Tester"` connects without error
- [DEFERRED-TO-UAT] If no deployed stack: document how to run the WebSocket Lambda locally (note: SAM does not support WebSocket API local emulation natively; recommend deploying to a dev stack)

### 2. Manual: two-browser sync test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Start the web dev server: `pnpm --filter @demand-letter/web dev`
- [DEFERRED-TO-UAT] Open browser window A at `/jobs/:id/editor` (use a job with generated output)
- [DEFERRED-TO-UAT] Open browser window B at the same URL in a different browser profile or incognito
- [DEFERRED-TO-UAT] Type "Hello from A" in window A
- [DEFERRED-TO-UAT] Confirm the text appears in window B within ~1 second
- [DEFERRED-TO-UAT] Type "Hello from B" in window B; confirm it appears in window A
- [DEFERRED-TO-UAT] Confirm window B shows a cursor indicator with a user name for the Window A user

### 3. Document known limitations  <!-- agent: general-purpose -->

- [x] If local WebSocket testing is not possible without deployment, create a note in `packages/web/src/pages/EditorPage.tsx` as a JSDoc comment: `// Real-time sync requires VITE_WS_API_URL to point to a deployed WebSocket API` <!-- Completed: 2026-06-25 -->
- [x] Add a visible message in EditorPage when `VITE_WS_API_URL` is unset: `"Collaborative editing requires a deployed WebSocket server. Export to Word is still available."` <!-- Completed: 2026-06-25 — amber banner using Tailwind amber-50/300/800 colors -->

### 4. Typecheck  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Completed: 2026-06-25 — all 3 packages (db, web, api) pass clean -->

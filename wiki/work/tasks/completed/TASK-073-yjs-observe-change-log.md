---
id: TASK-073
title: "Y.js observe hook on shared document: write CollaborativeChange records per transaction"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-069, TASK-072]
blocks: [TASK-074]
parallel_safe_with: []
uat: "[[UAT-073]]"
tags: [yjs, change-tracking, websocket, lambda, backend, collaboration]
---

# TASK-073 — Y.js Observe Hook → Write Change Log Records

## Objective

Attach a `Y.Doc.on('update', ...)` observer in the WebSocket sync Lambda so that every document transaction produces a `CollaborativeChange` row in PostgreSQL. Each record captures the operation type (insert / delete / format), the content delta (JSONB), and the user identity from the Y.js awareness state associated with the originating connection.

## Approach

The WebSocket sync Lambda receives binary Y.js update messages. When fanning out an update, also decode it (using `Y.applyUpdate` on a shadow `Y.Doc`) to determine the operation type and content delta. Store the user identity from the DynamoDB connection record (populated from a `user` querystring on `$connect`). Write the `CollaborativeChange` row via Prisma before fan-out completes.

## Steps

### 1. Pass user identity on $connect  <!-- agent: general-purpose -->

- [x] Update `packages/api/src/handlers/websocket-sync.ts` `$connect` handler:
  - Accept querystring params `userId` and `userName`; store them alongside `connectionId` and `jobId` in DynamoDB
  - Validate that `userId` and `userName` are present; if missing, reject with status 400 (API Gateway will close the connection)
- [x] Update `packages/web/src/pages/EditorPage.tsx`:
  - Pass the authenticated user's ID and name as querystring params when constructing `WebsocketProvider`:
    ```typescript
    const wsUrl = `${import.meta.env.VITE_WS_API_URL}?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`
    ```
  - Source `userId` and `userName` from the auth context (check `packages/web/src/lib/auth.tsx` for the current user object shape)

### 2. Decode Y.js update to extract operation type and delta  <!-- agent: general-purpose -->

- [x] In `packages/api/src/handlers/websocket-sync.ts`, on `message`:
  - Maintain a per-job shadow Y.Doc in memory (keyed by jobId) across invocations within the same Lambda instance; or load the latest snapshot from S3 if the shadow is absent
  - Apply the incoming update to the shadow doc and diff the resulting document to classify the operation:
    - If new content added → `operationType = 'insert'`, `contentDelta = { text: <inserted text> }`
    - If content removed → `operationType = 'delete'`, `contentDelta = { text: <deleted text> }`
    - If only marks changed → `operationType = 'format'`, `contentDelta = { marks: <changed marks> }`
  - Look up the sender's `userId` and `userName` from the DynamoDB connection record
  - Write to `collaborative_changes` via Prisma:
    ```typescript
    await prisma.collaborativeChange.create({
      data: { jobId, userId, userName, operationType, contentDelta, createdAt: new Date() }
    })
    ```

### 3. Add API endpoint to list changes  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/get-jobs-changes.ts`:
  - `GET /jobs/:id/changes` — return all `CollaborativeChange` rows for the job, sorted by `createdAt` ascending
  - Response shape: `{ changes: Array<{ id, userId, userName, operationType, contentDelta, createdAt }> }`
  - Register in `template.yaml` as `GetJobsChangesFunction`
- [x] Add `fetchJobChanges(id: string)` helper to `packages/web/src/lib/api.ts`

### 4. Typecheck and build  <!-- agent: general-purpose -->

- [x] `pnpm --filter @demand-letter/api typecheck` exits 0
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0
- [x] Lambda build artifact `.build/handlers/websocket-sync.js` and `.build/handlers/get-jobs-changes.js` emitted

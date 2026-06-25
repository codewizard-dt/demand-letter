---
id: TASK-071
title: "Persist Y.js document state snapshots to S3; restore from snapshot on reconnect"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-069, TASK-070]
blocks: []
parallel_safe_with: []
uat: "[[UAT-071]]"
tags: [yjs, s3, persistence, snapshot, collaboration, backend]
---

# TASK-071 — Y.js S3 Snapshot Persistence

## Objective

Persist Y.js document state to S3 so that a collaborative editing session survives Lambda cold starts and page refreshes. On new connection, the WebSocket Lambda loads the latest snapshot from S3 and sends it to the client before forwarding live updates. Incremental Y.js updates are buffered and flushed to S3 periodically (every N updates or on $disconnect).

## Approach

Store two objects per job in the existing `DocumentsBucket` S3 bucket:
- `ydoc-snapshots/{jobId}/full.bin` — full Y.js state vector encoded with `Y.encodeStateAsUpdate(ydoc)`
- `ydoc-snapshots/{jobId}/pending.bin` — accumulated incremental updates not yet merged into the full snapshot

On `$connect`, the Lambda reads `full.bin` from S3, sends it as the first WebSocket message (type `sync step 1`), then re-registers the connection for live updates. A CloudWatch Events rule (or EventBridge scheduler) triggers a `MergeYjsSnapshot` Lambda every 5 minutes to merge pending updates into the full snapshot.

## Steps

### 1. Update websocket-sync handler: load snapshot on $connect  <!-- agent: general-purpose -->

- [x] Edit `packages/api/src/handlers/websocket-sync.ts` (created in TASK-070):
  - On `$connect`: after writing the DynamoDB record, attempt `S3.getObject({ Bucket: DOCUMENTS_BUCKET, Key: `ydoc-snapshots/${jobId}/full.bin` })`
  - If the object exists, send the binary body to the connecting client via `ApiGatewayManagementApi.postToConnection` as a `sync step 1` Y.js message
  - If the object does not exist (NoSuchKey), send an empty sync message to initialize the client <!-- Completed: 2026-06-25 -->

### 2. Update websocket-sync handler: persist incremental updates  <!-- agent: general-purpose -->

- [x] On `message` (after fan-out to other connections): append the binary update to `ydoc-snapshots/${jobId}/pending.bin` in S3 using a put with `--if-match` or a conditional write pattern (get + merge + put) to avoid lost updates under concurrent writes
  - Simplification: use DynamoDB to atomically append update bytes (store as a list of Base64-encoded updates, max 400 KB item limit); flush the list to S3 on `$disconnect` <!-- Completed: 2026-06-25 -->

### 3. Create MergeYjsSnapshot Lambda  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/merge-yjs-snapshot.ts`:
  - List all keys under `ydoc-snapshots/` in S3
  - For each `{jobId}`, load `full.bin` and all pending updates, apply them to a fresh `Y.Doc` in Node.js, and write the merged state back as the new `full.bin`
  - Delete the pending updates after successful merge <!-- Completed: 2026-06-25 -->
- [x] Add to `template.yaml`:
  ```yaml
  MergeYjsSnapshotFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/merge-yjs-snapshot.handler
      Events:
        ScheduledMerge:
          Type: Schedule
          Properties:
            Schedule: rate(5 minutes)
  ``` <!-- Completed: 2026-06-25 -->

### 4. IAM permissions  <!-- agent: general-purpose -->

- [x] In `template.yaml`, add S3 permissions to `WebSocketSyncFunction`:
  - `s3:GetObject`, `s3:PutObject` on `arn:aws:s3:::${DocumentsBucket}/ydoc-snapshots/*` <!-- Completed: 2026-06-25 -->
- [x] Add the same permissions to `MergeYjsSnapshotFunction` <!-- Completed: 2026-06-25 (included in Step 3) -->

### 5. Install yjs in the API package  <!-- agent: general-purpose -->

- [x] Run:
  ```
  pnpm --filter @demand-letter/api add yjs
  ``` <!-- Completed: 2026-06-25 -->
- [x] Use `Y.Doc`, `Y.applyUpdate`, `Y.encodeStateAsUpdate` in the Lambda handlers (Node.js environment) <!-- Completed: 2026-06-25 -->

### 6. Smoke-test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Open a job in the editor, make edits, close the tab
- [DEFERRED-TO-UAT] Reopen the same job; confirm edits are restored from S3 snapshot
- [x] `pnpm --filter @demand-letter/api typecheck` and `pnpm --filter @demand-letter/web typecheck` both exit 0 <!-- Completed: 2026-06-25 -->

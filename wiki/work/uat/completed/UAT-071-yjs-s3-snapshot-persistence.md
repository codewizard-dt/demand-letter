---
id: UAT-071
title: "UAT: Persist Y.js document state snapshots to S3; restore from snapshot on reconnect"
status: passed
task: TASK-071
created: 2026-06-25
updated: 2026-06-25
---

# UAT-071 — UAT: Y.js S3 Snapshot Persistence

implements::[[TASK-071]]

> **Source task**: [[TASK-071]]
> **Generated**: 2026-06-25

---

## Prerequisites

- [ ] AWS SAM stack is deployed and the WebSocket API is live (`VITE_WS_API_URL` is set)
- [ ] `DocumentsBucket` S3 bucket exists and is accessible
- [ ] `WebSocketConnectionsTable` DynamoDB table exists with `jobId-index` GSI
- [ ] A valid job ID is available for testing (referred to as `$TEST_JOB_ID` below)
- [ ] `wscat` is installed (`npm install -g wscat`) for WebSocket tests
- [ ] AWS CLI is configured with credentials that can read/write to `DocumentsBucket`

---

## Test Cases

### UAT-STATIC-001: TypeScript compilation passes for both packages

- **Description**: Verify that the changes in TASK-071 (websocket-sync.ts, merge-yjs-snapshot.ts) compile without type errors.
- **Steps**:
  1. From the project root, run the typecheck commands below.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api typecheck && pnpm --filter @demand-letter/web typecheck && echo "TYPECHECK OK"
  ```
- **Expected Result**: Both commands exit 0; terminal prints `TYPECHECK OK`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-002: MergeYjsSnapshotFunction defined in template.yaml with 5-minute schedule

- **Description**: Verify that the SAM template declares `MergeYjsSnapshotFunction` with an EventBridge schedule at `rate(5 minutes)`.
- **Steps**:
  1. Run the grep command below against `template.yaml`.
- **Command**:
  ```bash
  grep -A 30 'MergeYjsSnapshotFunction:' template.yaml | grep -E 'rate\(5 minutes\)|Schedule:'
  ```
- **Expected Result**: Output includes both `Schedule:` and `rate(5 minutes)`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-003: S3 IAM permissions declared for both Lambda functions

- **Description**: Verify that `WebSocketSyncFunction` has `s3:GetObject` and `s3:PutObject` on `ydoc-snapshots/*`, and `MergeYjsSnapshotFunction` has `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, and `s3:ListBucket`.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -c 'ydoc-snapshots' template.yaml
  ```
- **Expected Result**: Output is `2` or greater (the path appears in both functions' IAM resource lists).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-004: merge-yjs-snapshot.ts handler file exists and exports handler

- **Description**: Verify that the merge Lambda handler file was created and exports a `handler` symbol.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -c 'export.*handler' packages/api/src/handlers/merge-yjs-snapshot.ts
  ```
- **Expected Result**: Output is `1`.
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-STATIC-005: websocket-sync.ts imports yjs and uses S3 snapshot keys

- **Description**: Verify that the WebSocket handler imports Y.js and references the `ydoc-snapshots/` S3 key pattern established by TASK-071.
- **Steps**:
  1. Run the command below.
- **Command**:
  ```bash
  grep -c 'ydoc-snapshots' packages/api/src/handlers/websocket-sync.ts
  ```
- **Expected Result**: Output is `2` or greater (both `full.bin` and `pending.bin` key references).
- [x] Pass <!-- 2026-06-25 -->

---

### UAT-UI-001: WebSocket $connect delivers existing snapshot to client

- **Page**: `/jobs/:id/editor`
- **Description**: When a client connects to the WebSocket API for a job that has an existing `ydoc-snapshots/{jobId}/full.bin` in S3, the first WebSocket message received by the client must contain the binary snapshot bytes (non-empty, valid Y.js update).
- **Steps**:
  1. Pre-seed the S3 bucket: create a minimal Y.js update binary and upload it:
     ```bash
     node -e "const Y=require('yjs'); const d=new Y.Doc(); d.getText('content').insert(0,'hello'); const b=Y.encodeStateAsUpdate(d); require('fs').writeFileSync('/tmp/full.bin',b);"
     aws s3 cp /tmp/full.bin "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID/full.bin"
     ```
  2. Connect to the WebSocket API with `wscat`:
     ```
     wscat -c "$VITE_WS_API_URL?jobId=$TEST_JOB_ID&userId=test-user&userName=Tester"
     ```
  3. Observe the first message received immediately after connecting.
- **Expected Result**: The client receives a binary message within 2 seconds of connecting. The message is non-empty and, when decoded as a Y.js update, yields a document whose `content` text includes `"hello"`.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: WebSocket $connect with no existing snapshot delivers empty Y.js update

- **Page**: WebSocket API (wscat)
- **Description**: When a client connects to the WebSocket API for a job that has no `ydoc-snapshots/{jobId}/full.bin` in S3, the client still receives a non-error binary message (an empty Y.js state update, not a connection failure).
- **Steps**:
  1. Ensure no snapshot exists for `$TEST_JOB_ID_NEW` (a job ID with no S3 objects):
     ```bash
     aws s3 rm "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID_NEW/" --recursive 2>/dev/null || true
     ```
  2. Connect to the WebSocket API:
     ```
     wscat -c "$VITE_WS_API_URL?jobId=$TEST_JOB_ID_NEW&userId=test-user&userName=Tester"
     ```
  3. Observe the first message received.
- **Expected Result**: The client receives a binary message (the encoded state of an empty Y.Doc — typically a small byte sequence) and is not disconnected with an error code.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: WebSocket $connect with missing jobId returns 400

- **Page**: WebSocket API (wscat)
- **Description**: Connecting without required query parameters (`jobId`, `userId`, `userName`) must cause the Lambda to return status 400, which closes the WebSocket with a non-success code.
- **Steps**:
  1. Attempt to connect without `jobId`:
     ```
     wscat -c "$VITE_WS_API_URL?userId=test-user&userName=Tester"
     ```
  2. Observe the connection result.
- **Expected Result**: The connection is rejected (closed by the server) immediately. `wscat` reports a close code or an error — the connection is not established as open.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-004: Sending a WebSocket message persists incremental update to S3 pending.bin

- **Page**: WebSocket API (wscat)
- **Description**: When a connected client sends a Y.js binary update message, `websocket-sync.ts` must write/merge it into `ydoc-snapshots/{jobId}/pending.bin` in S3.
- **Steps**:
  1. Connect to the WebSocket API:
     ```
     wscat -c "$VITE_WS_API_URL?jobId=$TEST_JOB_ID&userId=test-user&userName=Tester" --binary
     ```
  2. Send a valid Y.js binary update (Base64-encoded in the message body per the Lambda's `Buffer.from(body, 'base64')` decode).
  3. Wait 1 second, then check S3 for the pending key:
     ```bash
     aws s3 ls "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID/pending.bin"
     ```
- **Expected Result**: `aws s3 ls` shows `pending.bin` exists with a non-zero size.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-INTEGRATION-001: MergeYjsSnapshotFunction merges pending.bin into full.bin and deletes pending.bin

- **Description**: Invoke the `MergeYjsSnapshotFunction` Lambda directly (or wait for the 5-minute schedule) with both `full.bin` and `pending.bin` present for a test job. After the merge, `full.bin` must be updated and `pending.bin` must be deleted.
- **Steps**:
  1. Upload a valid full snapshot and a pending update for the test job:
     ```bash
     node -e "const Y=require('yjs'); const d=new Y.Doc(); d.getText('content').insert(0,'base'); const b=Y.encodeStateAsUpdate(d); require('fs').writeFileSync('/tmp/full.bin',b);"
     node -e "const Y=require('yjs'); const d=new Y.Doc(); d.getText('content').insert(4,' updated'); const b=Y.encodeStateAsUpdate(d); require('fs').writeFileSync('/tmp/pending.bin',b);"
     aws s3 cp /tmp/full.bin "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID/full.bin"
     aws s3 cp /tmp/pending.bin "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID/pending.bin"
     ```
  2. Invoke the Lambda directly via AWS CLI:
     ```bash
     aws lambda invoke --function-name "$STACK_NAME-MergeYjsSnapshotFunction" --payload '{}' /tmp/merge-response.json && cat /tmp/merge-response.json
     ```
  3. Check S3 for the updated `full.bin` and absence of `pending.bin`:
     ```bash
     aws s3 ls "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID/" | grep -E 'full.bin|pending.bin'
     ```
- **Expected Result**: `full.bin` is present with a size greater than or equal to the original; `pending.bin` is absent from the listing. Lambda invocation response shows no error.
- [FAIL: auto-judge: prerequisite not satisfied — requires deployed AWS SAM stack with accessible S3 and Lambda] <!-- 2026-06-25 -->

---

### UAT-INTEGRATION-002: Snapshot restored on reconnect after session

- **Description**: Full end-to-end persistence round-trip: open the editor for a job, type content, disconnect (close browser tab), reconnect, and verify the typed content is still present (loaded from the S3 snapshot).
- **Page**: `/jobs/:id/editor`
- **Steps**:
  1. Navigate to `/jobs/$TEST_JOB_ID/editor` in the browser while logged in.
  2. Wait for the editor to load (spinner disappears, editor is visible).
  3. In the Tiptap editor, type a unique test string (e.g., `UAT-071-PERSISTENCE-CHECK`).
  4. Wait 2 seconds for the update to fan out.
  5. Close the browser tab (triggering `$disconnect` → pending.bin flush / the periodic merge).
  6. Manually trigger the merge Lambda or wait 5 minutes for the EventBridge schedule.
  7. Reopen `/jobs/$TEST_JOB_ID/editor` in a new tab.
  8. Wait for the editor to load.
  9. Inspect the editor content.
- **Expected Result**: The editor content includes `UAT-071-PERSISTENCE-CHECK` — the text typed in step 3 is restored from the S3 snapshot without any manual action.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: MergeYjsSnapshotFunction is a no-op when no pending.bin exists

- **Description**: If `pending.bin` does not exist for a job, `mergeJobSnapshot` must return without modifying `full.bin` or throwing an error.
- **Steps**:
  1. Ensure a valid `full.bin` exists but no `pending.bin` for the test job:
     ```bash
     aws s3 rm "s3://$DOCUMENTS_BUCKET/ydoc-snapshots/$TEST_JOB_ID/pending.bin" 2>/dev/null || true
     ```
  2. Record the ETag or LastModified of `full.bin`:
     ```bash
     aws s3api head-object --bucket "$DOCUMENTS_BUCKET" --key "ydoc-snapshots/$TEST_JOB_ID/full.bin" --query 'ETag' --output text
     ```
  3. Invoke the merge Lambda:
     ```bash
     aws lambda invoke --function-name "$STACK_NAME-MergeYjsSnapshotFunction" --payload '{}' /tmp/merge-response2.json && cat /tmp/merge-response2.json
     ```
  4. Re-check the ETag of `full.bin`:
     ```bash
     aws s3api head-object --bucket "$DOCUMENTS_BUCKET" --key "ydoc-snapshots/$TEST_JOB_ID/full.bin" --query 'ETag' --output text
     ```
- **Expected Result**: The ETag of `full.bin` is unchanged (not re-written). Lambda invocation returns without error.
- [FAIL: auto-judge: prerequisite not satisfied — requires deployed AWS SAM stack with accessible S3 and Lambda] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Stale WebSocket connection is cleaned up on message fan-out

- **Description**: When `handleYjsUpdate` attempts to post to a connection that no longer exists (GoneException), it must silently delete that connection record from DynamoDB without surfacing an error to the sender.
- **Steps**:
  1. Manually insert a stale connection record into `WebSocketConnectionsTable` with a fake `connectionId` and the target `jobId`:
     ```bash
     aws dynamodb put-item --table-name "$CONNECTIONS_TABLE" \
       --item '{"connectionId":{"S":"STALE-CONN-001"},"jobId":{"S":"'"$TEST_JOB_ID"'"},"userId":{"S":"stale"},"userName":{"S":"Stale User"},"ttl":{"N":"9999999999"}}'
     ```
  2. Connect a live WebSocket client to the same job and send a Y.js update (see UAT-UI-004 for the send pattern).
  3. After sending, check whether the stale record still exists:
     ```bash
     aws dynamodb get-item --table-name "$CONNECTIONS_TABLE" \
       --key '{"connectionId":{"S":"STALE-CONN-001"}}' --query 'Item'
     ```
- **Expected Result**: The DynamoDB `get-item` returns `null` (the stale connection record was deleted). The live WebSocket connection is unaffected (the sender receives a `200 OK` response from the route handler).
- [FAIL: auto-judge: prerequisite not satisfied — requires deployed AWS SAM stack with accessible DynamoDB and WebSocket API] <!-- 2026-06-25 -->

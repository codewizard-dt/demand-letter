---
id: UAT-070
title: "UAT: WebSocket Sync Server"
status: pending
task: TASK-070
created: 2026-06-25
updated: 2026-06-25
---

# UAT-070 — UAT: WebSocket Sync Server

implements::[[TASK-070]]

> **Source task**: [[TASK-070]]
> **Generated**: 2026-06-25

Tests verify: build artifact output, SAM template infrastructure definition,
Lambda WebSocket handler routes (`$connect`, `$disconnect`, `message`), fan-out
behaviour, stale-connection cleanup, and frontend Y.js provider wiring.

---

## Prerequisites

- [ ] Node.js toolchain available; repo built at least once (`pnpm build`)
- [ ] `wscat` installed: `npm install -g wscat` (WebSocket CLI client)
- [ ] `aws` CLI configured with credentials for the deployment account
- [ ] Set shell env vars before running deployed-stack tests:
  ```bash
  export UAT_WS_URL="wss://<api-id>.execute-api.<region>.amazonaws.com/prod"
  export UAT_CONNECTIONS_TABLE="<stack-name>-websocket-connections"
  ```
- [ ] For UI tests: local dev server running (`pnpm dev`) **or** deployed frontend;
  a job record with a known `id` exists in the database

---

## Test Cases

### UAT-STATIC-001: Build artifact emitted after `pnpm build`

- **Description**: Verifies that the esbuild pipeline produces
  `.build/handlers/websocket-sync.js` and that it exports the expected handler
  symbol.
- **Steps**:
  1. From the repository root, run the build command below.
  2. Confirm the command exits 0 and the output line appears.
- **Command**:
  ```bash
  pnpm --filter @demand-letter/api build && node -e "const m = require('./.build/handlers/websocket-sync.js'); console.log('handler:', typeof m.handler);"
  ```
- **Expected Result**: Build exits 0; final output line is `handler: function`.
- [FAIL: auto-judge: command exited with error — Cannot find module '@aws-sdk/client-dynamodb'; build artifact not self-contained outside Lambda runtime] <!-- 2026-06-25 -->

---

### UAT-STATIC-002: template.yaml declares `WebSocketConnectionsTable` with correct schema

- **Description**: Verifies the DynamoDB table resource has the required PK, GSI
  (`jobId-index`), and TTL attribute — all required for stateless Lambda fan-out.
- **Steps**:
  1. Open `template.yaml` and locate the `WebSocketConnectionsTable` resource
     (around line 736).
  2. Confirm each item in the checklist is present:
     - `Type: AWS::DynamoDB::Table`
     - `BillingMode: PAY_PER_REQUEST`
     - Primary key: `AttributeName: connectionId`, `KeyType: HASH`
     - GSI named `jobId-index` keyed on `AttributeName: jobId`, `KeyType: HASH`
     - TTL: `AttributeName: ttl`, `Enabled: true`
- **Expected Result**: All five checklist items confirmed present in the file.
- [FAIL: auto-judge: manual test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-STATIC-003: template.yaml declares `WebSocketApi` with all three routes and correct IAM permissions

- **Description**: Confirms the API Gateway WebSocket API, its three routes
  (`$connect`, `$disconnect`, `message`), the `prod` stage, and the Lambda IAM
  policy are all defined.
- **Steps**:
  1. Locate `WebSocketApi` (around line 760) — confirm `ProtocolType: WEBSOCKET`
     and `RouteSelectionExpression: "$request.body.action"`.
  2. Confirm `WebSocketConnectRoute` has `RouteKey: $connect`,
     `WebSocketDisconnectRoute` has `RouteKey: $disconnect`, and
     `WebSocketMessageRoute` has `RouteKey: message`.
  3. Confirm `WebSocketStage` has `StageName: prod` and `AutoDeploy: true`.
  4. In `WebSocketSyncFunction`, confirm the IAM policy includes:
     - Actions `dynamodb:PutItem`, `dynamodb:DeleteItem`, `dynamodb:Query` on
       both the table ARN and its `index/*` ARN.
     - Action `execute-api:ManageConnections` on the WebSocket API ARN.
  5. Confirm env var `CONNECTIONS_TABLE: !Ref WebSocketConnectionsTable` is set
     on the function.
- **Expected Result**: All five checklist items confirmed.
- [FAIL: auto-judge: manual test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-STATIC-004: `VITE_WS_API_URL` present in `.env.example`

- **Description**: Verifies that the frontend env var required by `EditorPage`
  is documented for local setup.
- **Steps**:
  1. Open `.env.example`.
  2. Confirm a line matching `VITE_WS_API_URL=wss://...` is present.
- **Expected Result**: Line exists and shows a `wss://` placeholder URL.
- [FAIL: auto-judge: manual test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-API-001: `$connect` with valid `jobId` — connection accepted, record written to DynamoDB

- **Description**: Verifies the happy-path connect flow: the handler stores
  `{connectionId, jobId, ttl}` in DynamoDB and returns HTTP 200 to API Gateway.
- **Steps**:
  1. In a terminal, run the connect command below. The connection should stay
     open (`wscat` shows `Connected (press CTRL+C to quit)`).
  2. While the connection is open, run the DynamoDB query command in a second
     terminal to verify the record was written.
  3. Close the first terminal (CTRL+C).
- **Command** (terminal 1 — connect):
  ```bash
  wscat --connect "${UAT_WS_URL}?jobId=uat-job-070-a"
  ```
- **Command** (terminal 2 — verify DynamoDB record):
  ```bash
  aws dynamodb query --table-name "$UAT_CONNECTIONS_TABLE" --index-name "jobId-index" --key-condition-expression "jobId = :jid" --expression-attribute-values '{":jid":{"S":"uat-job-070-a"}}' --query 'Items[*].{conn:connectionId.S,job:jobId.S,ttl:ttl.N}' --output json
  ```
- **Expected Result**: `wscat` shows `Connected`. DynamoDB query returns a JSON
  array with one item whose `job` field is `"uat-job-070-a"` and whose `ttl`
  value is approximately `now + 3600` seconds.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_WS_URL and UAT_CONNECTIONS_TABLE not set; aws credentials expired] <!-- 2026-06-25 -->

---

### UAT-API-002: `$connect` missing `jobId` — connection rejected with 400

- **Description**: Verifies that the handler returns `400 'Missing jobId'` when
  the `jobId` querystring parameter is absent, causing API Gateway to close the
  connection immediately.
- **Steps**:
  1. Run the command below.
  2. Observe that wscat exits immediately with a non-zero status or prints a
     close code.
- **Command**:
  ```bash
  wscat --connect "${UAT_WS_URL}" --wait 3
  ```
- **Expected Result**: Connection is refused or immediately closed. `wscat`
  prints a close / error indication and exits with a non-zero status code.
  No DynamoDB record should be written (verify with the DynamoDB query from
  UAT-API-001 using a jobId that was never sent).
- [FAIL: auto-judge: prerequisite not satisfied — UAT_WS_URL and UAT_CONNECTIONS_TABLE not set; aws credentials expired] <!-- 2026-06-25 -->

---

### UAT-API-003: `$disconnect` — DynamoDB record deleted on close

- **Description**: Verifies that when a client disconnects the handler deletes
  the connection record from DynamoDB so the room membership stays accurate.
- **Steps**:
  1. Connect with a unique jobId, confirm the record exists (as in UAT-API-001).
  2. Close the wscat connection (CTRL+C or let the command below close after
     `--wait`).
  3. Query DynamoDB for the same jobId; the record should be gone.
- **Command** (connect then auto-close after 3 s):
  ```bash
  wscat --connect "${UAT_WS_URL}?jobId=uat-job-070-b" --wait 3
  ```
- **Command** (verify record gone after close):
  ```bash
  aws dynamodb query --table-name "$UAT_CONNECTIONS_TABLE" --index-name "jobId-index" --key-condition-expression "jobId = :jid" --expression-attribute-values '{":jid":{"S":"uat-job-070-b"}}' --query 'Items' --output json
  ```
- **Expected Result**: After wscat exits, the DynamoDB query returns an empty
  array `[]`.
- [FAIL: auto-judge: prerequisite not satisfied — UAT_WS_URL and UAT_CONNECTIONS_TABLE not set; aws credentials expired] <!-- 2026-06-25 -->

---

### UAT-API-004: `message` fan-out — binary update delivered to peer in same room

- **Description**: Verifies that a binary Y.js update sent by one connected
  client is forwarded (in base64-decoded binary form) to all other clients in
  the same `jobId` room, and the sender does **not** receive its own message.
- **Steps**:
  1. **Terminal A** (receiver): connect and leave open.
     ```bash
     wscat --connect "${UAT_WS_URL}?jobId=uat-job-070-fan"
     ```
  2. **Terminal B** (sender): connect and send a binary-safe base64 payload.
     In wscat you can send binary by typing a message; for this test send a
     text payload that the handler will base64-decode and re-encode:
     ```bash
     wscat --connect "${UAT_WS_URL}?jobId=uat-job-070-fan"
     ```
     Once connected in terminal B, type and send: `SGVsbG8gWS5qcw==` (base64
     for `Hello Y.js`).
  3. Observe Terminal A for the incoming message.
- **Expected Result**:
  - Terminal A receives `SGVsbG8gWS5qcw==` (or the decoded equivalent,
    depending on wscat mode).
  - Terminal B does **not** echo the message back to itself.
  - Handler returns `200 OK` (visible in CloudWatch logs or SAM output).
- [FAIL: auto-judge: prerequisite not satisfied — UAT_WS_URL and UAT_CONNECTIONS_TABLE not set; aws credentials expired] <!-- 2026-06-25 -->

---

### UAT-EDGE-001: `message` from connection with no prior `$connect` — returns 400

- **Description**: Verifies that if the DynamoDB table has no record for a
  connectionId (e.g. it was never inserted or TTL-expired), the handler returns
  `400 'Unknown connection'` rather than throwing.
- **Scenario**: Simulate by querying the primary key directly — no wscat needed.
  The scenario is fully covered by invoking the Lambda directly (SAM local or
  deployed) with a fabricated event, or by inspecting the handler code path and
  confirming the guard at the `senderItem?.jobId?.S` check.
- **Steps**:
  1. If SAM CLI is available (`sam local start-lambda`), invoke with the payload
     below. Otherwise skip to step 3.
     ```bash
     aws lambda invoke --function-name WebSocketSyncFunction --payload '{"requestContext":{"connectionId":"fake-id-not-in-db","routeKey":"message","domainName":"localhost","stage":"local"},"body":"SGVsbG8="}' /tmp/edge001-out.json && cat /tmp/edge001-out.json
     ```
  2. Confirm response is `{"statusCode":400,"body":"Unknown connection"}`.
  3. If SAM local is unavailable, verify the code path in
     `packages/api/src/handlers/websocket-sync.ts` lines 126–133: the handler
     checks `senderItem?.jobId?.S` and returns `400` when absent.
- **Expected Result**: Response body is `Unknown connection` with status 400.
- [FAIL: auto-judge: manual test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-EDGE-002: Stale connection (GoneException) cleaned up — fan-out continues

- **Description**: Verifies that when `PostToConnectionCommand` throws
  `GoneException` for a stale peer, the handler deletes that stale record from
  DynamoDB and continues delivering to remaining healthy connections (does not
  propagate the error).
- **Scenario**: Hard to trigger live without killing a connection mid-session.
  Verify by code inspection of `handleYjsUpdate` in `websocket-sync.ts`
  lines 54–67, confirming the `catch (err)` block:
  1. Checks `err instanceof GoneException`.
  2. On match: calls `DeleteItemCommand` with the stale `connectionId`.
  3. On non-match: re-throws (does not swallow unexpected errors).
- **Steps**:
  1. Open `packages/api/src/handlers/websocket-sync.ts` and locate
     `handleYjsUpdate` (starts at line 31).
  2. Confirm the three behaviours listed above are present in the `catch` block.
  3. Optionally deploy, connect two clients, forcibly terminate one via AWS
     console (delete the connection from the API Gateway console), then send
     from the other — observe CloudWatch logs showing the stale-connection
     cleanup log entry and that the remaining client receives the message.
- **Expected Result**: Code confirms stale-connection catch handles
  `GoneException` + `DeleteItemCommand`, and re-throws other errors.
- [FAIL: auto-judge: manual test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-001: `EditorPage` renders at `/jobs/:id/editor` and initialises `WebsocketProvider`

- **Description**: Verifies the frontend wires `y-websocket`'s
  `WebsocketProvider` to the Y.Doc used by TipTap, and that the page loads
  without console errors related to the WebSocket provider.
- **Page**: `/jobs/<valid-job-id>/editor`
- **Steps**:
  1. Set `VITE_WS_API_URL` to the deployed WebSocket URL (or a local mock).
  2. Navigate to `http://localhost:5173/jobs/<valid-job-id>/editor`.
  3. Open the browser DevTools → Console tab.
  4. Observe the page: the editor should appear (or a loading spinner while
     fetching the DOCX, then the editor).
  5. In DevTools → Network → WS tab, confirm a WebSocket connection was opened
     to `$VITE_WS_API_URL?jobId=<valid-job-id>` (i.e. room name `job-<id>`).
- **Expected Result**:
  - No `WebsocketProvider` or Y.js errors in the console.
  - A WebSocket connection appears in the Network → WS tab with status 101.
  - The connection URL contains `job-<valid-job-id>` as the room name.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-002: Real-time Y.js sync — edits in one tab appear in another

- **Description**: End-to-end smoke test of the full collaboration loop: two
  browser tabs sharing the same job see each other's TipTap edits in real time
  via the WebSocket fan-out server.
- **Page**: `/jobs/<valid-job-id>/editor` (same URL in both tabs)
- **Steps**:
  1. Open two browser tabs both pointing to the same editor URL for the same
     `jobId`.
  2. Confirm both tabs show the editor with content loaded (wait for loading
     spinner to disappear).
  3. In **Tab A**, place the cursor at the start of the document and type a
     distinctive test phrase, e.g. `UAT-070-sync-test`.
  4. Switch to **Tab B** without clicking anything.
  5. Observe Tab B.
- **Expected Result**: Within ≤ 2 seconds, the phrase `UAT-070-sync-test`
  appears in Tab B's editor at the same position it was typed in Tab A, without
  any page reload.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

---

### UAT-UI-003: Provider destroyed on `EditorPage` unmount — no lingering WebSocket

- **Description**: Verifies that navigating away from the editor page calls
  `provider.destroy()` and closes the WebSocket connection, preventing resource
  leaks.
- **Page**: `/jobs/<valid-job-id>/editor`
- **Steps**:
  1. Open the editor page and confirm a WebSocket connection is open in DevTools
     → Network → WS.
  2. Navigate away (e.g. click the back button or navigate to `/`).
  3. Observe the WS entry in DevTools.
- **Expected Result**: The WebSocket connection transitions to `closed` status
  in the Network → WS panel after navigation. No reconnect attempts appear.
- [FAIL: auto-judge: UI test requires human verification — use /uat-walk] <!-- 2026-06-25 -->

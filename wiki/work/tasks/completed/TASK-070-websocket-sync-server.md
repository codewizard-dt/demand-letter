---
id: TASK-070
title: "WebSocket sync server: API Gateway WebSocket + Lambda (or y-websocket ECS) with Y.js awareness"
status: done
created: 2026-06-25
updated: 2026-06-25
depends_on: [TASK-069]
blocks: [TASK-071]
parallel_safe_with: []
uat: "[[UAT-070]]"
tags: [yjs, websocket, api-gateway, lambda, ecs, collaboration, backend]
---

# TASK-070 — WebSocket Sync Server

## Objective

Stand up a WebSocket endpoint that distributes Y.js CRDT updates between connected clients so edits in one browser window appear in real-time in all others sharing the same job. Also broadcast Y.js awareness state (user name, cursor position, cursor colour) for live presence indicators.

## Approach

Use API Gateway WebSocket API with a dedicated Lambda handler (`websocket-sync`). The handler implements the `y-websocket` protocol: on `$connect` subscribe the connection to a room keyed by `jobId`; on `message` fan-out the binary Y.js update to all other connections in the room; on `$disconnect` clean up. Connection-to-room mappings are stored in a DynamoDB table (`WebSocketConnections`) for stateless Lambda operation. The frontend uses `y-websocket`'s `WebsocketProvider` (already in `yjs` ecosystem) to connect. If API Gateway WebSocket proves too complex, fall back to a small ECS Fargate container running the official `y-websocket` server — this decision is noted in the task.

## Steps

### 1. Add DynamoDB WebSocketConnections table to template.yaml  <!-- agent: general-purpose -->

- [x] Edit `template.yaml`: <!-- Completed: 2026-06-25 -->
  - Add resource `WebSocketConnectionsTable`:
    ```yaml
    WebSocketConnectionsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: !Sub "${AWS::StackName}-websocket-connections"
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: connectionId
            AttributeType: S
          - AttributeName: jobId
            AttributeType: S
        KeySchema:
          - AttributeName: connectionId
            KeyType: HASH
        GlobalSecondaryIndexes:
          - IndexName: jobId-index
            KeySchema:
              - AttributeName: jobId
                KeyType: HASH
            Projection:
              ProjectionType: ALL
        TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true
    ```
  - Add API Gateway WebSocket API resource `WebSocketApi`:
    ```yaml
    WebSocketApi:
      Type: AWS::ApiGatewayV2::Api
      Properties:
        Name: !Sub "${AWS::StackName}-ws"
        ProtocolType: WEBSOCKET
        RouteSelectionExpression: "$request.body.action"
    ```
  - Add routes: `$connect`, `$disconnect`, `message` — each pointing to `WebSocketSyncFunction`

### 2. Create WebSocket Lambda handler  <!-- agent: general-purpose -->

- [x] Create `packages/api/src/handlers/websocket-sync.ts`: <!-- Completed: 2026-06-25 -->
  - Export `handler(event: APIGatewayProxyWebsocketHandlerV2)`
  - On `$connect`: write `{ connectionId, jobId (from querystring), ttl: now+3600 }` to DynamoDB
  - On `$disconnect`: delete the connection record
  - On `message`: query DynamoDB for all connections with matching `jobId`, fan-out the binary body to each via `ApiGatewayManagementApi.postToConnection`; handle stale connections (delete on `GoneException`)
  - Grant the Lambda IAM role: `dynamodb:PutItem`, `dynamodb:DeleteItem`, `dynamodb:Query` on `WebSocketConnectionsTable`; `execute-api:ManageConnections` on the WebSocket API

### 3. Add handler to build pipeline  <!-- agent: general-purpose -->

- [x] Add `websocket-sync` to the build/bundle step (same pattern as other handlers — check `package.json` scripts and `esbuild` config) <!-- Completed: 2026-06-25 -->
- [x] Verify `.build/handlers/websocket-sync.js` is emitted after `pnpm build` <!-- Completed: 2026-06-25 -->

### 4. Wire frontend WebSocket provider  <!-- agent: general-purpose -->

- [x] Run from the repo root: <!-- Completed: 2026-06-25 -->
  ```
  pnpm --filter @demand-letter/web add y-websocket
  ```
- [x] Edit `packages/web/src/pages/EditorPage.tsx`: <!-- Completed: 2026-06-25 -->
  - Import `{ WebsocketProvider }` from `y-websocket`
  - After Y.Doc creation, create provider:
    ```typescript
    const wsUrl = import.meta.env.VITE_WS_API_URL // e.g. wss://xxx.execute-api.us-east-1.amazonaws.com/prod
    const provider = useMemo(
      () => new WebsocketProvider(wsUrl, `job-${id}`, ydoc),
      [wsUrl, id, ydoc]
    )
    ```
  - Update `CollaborationCursor.configure({ provider })` to use the real provider
  - Clean up on unmount: `useEffect(() => () => provider.destroy(), [provider])`
- [x] Add `VITE_WS_API_URL` to `.env.example` with a placeholder comment <!-- Completed: 2026-06-25 -->

### 5. Smoke-test  <!-- agent: general-purpose -->

- [DEFERRED-TO-UAT] Deploy or start `sam local start-api` (if WebSocket SAM local emulation is available); alternatively test with a deployed stack
- [DEFERRED-TO-UAT] Open two browser tabs to the same `/jobs/:id/editor`
- [DEFERRED-TO-UAT] Type in one tab; confirm the change appears in the other
- [x] `pnpm --filter @demand-letter/web typecheck` exits 0 <!-- Verified via make typecheck: 2026-06-25 -->

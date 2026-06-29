// app/server/src/handlers/websocket-sync.ts
// WebSocket sync handler — distributes Y.js CRDT updates and awareness state
// between clients sharing the same jobId room.
//
// Extension point for TASK-073: the `message` branch calls handleYjsUpdate()
// which is designed to be extended with Y.js observe hooks.

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import * as Y from 'yjs';
import { prisma } from '@demand-letter/db';

const TABLE = process.env.CONNECTIONS_TABLE!;
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET!;

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});

// Per-job shadow Y.Doc instances — reused across invocations within the same Lambda instance.
const shadowDocs = new Map<string, Y.Doc>();

/**
 * Fan-out a Y.js binary update or awareness message to all other connections
 * in the same room.
 *
 * TASK-073 extension point: import and call y-protocols handlers here before
 * the fan-out so server-side Y.Doc state can be maintained.
 */
async function handleYjsUpdate(
  jobId: string,
  senderConnectionId: string,
  userId: string,
  userName: string,
  body: string,
  callbackUrl: string,
): Promise<void> {
  const apigw = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });

  // Query all connections for this jobId room
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'jobId-index',
      KeyConditionExpression: 'jobId = :jobId',
      ExpressionAttributeValues: { ':jobId': { S: jobId } },
    }),
  );

  const connections = result.Items ?? [];
  const payload = Buffer.from(body, 'base64');
  const update = new Uint8Array(payload);

  // Fan out the raw Y.js update to all other connections in the room
  await Promise.all(
    connections
      .filter((c) => c.connectionId?.S !== senderConnectionId)
      .map(async (c) => {
        const targetId = c.connectionId!.S!;
        try {
          await apigw.send(
            new PostToConnectionCommand({
              ConnectionId: targetId,
              Data: payload,
            }),
          );
        } catch (err: unknown) {
          if (err instanceof GoneException) {
            // Stale connection — clean up
            await dynamo.send(
              new DeleteItemCommand({
                TableName: TABLE,
                Key: { connectionId: { S: targetId } },
              }),
            );
          } else {
            throw err;
          }
        }
      }),
  );

  // Persist the incremental update to S3 (merge into pending.bin)
  try {
    const pendingKey = `ydoc-snapshots/${jobId}/pending.bin`;
    let mergedBytes: Uint8Array;
    try {
      const existing = await s3.send(
        new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: pendingKey }),
      );
      const existingBytes = await existing.Body!.transformToByteArray();
      mergedBytes = Y.mergeUpdates([existingBytes, update]);
    } catch (err) {
      if (err instanceof NoSuchKey) {
        mergedBytes = update;
      } else {
        throw err;
      }
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: DOCUMENTS_BUCKET,
        Key: pendingKey,
        Body: mergedBytes,
        ContentType: 'application/octet-stream',
      }),
    );
  } catch (err) {
    console.error('websocket-sync: failed to persist update to S3', err);
    // Non-fatal — fan-out already succeeded
  }

  // Apply the update to the per-job shadow doc and classify the operation
  try {
    if (!shadowDocs.has(jobId)) {
      shadowDocs.set(jobId, new Y.Doc());
    }
    const doc = shadowDocs.get(jobId)!;
    const yText = doc.getText('content');

    const beforeText = yText.toString();
    Y.applyUpdate(doc, update);
    const afterText = yText.toString();

    let operationType: string;
    let contentDelta: Record<string, string>;

    if (afterText.length > beforeText.length) {
      // Insert: locate inserted span via common prefix + suffix
      operationType = 'insert';
      let prefixLen = 0;
      while (prefixLen < beforeText.length && beforeText[prefixLen] === afterText[prefixLen]) {
        prefixLen++;
      }
      let suffixLen = 0;
      const maxSuffix = Math.min(beforeText.length - prefixLen, afterText.length - prefixLen);
      while (
        suffixLen < maxSuffix &&
        beforeText[beforeText.length - 1 - suffixLen] === afterText[afterText.length - 1 - suffixLen]
      ) {
        suffixLen++;
      }
      const inserted = afterText.slice(prefixLen, afterText.length - suffixLen);
      contentDelta = { text: inserted };
    } else if (afterText.length < beforeText.length) {
      // Delete: locate deleted span via common prefix + suffix
      operationType = 'delete';
      let prefixLen = 0;
      while (prefixLen < afterText.length && beforeText[prefixLen] === afterText[prefixLen]) {
        prefixLen++;
      }
      let suffixLen = 0;
      const maxSuffix = Math.min(afterText.length - prefixLen, beforeText.length - prefixLen);
      while (
        suffixLen < maxSuffix &&
        beforeText[beforeText.length - 1 - suffixLen] === afterText[afterText.length - 1 - suffixLen]
      ) {
        suffixLen++;
      }
      const deleted = beforeText.slice(prefixLen, beforeText.length - suffixLen);
      contentDelta = { text: deleted };
    } else {
      // Text length unchanged — attribute/mark change
      operationType = 'format';
      contentDelta = { marks: 'changed' };
    }

    await prisma.collaborativeChange.create({
      data: {
        jobId,
        userId,
        userName,
        operationType,
        contentDelta,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error('websocket-sync: failed to log collaborative change', err);
    // Non-fatal — message delivery already succeeded; do not surface to client
  }
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const { connectionId, routeKey, domainName, stage } =
    event.requestContext as {
      connectionId: string;
      routeKey: string;
      domainName: string;
      stage: string;
    };

  const callbackUrl = `https://${domainName}/${stage}`;

  try {
    if (routeKey === '$connect') {
      const jobId = event.queryStringParameters?.jobId;
      const userId = event.queryStringParameters?.userId;
      const userName = event.queryStringParameters?.userName;
      if (!jobId || !userId || !userName) {
        return { statusCode: 400, body: 'Missing jobId, userId, or userName' };
      }
      const ttl = Math.floor(Date.now() / 1000) + 3600; // 1-hour TTL
      await dynamo.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: {
            connectionId: { S: connectionId },
            jobId: { S: jobId },
            userId: { S: userId },
            userName: { S: userName },
            ttl: { N: String(ttl) },
          },
        }),
      );

      // Send the current document snapshot to the connecting client
      try {
        const connectApigw = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
        let snapshotBytes: Uint8Array;
        try {
          const s3Result = await s3.send(
            new GetObjectCommand({
              Bucket: DOCUMENTS_BUCKET,
              Key: `ydoc-snapshots/${jobId}/full.bin`,
            }),
          );
          snapshotBytes = await s3Result.Body!.transformToByteArray();
        } catch (err) {
          if (err instanceof NoSuchKey) {
            snapshotBytes = Y.encodeStateAsUpdate(new Y.Doc());
          } else {
            throw err;
          }
        }
        await connectApigw.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: snapshotBytes,
          }),
        );
      } catch (err) {
        console.error('websocket-sync: failed to send snapshot on $connect', err);
        // Non-fatal — connection proceeds without initial snapshot
      }

      return { statusCode: 200, body: 'Connected' };
    }

    if (routeKey === '$disconnect') {
      await dynamo.send(
        new DeleteItemCommand({
          TableName: TABLE,
          Key: { connectionId: { S: connectionId } },
        }),
      );
      return { statusCode: 200, body: 'Disconnected' };
    }

    if (routeKey === 'message') {
      // Look up sender's jobId
      const senderResult = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'connectionId = :cid',
          ExpressionAttributeValues: { ':cid': { S: connectionId } },
          Limit: 1,
        }),
      );

      const senderItem = senderResult.Items?.[0];
      if (!senderItem?.jobId?.S) {
        return { statusCode: 400, body: 'Unknown connection' };
      }

      const jobId = senderItem.jobId.S;
      const userId = senderItem.userId?.S ?? 'unknown';
      const userName = senderItem.userName?.S ?? 'unknown';
      const body = event.body ?? '';
      await handleYjsUpdate(jobId, connectionId, userId, userName, body, callbackUrl);
      return { statusCode: 200, body: 'OK' };
    }

    return { statusCode: 400, body: `Unknown route: ${routeKey}` };
  } catch (err) {
    console.error('websocket-sync error', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};

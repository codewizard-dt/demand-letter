// packages/api/src/handlers/merge-yjs-snapshot.ts
// Scheduled Lambda: merges pending Y.js updates into the full snapshot for each job.
// Triggered every 5 minutes by an EventBridge schedule.

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, NoSuchKey } from '@aws-sdk/client-s3';
import * as Y from 'yjs';

const s3 = new S3Client({});
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET!;
const PREFIX = 'ydoc-snapshots/';

export const handler = async (): Promise<void> => {
  // List all jobId prefixes under ydoc-snapshots/
  const listResult = await s3.send(
    new ListObjectsV2Command({
      Bucket: DOCUMENTS_BUCKET,
      Prefix: PREFIX,
      Delimiter: '/',
    }),
  );

  const jobPrefixes = listResult.CommonPrefixes?.map((p) => p.Prefix!).filter(Boolean) ?? [];

  for (const jobPrefix of jobPrefixes) {
    // jobPrefix = "ydoc-snapshots/{jobId}/"
    const jobId = jobPrefix.slice(PREFIX.length, -1); // strip prefix and trailing slash

    await mergeJobSnapshot(jobId);
  }
};

async function mergeJobSnapshot(jobId: string): Promise<void> {
  const fullKey = `${PREFIX}${jobId}/full.bin`;
  const pendingKey = `${PREFIX}${jobId}/pending.bin`;

  // Load full snapshot (may not exist yet)
  let fullBytes: Uint8Array | null = null;
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: fullKey }));
    fullBytes = await result.Body!.transformToByteArray();
  } catch (err) {
    if (!(err instanceof NoSuchKey)) throw err;
  }

  // Load pending updates (may not exist)
  let pendingBytes: Uint8Array | null = null;
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: pendingKey }));
    pendingBytes = await result.Body!.transformToByteArray();
  } catch (err) {
    if (!(err instanceof NoSuchKey)) throw err;
  }

  // Nothing to do if no pending updates
  if (!pendingBytes) {
    return;
  }

  // Merge into a fresh Y.Doc
  const doc = new Y.Doc();
  if (fullBytes) {
    Y.applyUpdate(doc, fullBytes);
  }
  Y.applyUpdate(doc, pendingBytes);

  // Write merged state as new full snapshot
  const mergedBytes = Y.encodeStateAsUpdate(doc);
  await s3.send(
    new PutObjectCommand({
      Bucket: DOCUMENTS_BUCKET,
      Key: fullKey,
      Body: mergedBytes,
      ContentType: 'application/octet-stream',
    }),
  );

  // Delete pending updates
  await s3.send(new DeleteObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: pendingKey }));

  console.log(`MergeYjsSnapshot: merged snapshot for job ${jobId}`);
}

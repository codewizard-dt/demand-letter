import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

export const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' })
export const BUCKET = process.env.DOCUMENTS_BUCKET!

/** Returns true if the S3 key exists in the test bucket. */
export async function s3KeyExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

/** Upload arbitrary bytes to S3 and return the key. */
export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  )
}

/** Delete a list of S3 keys, silently ignoring errors. */
export async function deleteS3Keys(keys: string[]): Promise<void> {
  if (!keys.length) return
  if (keys.length === 1) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: keys[0] })).catch(() => {})
    return
  }
  await s3
    .send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    )
    .catch(() => {})
}

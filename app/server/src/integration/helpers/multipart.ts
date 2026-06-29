const CRLF = '\r\n'
const BOUNDARY = '----WebKitFormBoundaryIntegrationTest'

interface FileEntry {
  filename: string
  content: Buffer
  contentType: string
}

/**
 * Build an API Gateway proxy event that lambda-multipart-parser can parse.
 * Binary files are base64-encoded in the body; the boundary is fixed for
 * determinism.
 */
export function makeMultipartEvent(jobId: string, files: FileEntry[]) {
  const parts: Buffer[] = []

  for (const file of files) {
    const header =
      `--${BOUNDARY}${CRLF}` +
      `Content-Disposition: form-data; name="files"; filename="${file.filename}"${CRLF}` +
      `Content-Type: ${file.contentType}${CRLF}` +
      CRLF
    parts.push(Buffer.from(header))
    parts.push(file.content)
    parts.push(Buffer.from(CRLF))
  }

  parts.push(Buffer.from(`--${BOUNDARY}--${CRLF}`))

  const body = Buffer.concat(parts)

  return {
    pathParameters: { id: jobId },
    headers: {
      'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
    },
    body: body.toString('base64'),
    isBase64Encoded: true,
  } as any
}

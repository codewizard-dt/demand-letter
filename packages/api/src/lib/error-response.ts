import { APIGatewayProxyResult } from 'aws-lambda';
import { getCorsHeaders } from './cors';

export function errorResponse(
  origin: string | undefined,
  statusCode: number,
  code: string,
  err: unknown,
): APIGatewayProxyResult {
  const error = err instanceof Error ? err : new Error(String(err));
  const isProd = process.env.NODE_ENV === 'production';
  return {
    statusCode,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: code,
      message: isProd ? 'An unexpected error occurred.' : error.message,
      ...(isProd ? {} : { stack: error.stack }),
    }),
  };
}

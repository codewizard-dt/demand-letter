import type { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { corsHeadersFor, getCorsHeaders } from './cors';

export function errorResponse(
  origin: string | APIGatewayProxyEvent | APIGatewayProxyEventV2 | undefined,
  statusCode: number,
  code: string,
  err: unknown,
): APIGatewayProxyResult {
  const error = err instanceof Error ? err : new Error(String(err));
  const env = (process.env.NODE_ENV ?? '').toLowerCase();
  const isProd = env === 'prod' || env === 'production';
  const corsHeaders = typeof origin === 'string' ? getCorsHeaders(origin) : corsHeadersFor(origin);
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: code,
      message: isProd ? 'An unexpected error occurred.' : error.message,
      ...(isProd ? {} : { stack: error.stack }),
    }),
  };
}

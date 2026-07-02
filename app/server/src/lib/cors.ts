import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

const ENV = (process.env.NODE_ENV ?? '').toLowerCase();
const IS_DEV = ENV === '' || ENV === 'dev' || ENV === 'development' || ENV === 'test';

const ALLOWED_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Authorization,X-Requested-With,X-Caller-Role';
const EXPOSED_HEADERS = 'Content-Disposition,Content-Type';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

type HeaderValue = string | string[] | undefined;
type HeadersLike = Record<string, HeaderValue> | null | undefined;

type CorsEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export function getRequestOrigin(eventOrHeaders?: CorsEvent | HeadersLike): string | undefined {
  const headers = eventOrHeaders && 'headers' in eventOrHeaders
    ? eventOrHeaders.headers
    : eventOrHeaders;
  if (!headers) return undefined;

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'origin') return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  if (IS_DEV) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      'Access-Control-Expose-Headers': EXPOSED_HEADERS,
      'Access-Control-Max-Age': '86400',
    };
  }
  const allowAll = ALLOWED_ORIGINS.includes('*');
  const origin = allowAll
    ? '*'
    : requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0] ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Expose-Headers': EXPOSED_HEADERS,
    'Access-Control-Max-Age': '86400',
    ...(allowAll ? {} : { Vary: 'Origin' }),
  };
}

export function corsHeadersFor(eventOrHeaders?: CorsEvent | HeadersLike): Record<string, string> {
  return getCorsHeaders(getRequestOrigin(eventOrHeaders));
}

// Static fallback for handlers that don't have a request origin (SNS triggers, etc.)
export const corsHeaders = getCorsHeaders();

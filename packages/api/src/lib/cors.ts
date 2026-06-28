const IS_DEV = process.env.NODE_ENV !== 'production';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((s) => s.trim());

export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  if (IS_DEV) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };
  }
  const allowAll = ALLOWED_ORIGINS.includes('*');
  const origin = allowAll
    ? '*'
    : requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Caller-Role',
    ...(allowAll ? {} : { Vary: 'Origin' }),
  };
}

// Static fallback for handlers that don't have a request origin (SNS triggers, etc.)
export const corsHeaders = getCorsHeaders();

import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadCors(env: Record<string, string | undefined>) {
  vi.resetModules();
  const previous = { ...process.env };
  process.env = { ...previous, ...env };
  const mod = await import('./cors');
  process.env = previous;
  return mod;
}

describe('cors helpers', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('reflects an allowed production origin from case-insensitive request headers', async () => {
    const { corsHeadersFor } = await loadCors({
      NODE_ENV: 'prod',
      CORS_ORIGINS: 'https://main.d2qz3c6ux2u72z.amplifyapp.com,http://localhost:5173',
    });

    const headers = corsHeadersFor({
      headers: {
        Origin: 'https://main.d2qz3c6ux2u72z.amplifyapp.com',
      },
    } as never);

    expect(headers['Access-Control-Allow-Origin']).toBe('https://main.d2qz3c6ux2u72z.amplifyapp.com');
    expect(headers.Vary).toBe('Origin');
  });

  it('falls back to the configured primary origin when the request origin is not allowed', async () => {
    const { corsHeadersFor } = await loadCors({
      NODE_ENV: 'prod',
      CORS_ORIGINS: 'https://main.d2qz3c6ux2u72z.amplifyapp.com,http://localhost:5173',
    });

    const headers = corsHeadersFor({
      headers: {
        origin: 'https://example.invalid',
      },
    } as never);

    expect(headers['Access-Control-Allow-Origin']).toBe('https://main.d2qz3c6ux2u72z.amplifyapp.com');
  });

  it('uses wildcard CORS only for development-like environments', async () => {
    const { corsHeadersFor } = await loadCors({
      NODE_ENV: 'dev',
      CORS_ORIGINS: 'https://main.d2qz3c6ux2u72z.amplifyapp.com',
    });

    const headers = corsHeadersFor();

    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect(headers['Access-Control-Allow-Methods']).toBe('GET,POST,PATCH,DELETE,OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });
});

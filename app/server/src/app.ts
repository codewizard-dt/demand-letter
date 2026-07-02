import express from 'express';
import { restRouter } from './routes/rest';
import { corsHeadersFor } from './lib/cors';

export function createApp(): express.Express {
  const app = express();

  app.use((req, res, next) => {
    const headers = corsHeadersFor(req.headers as Record<string, string | undefined>);
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.use(restRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled Express error', err);
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err instanceof Error
        ? err.message
        : String(err);
    res.status(500).json({ error: 'internal_server_error', message });
  });

  return app;
}

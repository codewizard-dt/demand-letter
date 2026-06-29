import express from 'express';
import cors from 'cors';
import { restRouter } from './routes/rest';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
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

import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export function json(res: Response, status: number, body: unknown): void {
  res.status(status).type('application/json').send(JSON.stringify(body));
}

export function errorJson(res: Response, status: number, error: string, message: string): void {
  json(res, status, { error, message });
}

export function internalError(res: Response, err: unknown): void {
  const error = err instanceof Error ? err : new Error(String(err));
  const isProd = process.env.NODE_ENV === 'production';
  json(res, 500, {
    error: 'internal_server_error',
    message: isProd ? 'An unexpected error occurred.' : error.message,
    ...(isProd ? {} : { stack: error.stack }),
  });
}

export function sendDocx(res: Response, buffer: Buffer, filename = 'demand-letter.docx'): void {
  res.status(200);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export function sendSse(res: Response, chunks: string[], completeData = ''): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
  }
  res.write(`event: complete\ndata: ${completeData}\n\n`);
  res.end();
}

export function writeSseData(res: Response, data: unknown, event?: string): void {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

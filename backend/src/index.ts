import express from 'express';

import { AppError } from './errors';
import type { ApiErrorBody } from './types';
import { vaultRouter } from './routes/vault';
import { notesRouter } from './routes/notes';
import { searchRouter } from './routes/search';
import { systemRouter } from './routes/system';
import { aiRouter } from './routes/ai';
import { VaultSession } from './services/vaultSession';

export interface CreateServerOptions {
  session?: VaultSession;
}

export function createApp(options: CreateServerOptions = {}) {
  const session = options.session ?? new VaultSession();
  const app = express();

  app.set('x-powered-by', false);
  app.use(express.json({ limit: '10mb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'slothmind-backend',
      version: '0.1.0',
      vault: session.summary(),
    });
  });

  app.use('/api/system', systemRouter(session));
  app.use('/api/vault', vaultRouter(session));
  app.use('/api/notes', notesRouter(session));
  app.use('/api/search', searchRouter(session));
  app.use('/api/ai', aiRouter(session));

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void _next;
    if (err instanceof AppError) {
      const body: ApiErrorBody = {
        error: { code: err.code, message: err.message, details: err.details },
      };
      res.status(err.statusCode).json(body);
      return;
    }

    console.error('Unhandled error:', err);
    const body: ApiErrorBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    };
    res.status(500).json(body);
  });

  return app;
}

export function startServer() {
  const app = createApp();
  const port = Number(process.env.PORT) || 43117;
  const host = process.env.HOST || '127.0.0.1';
  const server = app.listen(port, host, () => {
    console.log(`SlothMind backend listening on http://${host}:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

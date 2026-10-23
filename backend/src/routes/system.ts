import { Router } from 'express';

import { asyncHandler } from '../routes/http';
import { VaultSession } from '../services/vaultSession';
import { listDirectories, systemHome } from '../services/system';

export function systemRouter(session: VaultSession): Router {
  const router = Router();

  router.get('/home', (_req, res) => {
    res.json(systemHome());
  });

  router.get('/directories', asyncHandler(async (req, res) => {
    const path = typeof req.query.path === 'string' ? req.query.path : undefined;
    const listing = await listDirectories(path);
    res.json(listing);
  }));

  router.get('/session', (_req, res) => {
    res.json(session.summary());
  });

  return router;
}

import { Router } from 'express';

import { asyncHandler, bodyOf, requireString } from '../routes/http';
import { VaultSession } from '../services/vaultSession';

export function vaultRouter(session: VaultSession): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(session.summary());
  });

  router.post('/open', asyncHandler(async (req, res) => {
    const body = bodyOf(req);
    const path = requireString(body.path, 'path');
    const result = await session.open(path);
    res.json(result);
  }));

  router.post('/create', asyncHandler(async (req, res) => {
    const body = bodyOf(req);
    const parent = requireString(body.parent, 'parent');
    const name = requireString(body.name, 'name');
    const result = await session.createVault(parent, name);
    res.json(result);
  }));

  router.post('/close', (_req, res) => {
    session.close();
    res.json({ closed: true });
  });

  router.post('/refresh', asyncHandler(async (_req, res) => {
    const { index } = session.requireVault();
    const result = await index.refresh();
    res.json(result);
  }));

  return router;
}

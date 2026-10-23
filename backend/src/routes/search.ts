import { Router } from 'express';

import { asyncHandler } from '../routes/http';
import { VaultSession } from '../services/vaultSession';

export function searchRouter(session: VaultSession): Router {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const { index } = session.requireVault();
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
    const results = await index.search(q, Number.isFinite(limit) ? limit : 20);
    res.json(results);
  }));

  router.post('/reindex', asyncHandler(async (_req, res) => {
    const { index } = session.requireVault();
    const result = await index.rebuild();
    res.json(result);
  }));

  return router;
}

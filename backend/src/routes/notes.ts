import { Router } from 'express';

import { asyncHandler, bodyOf, requireString } from '../routes/http';
import { VaultSession } from '../services/vaultSession';

export function notesRouter(session: VaultSession): Router {
  const router = Router();

  router.get('/tree', asyncHandler(async (_req, res) => {
    const { vault } = session.requireVault();
    const tree = await vault.listTree();
    res.json({ tree });
  }));

  router.get('/', asyncHandler(async (req, res) => {
    const { vault } = session.requireVault();
    const notePath = typeof req.query.path === 'string' ? req.query.path : '';
    const note = await vault.readNote(notePath);
    res.json(note);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { vault, index } = session.requireVault();
    const body = bodyOf(req);
    const folder = typeof body.folder === 'string' ? body.folder : '';
    const name = typeof body.name === 'string' ? body.name : undefined;
    const note = await vault.createNote(folder, name);
    index.invalidate([note.path]);
    await index.refresh().catch(() => undefined);
    res.status(201).json(note);
  }));

  router.post('/create-folder', asyncHandler(async (req, res) => {
    const { vault } = session.requireVault();
    const body = bodyOf(req);
    const parent = typeof body.parent === 'string' ? body.parent : '';
    const name = requireString(body.name, 'name');
    const result = await vault.createFolder(parent, name);
    res.status(201).json(result);
  }));

  router.put('/', asyncHandler(async (req, res) => {
    const { vault, index } = session.requireVault();
    const body = bodyOf(req);
    const path = requireString(body.path, 'path');
    const content = requireString(body.content, 'content');
    const note = await vault.writeNote(path, content);
    index.invalidate([note.path]);
    await index.refresh().catch(() => undefined);
    res.json(note);
  }));

  router.post('/rename', asyncHandler(async (req, res) => {
    const { vault, index } = session.requireVault();
    const body = bodyOf(req);
    const from = requireString(body.from, 'from');
    const to = requireString(body.to, 'to');
    const result = await vault.renameEntry(from, to);
    index.invalidate([from, to]);
    await index.refresh().catch(() => undefined);
    res.json(result);
  }));

  router.delete('/', asyncHandler(async (req, res) => {
    const { vault, index } = session.requireVault();
    const body = bodyOf(req);
    const notePath = requireString(body.path, 'path');
    const result = await vault.deleteEntry(notePath);
    index.invalidate([notePath]);
    await index.refresh().catch(() => undefined);
    res.json(result);
  }));

  return router;
}

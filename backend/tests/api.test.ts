import { describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createApp } from '../src/index';
import { VaultSession } from '../src/services/vaultSession';

async function makeTempVault(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'slothmind-api-'));
  const cleanup = async () => {
    await fs.promises.rm(dir, { recursive: true, force: true });
  };
  return { dir, cleanup };
}

describe('API routes', () => {
  it('blocks traversal via API and exposes safe vault operations', async () => {
    const { dir, cleanup } = await makeTempVault();
    try {
      const session = new VaultSession();
      const app = createApp({ session });
      await session.open(dir);

      const tree = await request(app).get('/api/notes/tree');
      expect(tree.status).toBe(200);

      const badRead = await request(app).get('/api/notes').query({ path: '../../etc/hosts' });
      expect(badRead.status).toBe(400);
      expect(badRead.body.error.code).toBe('PATH_TRAVERSAL');

      const created = await request(app).post('/api/notes').send({ folder: '', name: 'Hello' });
      expect(created.status).toBe(201);
      expect(created.body.path).toBe('Hello.md');

      const saved = await request(app).put('/api/notes').send({ path: 'Hello.md', content: '# Hello\n\nTest' });
      expect(saved.status).toBe(200);

      const search = await request(app).get('/api/search').query({ q: 'Hello' });
      expect(search.status).toBe(200);
      expect(search.body.results.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });
});

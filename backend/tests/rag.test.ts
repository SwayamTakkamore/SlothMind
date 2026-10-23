import { describe, expect, it } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createApp } from '../src/index';
import { VaultSession } from '../src/services/vaultSession';
import { chunkMarkdown } from '../src/services/chunker';
import { RetrievalService } from '../src/services/retrieval';

async function makeTempVault(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'slothmind-rag-'));
  const cleanup = async () => {
    await fs.promises.rm(dir, { recursive: true, force: true });
  };
  return { dir, cleanup };
}

describe('RAG functionality', () => {
  it('chunks markdown with section awareness', () => {
    const content = `# Main Title

This is the introduction.

## Section One

Some content here with important information about debugging.

## Section Two

More content about testing and validation.`;
    
    const chunks = chunkMarkdown('test.md', content);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].title).toBe('Main Title');
    expect(chunks.some(c => c.section === 'Section One')).toBe(true);
  });

  it('retrieves relevant chunks for queries', async () => {
    const { dir, cleanup } = await makeTempVault();
    try {
      // Create test notes
      await fs.promises.writeFile(
        path.join(dir, 'debug.md'),
        '# Debugging Guide\n\nTo fix authentication errors, check the token expiration.\n\n## Common Issues\n\nNetwork timeout can cause auth failures.'
      );
      
      const session = new VaultSession();
      await session.open(dir);
      const { vault, index } = session.requireVault();
      
      const retrieval = new RetrievalService(vault, index);
      const result = await retrieval.retrieve('authentication token error', 3);
      
      expect(result.passages.length).toBeGreaterThan(0);
      expect(result.passages[0].path).toBe('debug.md');
    } finally {
      await cleanup();
    }
  });

  it('ask endpoint validates input', async () => {
    const app = createApp();
    const res = await request(app).post('/api/ai/ask').send({});
    expect([400, 409, 503]).toContain(res.status);
  });

  it('get chunks endpoint requires vault', async () => {
    const app = createApp();
    const res = await request(app).get('/api/ai/chunks');
    expect([409, 503]).toContain(res.status);
  });
});

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { FsVault } from '../src/services/fsVault';
import { SearchIndex } from '../src/services/indexer';

async function makeTempVault(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'slothmind-test-'));
  const cleanup = async () => {
    await fs.promises.rm(dir, { recursive: true, force: true });
  };
  return { dir, cleanup };
}

describe('FsVault safety and operations', () => {
  it('rejects path traversal outside the vault', async () => {
    const { dir, cleanup } = await makeTempVault();
    try {
      const vault = await FsVault.open(dir);
      await expect(vault.readNote('../../etc/passwd')).rejects.toMatchObject({ code: 'PATH_TRAVERSAL' });
      await expect(vault.writeNote('../outside.md', '# hi')).rejects.toMatchObject({ code: 'PATH_TRAVERSAL' });
    } finally {
      await cleanup();
    }
  });

  it('writes notes atomically and prevents silent overwrite on rename', async () => {
    const { dir, cleanup } = await makeTempVault();
    try {
      const vault = await FsVault.open(dir);
      const note = await vault.writeNote('notes/hello.md', '# Hello\n\nWorld');
      expect(note.path).toBe('notes/hello.md');
      expect(await fs.promises.readFile(path.join(dir, 'notes/hello.md'), 'utf8')).toBe('# Hello\n\nWorld');

      await vault.writeNote('notes/other.md', '# Other');
      await expect(vault.renameEntry('notes/hello.md', 'notes/other.md')).rejects.toMatchObject({
        code: 'ALREADY_EXISTS',
      });

      const trashed = await vault.deleteEntry('notes/hello.md');
      expect(trashed.path).toBe('notes/hello.md');
      expect(trashed.trashedTo.startsWith('.trash/')).toBe(true);
      expect(await fs.promises.stat(path.join(dir, trashed.trashedTo))).toBeDefined();
    } finally {
      await cleanup();
    }
  });

  it('creates notes in unique files and lists the vault tree', async () => {
    const { dir, cleanup } = await makeTempVault();
    try {
      const vault = await FsVault.open(dir);
      await vault.createFolder('', 'Projects');
      const first = await vault.createNote('Projects', 'Demo');
      const second = await vault.createNote('Projects', 'Demo');
      expect(first.path).toBe('Projects/Demo.md');
      expect(second.path).toBe('Projects/Demo 1.md');

      const tree = await vault.listTree();
      expect(tree.length).toBe(1);
      expect(tree[0].type).toBe('folder');
      expect(tree[0].children?.length).toBe(2);
    } finally {
      await cleanup();
    }
  });
});

describe('SearchIndex', () => {
  it('searches titles and content with excerpts and real file paths', async () => {
    const { dir, cleanup } = await makeTempVault();
    try {
      const vault = await FsVault.open(dir);
      await vault.writeNote('Debugging.md', '# Debugging\n\nWe fixed the crash by clearing the cache.\n');
      await vault.writeNote('Plans.md', '# Plans\n\nNothing to see here.\n');

      const index = new SearchIndex(vault);
      await index.refresh();
      const results = await index.search('cache');
      expect(results.indexedNotes).toBe(2);
      expect(results.results.length).toBe(1);
      expect(results.results[0].path).toBe('Debugging.md');
      expect(results.results[0].excerpt.toLowerCase()).toContain('cache');
    } finally {
      await cleanup();
    }
  });
});

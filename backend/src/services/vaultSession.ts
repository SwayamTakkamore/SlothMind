import path from 'node:path';
import { promises as fs } from 'node:fs';

import { badRequest, conflict, toAppError } from '../errors';
import type { VaultInfo, VaultSummary } from '../types';
import { FsVault, validateEntryName } from './fsVault';
import { SearchIndex } from './indexer';

export interface OpenVaultResult {
  vault: VaultInfo;
  indexedNotes: number;
}

/**
 * Holds the single active vault for this local server process. The vault root
 * is deliberately kept server-side: the client only ever sends relative paths,
 * so a compromised renderer cannot point the server at an arbitrary folder.
 */
export class VaultSession {
  private vault: FsVault | null = null;
  private index: SearchIndex | null = null;

  get current(): FsVault | null {
    return this.vault;
  }

  get searchIndex(): SearchIndex | null {
    return this.index;
  }

  requireVault(): { vault: FsVault; index: SearchIndex } {
    if (!this.vault || !this.index) {
      throw conflict('NO_VAULT', 'Open or create a vault before working with notes.');
    }
    return { vault: this.vault, index: this.index };
  }

  summary(): VaultSummary {
    return {
      vault: this.vault ? this.vault.info : null,
      indexedNotes: this.index ? this.index.indexedNotes : 0,
    };
  }

  async open(rootPath: string): Promise<OpenVaultResult> {
    const vault = await FsVault.open(rootPath);
    const index = new SearchIndex(vault);
    await index.refresh();
    this.vault = vault;
    this.index = index;
    return { vault: vault.info, indexedNotes: index.indexedNotes };
  }

  async createVault(parentPath: string, rawName: string): Promise<OpenVaultResult> {
    const name = rawName.trim();
    const nameError = validateEntryName(name);
    if (nameError) throw badRequest('INVALID_NAME', nameError);
    if (typeof parentPath !== 'string' || parentPath.trim() === '') {
      throw badRequest('INVALID_PARENT', 'Choose a parent folder for the new vault.');
    }
    const parent = path.resolve(parentPath);
    let stat;
    try {
      stat = await fs.stat(parent);
    } catch (error) {
      throw toAppError(error);
    }
    if (!stat.isDirectory()) {
      throw badRequest('NOT_A_DIRECTORY', 'The parent location must be a folder.');
    }
    const target = path.join(parent, name);
    try {
      await fs.mkdir(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw conflict('ALREADY_EXISTS', 'A folder with that name already exists there.');
      }
      throw toAppError(error);
    }
    return this.open(target);
  }

  close(): void {
    this.vault = null;
    this.index = null;
  }

  invalidate(paths: string[]): void {
    if (!this.index) return;
    for (const relativePath of paths) this.index.invalidate(relativePath);
  }
}

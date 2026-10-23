import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { badRequest, toAppError } from '../errors';
import type { DirectoryListing } from '../types';

const MAX_DIRECTORY_ENTRIES = 500;

export interface SystemHome {
  home: string;
  platform: NodeJS.Platform;
  separator: string;
}

export function systemHome(): SystemHome {
  return { home: os.homedir(), platform: process.platform, separator: path.sep };
}

/**
 * Metadata-only directory browser used by the vault picker. It lists folder
 * names so a user can choose a vault location; it never exposes file contents.
 */
export async function listDirectories(requestedPath?: string): Promise<DirectoryListing> {
  const target =
    typeof requestedPath === 'string' && requestedPath.trim() !== ''
      ? path.resolve(requestedPath)
      : os.homedir();

  let stat;
  try {
    stat = await fs.stat(target);
  } catch (error) {
    throw toAppError(error);
  }
  if (!stat.isDirectory()) {
    throw badRequest('NOT_A_DIRECTORY', 'That location is not a folder.');
  }

  const canonical = await fs.realpath(target);
  let entries;
  try {
    entries = await fs.readdir(canonical, { withFileTypes: true });
  } catch (error) {
    throw toAppError(error);
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && !entry.name.startsWith('.'))
    .map((entry) => ({ name: entry.name, path: path.join(canonical, entry.name) }))
    .sort((a, b) => collator.compare(a.name, b.name))
    .slice(0, MAX_DIRECTORY_ENTRIES);

  const parentCandidate = path.dirname(canonical);
  return {
    path: canonical,
    parent: parentCandidate === canonical ? null : parentCandidate,
    directories,
  };
}

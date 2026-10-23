import { createHash, randomBytes } from 'node:crypto';
import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';

import { AppError, badRequest, conflict, forbidden, toAppError } from '../errors';
import type { NoteContent, VaultInfo, VaultNode } from '../types';

export const MARKDOWN_EXTENSION = '.md';
export const TRASH_DIRECTORY = '.trash';
const MAX_NOTE_BYTES = 8 * 1024 * 1024;
const MAX_PATH_LENGTH = 1024;
const MAX_TREE_DEPTH = 24;
const IGNORED_DIRECTORY_NAMES = new Set(['.git', 'node_modules', '.superpowers', TRASH_DIRECTORY]);
// eslint-disable-next-line no-control-regex
const FORBIDDEN_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/;
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

export interface WalkedNote {
  path: string;
  size: number;
  mtimeMs: number;
  modifiedAt: string;
}

export interface NoteStat {
  path: string;
  size: number;
  mtimeMs: number;
  modifiedAt: string;
}

/**
 * Validate a single file/folder name typed by a user.
 * Returns an error message, or null when valid.
 */
export function validateEntryName(name: string): string | null {
  if (name.length === 0) return 'Name cannot be empty.';
  if (name !== name.trim()) return 'Name cannot start or end with spaces.';
  if (name.length > 120) return 'Name must be 120 characters or fewer.';
  if (name === '.' || name === '..') return 'That name is reserved.';
  if (name.startsWith('.')) return 'Names cannot start with a dot.';
  if (FORBIDDEN_NAME_CHARS.test(name)) return 'Name cannot contain / \\ : * ? " < > |.';
  if (RESERVED_WINDOWS_NAMES.test(name)) return 'That name is reserved by the filesystem.';
  return null;
}

export function ensureMarkdownExtension(name: string): string {
  return name.toLowerCase().endsWith(MARKDOWN_EXTENSION) ? name : `${name}${MARKDOWN_EXTENSION}`;
}

export function slugToTitle(fileName: string): string {
  const base = fileName.toLowerCase().endsWith(MARKDOWN_EXTENSION)
    ? fileName.slice(0, -MARKDOWN_EXTENSION.length)
    : fileName;
  return base;
}

/** Convert a relative path into a safe path with no traversal segments. */
export function normalizeRelativePath(input: unknown, options: { allowRoot?: boolean } = {}): string {
  if (typeof input !== 'string') {
    throw badRequest('INVALID_PATH', 'A valid path is required.');
  }
  if (input.length > MAX_PATH_LENGTH) {
    throw badRequest('PATH_TOO_LONG', 'The path is too long.');
  }
  if (input.includes('\u0000')) {
    throw badRequest('INVALID_PATH', 'Paths cannot contain null bytes.');
  }
  if (input.includes('\\')) {
    throw badRequest('INVALID_PATH', 'Paths must use forward slashes.');
  }
  if (input === '') {
    if (options.allowRoot) return '';
    throw badRequest('INVALID_PATH', 'A path is required.');
  }
  if (path.isAbsolute(input) || path.win32.isAbsolute(input) || /^[a-zA-Z]:/.test(input)) {
    throw badRequest('ABSOLUTE_PATH', 'Absolute paths are not allowed inside a vault.');
  }

  const segments = input.split('/');
  for (const segment of segments) {
    if (segment === '') {
      throw badRequest('INVALID_PATH', 'A path cannot contain empty segments.');
    }
    if (segment === '.' || segment === '..') {
      throw badRequest('PATH_TRAVERSAL', 'Path traversal is not allowed.');
    }
    if (segment.startsWith('.')) {
      throw badRequest('HIDDEN_PATH', 'Hidden files and folders are not accessible.');
    }
    if (FORBIDDEN_NAME_CHARS.test(segment)) {
      throw badRequest('INVALID_PATH', 'The path contains unsupported characters.');
    }
  }
  return segments.join('/');
}

export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Filesystem operations restricted to a single vault root.
 *
 * Every public method:
 *  1. normalizes relative paths and rejects traversal/absolute/hidden input,
 *  2. resolves the nearest existing ancestor link-free and verifies it is
 *     still inside the canonical vault root (symlink-escape protection),
 *  3. maps raw Node errors to typed API errors.
 */
export class FsVault {
  readonly root: string;
  readonly name: string;
  private readonly openedAt: string;

  private constructor(root: string) {
    this.root = root;
    this.name = path.basename(root) || root;
    this.openedAt = new Date().toISOString();
  }

  static async open(rootPath: string): Promise<FsVault> {
    if (typeof rootPath !== 'string' || rootPath.trim() === '') {
      throw badRequest('INVALID_VAULT_PATH', 'Choose a folder to open as a vault.');
    }
    const resolved = path.resolve(rootPath);
    let stat;
    try {
      stat = await fs.stat(resolved);
    } catch (error) {
      throw toAppError(error);
    }
    if (!stat.isDirectory()) {
      throw badRequest('NOT_A_DIRECTORY', 'A vault must be a folder.');
    }
    const canonical = await fs.realpath(resolved);
    if (path.parse(canonical).root === canonical) {
      throw badRequest(
        'UNSAFE_VAULT',
        'The filesystem root cannot be used as a vault. Choose a dedicated folder.',
      );
    }
    return new FsVault(canonical);
  }

  get info(): VaultInfo {
    return { path: this.root, name: this.name, openedAt: this.openedAt };
  }

  /** Assert an absolute canonical path is contained by the vault root. */
  private assertInsideVault(absolutePath: string): void {
    if (absolutePath === this.root) return;
    if (!absolutePath.startsWith(this.root + path.sep)) {
      throw forbidden('VAULT_BOUNDARY', 'Access outside the active vault is not allowed.');
    }
  }

  /**
   * Resolve any symlinks in the target (or its nearest existing ancestor) and
   * verify the real location stays inside the vault.
   */
  private async assertNoSymlinkEscape(absolutePath: string): Promise<void> {
    let probe = absolutePath;
    for (;;) {
      try {
        const real = await fs.realpath(probe);
        this.assertInsideVault(real);
        return;
      } catch (error) {
        if (error instanceof AppError) throw error;
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT' && code !== 'ENOTDIR') throw toAppError(error);
        const parent = path.dirname(probe);
        if (parent === probe) {
          throw forbidden('VAULT_BOUNDARY', 'Could not verify that the path is inside the vault.');
        }
        probe = parent;
      }
    }
  }

  private async resolve(relativePath: unknown, options: { allowRoot?: boolean } = {}): Promise<{
    absolute: string;
    relative: string;
  }> {
    const relative = normalizeRelativePath(relativePath, options);
    const absolute = relative === '' ? this.root : path.resolve(this.root, relative);
    this.assertInsideVault(absolute);
    await this.assertNoSymlinkEscape(absolute);
    return { absolute, relative };
  }

  private async requireNoteFile(absolute: string): Promise<void> {
    let stat;
    try {
      stat = await fs.stat(absolute);
    } catch (error) {
      throw toAppError(error);
    }
    if (!stat.isFile()) {
      throw badRequest('IS_A_DIRECTORY', 'That path is a folder, not a note.');
    }
    if (stat.size > MAX_NOTE_BYTES) {
      throw new AppError(413, 'NOTE_TOO_LARGE', 'That note is larger than the 8 MB safety limit.');
    }
  }

  async readNote(relativePath: unknown): Promise<NoteContent> {
    const { absolute, relative } = await this.resolve(relativePath);
    if (!relative.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
      throw badRequest('NOT_MARKDOWN', 'Only Markdown (.md) notes can be opened.');
    }
    await this.requireNoteFile(absolute);
    try {
      const [content, stat] = await Promise.all([fs.readFile(absolute, 'utf8'), fs.stat(absolute)]);
      return {
        path: relative,
        content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch (error) {
      throw toAppError(error);
    }
  }

  async noteStat(relativePath: string): Promise<NoteStat> {
    const { absolute, relative } = await this.resolve(relativePath);
    if (!relative.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
      throw badRequest('NOT_MARKDOWN', 'Only Markdown (.md) notes are indexed.');
    }
    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile()) throw badRequest('IS_A_DIRECTORY', 'Expected a Markdown file.');
      return {
        path: relative,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        modifiedAt: stat.mtime.toISOString(),
      };
    } catch (error) {
      throw toAppError(error);
    }
  }

  /**
   * Atomic write: stream to a sibling temp file, fsync it, rename over the
   * target. A crash leaves either the old content or the complete new content.
   */
  async writeNote(relativePath: unknown, content: unknown): Promise<NoteContent> {
    if (typeof content !== 'string') {
      throw badRequest('INVALID_CONTENT', 'Note content must be a string.');
    }
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > MAX_NOTE_BYTES) {
      throw new AppError(413, 'NOTE_TOO_LARGE', 'That note is larger than the 8 MB safety limit.');
    }
    const { absolute, relative } = await this.resolve(relativePath);
    if (!relative.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
      throw badRequest('NOT_MARKDOWN', 'Only Markdown (.md) notes can be saved.');
    }

    const parent = path.dirname(absolute);
    const base = path.basename(absolute);
    try {
      await fs.mkdir(parent, { recursive: true });
      const parentStat = await fs.stat(parent);
      if (!parentStat.isDirectory()) {
        throw badRequest('NOT_A_DIRECTORY', 'The note folder does not exist.');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw toAppError(error);
    }
    try {
      const existing = await fs.stat(absolute);
      if (existing.isDirectory()) {
        throw badRequest('IS_A_DIRECTORY', 'A folder already exists at that note path.');
      }
    } catch (error) {
      if (!(error instanceof AppError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw toAppError(error);
      }
      if (error instanceof AppError) throw error;
    }

    const tempPath = path.join(parent, `.${base}.${randomBytes(6).toString('hex')}.tmp~`);
    let handle: Awaited<ReturnType<typeof fs.open>> | null = null;
    try {
      handle = await fs.open(tempPath, 'wx', 0o644);
      await handle.writeFile(content, 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.rename(tempPath, absolute);
      try {
        const dirHandle = await fs.open(parent, 'r');
        try {
          await dirHandle.sync();
        } finally {
          await dirHandle.close();
        }
      } catch {
        // Directory fsync is not supported on every filesystem; the rename is
        // still atomic. Never fail a completed save because of this.
      }
    } catch (error) {
      if (handle) {
        await handle.close().catch(() => undefined);
      }
      await fs.unlink(tempPath).catch(() => undefined);
      throw toAppError(error);
    }

    const stat = await fs.stat(absolute);
    return {
      path: relative,
      content,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  }

  async createNote(folderPath: unknown, rawName: string | undefined): Promise<NoteContent> {
    const folder = await this.resolve(folderPath ?? '', { allowRoot: true });
    let folderStat;
    try {
      folderStat = await fs.stat(folder.absolute);
    } catch (error) {
      throw toAppError(error);
    }
    if (!folderStat.isDirectory()) {
      throw badRequest('NOT_A_DIRECTORY', 'Notes can only be created inside a folder.');
    }

    const desired = rawName && rawName.trim().length > 0 ? rawName.trim() : 'Untitled';
    const fileName = ensureMarkdownExtension(desired);
    const nameError = validateEntryName(fileName);
    if (nameError) throw badRequest('INVALID_NAME', nameError);

    const title = path.basename(fileName, MARKDOWN_EXTENSION);
    const content = `# ${title}\n\n`;
    const created = await this.createUniqueNote(folder.relative, fileName, content);
    return created;
  }

  private async createUniqueNote(
    folder: string,
    fileName: string,
    content: string,
  ): Promise<NoteContent> {
    const stem = fileName.slice(0, -MARKDOWN_EXTENSION.length);
    for (let counter = 0; counter < 500; counter += 1) {
      const candidateName = counter === 0 ? fileName : `${stem} ${counter}${MARKDOWN_EXTENSION}`;
      const candidate = folder === '' ? candidateName : `${folder}/${candidateName}`;
      const { absolute } = await this.resolve(candidate);
      try {
        const handle = await fs.open(absolute, 'wx', 0o644);
        try {
          await handle.writeFile(content, 'utf8');
          await handle.sync();
        } finally {
          await handle.close();
        }
        const stat = await fs.stat(absolute);
        return {
          path: candidate,
          content,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        };
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EEXIST') continue;
        throw toAppError(error);
      }
    }
    throw conflict('NAME_EXHAUSTED', 'Could not find an available file name.');
  }

  async createFolder(parentPath: unknown, rawName: string): Promise<{ path: string; name: string }> {
    const parent = await this.resolve(parentPath ?? '', { allowRoot: true });
    const name = rawName.trim();
    const nameError = validateEntryName(name);
    if (nameError) throw badRequest('INVALID_NAME', nameError);

    const relative = parent.relative === '' ? name : `${parent.relative}/${name}`;
    const { absolute } = await this.resolve(relative);
    try {
      await fs.mkdir(absolute);
    } catch (error) {
      throw toAppError(error);
    }
    return { path: relative, name };
  }

  async renameEntry(fromPath: unknown, toPath: unknown): Promise<{ path: string }> {
    const source = await this.resolve(fromPath);
    const target = await this.resolve(toPath);
    if (source.absolute === target.absolute) return { path: target.relative };

    let sourceStat;
    try {
      sourceStat = await fs.lstat(source.absolute);
    } catch (error) {
      throw toAppError(error);
    }
    if (sourceStat.isSymbolicLink()) {
      throw badRequest('SYMLINK', 'Symbolic links cannot be renamed from SlothMind.');
    }
    if (sourceStat.isDirectory() && target.relative.startsWith(`${source.relative}/`)) {
      throw badRequest('INVALID_MOVE', 'A folder cannot be moved inside itself.');
    }

    const targetParent = path.dirname(target.absolute);
    let parentStat;
    try {
      parentStat = await fs.stat(targetParent);
    } catch (error) {
      throw toAppError(error);
    }
    if (!parentStat.isDirectory()) {
      throw badRequest('NOT_A_DIRECTORY', 'The destination folder does not exist.');
    }

    try {
      await fs.lstat(target.absolute);
      throw conflict('ALREADY_EXISTS', 'An item with that name already exists at the destination.');
    } catch (error) {
      if (error instanceof AppError) throw error;
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw toAppError(error);
    }

    try {
      await fs.rename(source.absolute, target.absolute);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EXDEV' && sourceStat.isFile()) {
        await fs.copyFile(source.absolute, target.absolute, fsConstants.COPYFILE_EXCL);
        await fs.unlink(source.absolute);
      } else {
        throw toAppError(error);
      }
    }
    return { path: target.relative };
  }

  /** Move a note or folder into the vault's recoverable `.trash` directory. */
  async deleteEntry(relativePath: unknown): Promise<{ path: string; trashedTo: string }> {
    const source = await this.resolve(relativePath);
    const trashRoot = path.join(this.root, TRASH_DIRECTORY);
    const base = path.basename(source.absolute);
    try {
      let stat;
      try {
        stat = await fs.lstat(source.absolute);
      } catch (error) {
        throw toAppError(error);
      }
      if (stat.isSymbolicLink()) {
        throw badRequest('SYMLINK', 'Symbolic links cannot be deleted from SlothMind.');
      }
      await fs.mkdir(trashRoot, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      for (let counter = 0; counter < 100; counter += 1) {
        const suffix = counter === 0 ? '' : `-${counter}`;
        const trashName = `${stamp}-${base}${suffix}`;
        const trashPath = path.join(trashRoot, trashName);
        try {
          await fs.rename(source.absolute, trashPath);
          return {
            path: source.relative,
            trashedTo: `${TRASH_DIRECTORY}/${trashName}`,
          };
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'EEXIST' || code === 'ENOTEMPTY') continue;
          throw toAppError(error);
        }
      }
      throw conflict('TRASH_CONFLICT', 'Could not allocate a name in the trash folder.');
    } catch (error) {
      throw toAppError(error);
    }
  }

  async listTree(): Promise<VaultNode[]> {
    return this.readTreeDirectory(this.root, '', 0);
  }

  private async readTreeDirectory(
    absoluteDir: string,
    relativeDir: string,
    depth: number,
  ): Promise<VaultNode[]> {
    if (depth > MAX_TREE_DEPTH) return [];
    let entries;
    try {
      entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
      if (depth === 0) throw toAppError(error);
      return [];
    }

    const folders: VaultNode[] = [];
    const notes: VaultNode[] = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
        const relative = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`;
        const children = await this.readTreeDirectory(
          path.join(absoluteDir, entry.name),
          relative,
          depth + 1,
        );
        folders.push({ name: entry.name, path: relative, type: 'folder', children });
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
        const relative = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`;
        try {
          const stat = await fs.stat(path.join(absoluteDir, entry.name));
          notes.push({
            name: entry.name,
            path: relative,
            type: 'note',
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        } catch {
          // A file may disappear between readdir and stat; skip it this pass.
        }
      }
    }

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    folders.sort((a, b) => collator.compare(a.name, b.name));
    notes.sort((a, b) => collator.compare(a.name, b.name));
    return [...folders, ...notes];
  }

  async walkNotes(): Promise<WalkedNote[]> {
    const results: WalkedNote[] = [];
    await this.walkDirectory(this.root, '', 0, results);
    return results;
  }

  private async walkDirectory(
    absoluteDir: string,
    relativeDir: string,
    depth: number,
    results: WalkedNote[],
  ): Promise<void> {
    if (depth > MAX_TREE_DEPTH) return;
    let entries;
    try {
      entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const relative = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
        await this.walkDirectory(path.join(absoluteDir, entry.name), relative, depth + 1, results);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(MARKDOWN_EXTENSION)) {
        try {
          const stat = await fs.stat(path.join(absoluteDir, entry.name));
          if (stat.size > MAX_NOTE_BYTES) continue;
          results.push({
            path: relative,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
            modifiedAt: stat.mtime.toISOString(),
          });
        } catch {
          // Ignore files removed mid-scan.
        }
      }
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    const { absolute } = await this.resolve(relativePath);
    try {
      await fs.stat(absolute);
      return true;
    } catch {
      return false;
    }
  }
}

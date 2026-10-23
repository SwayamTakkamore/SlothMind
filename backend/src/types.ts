export interface VaultInfo {
  /** Absolute, canonical path of the vault root. */
  path: string;
  name: string;
  openedAt: string;
}

export interface VaultSummary {
  vault: VaultInfo | null;
  indexedNotes: number;
}

export type VaultNodeType = 'folder' | 'note';

export interface VaultNode {
  name: string;
  /** POSIX-style path relative to the vault root. */
  path: string;
  type: VaultNodeType;
  size?: number;
  modifiedAt?: string;
  children?: VaultNode[];
}

export interface NoteContent {
  path: string;
  content: string;
  size: number;
  modifiedAt: string;
}

export interface NoteWriteResult {
  path: string;
  size: number;
  modifiedAt: string;
}

export interface SearchResult {
  path: string;
  title: string;
  excerpt: string;
  /** Offset of the matched term inside `excerpt` (best effort). */
  matchStart: number;
  matchEnd: number;
  section: string | null;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  indexedNotes: number;
  tookMs: number;
}

export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface DirectoryListing {
  path: string;
  parent: string | null;
  directories: DirectoryEntry[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

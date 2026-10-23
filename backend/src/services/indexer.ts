import path from 'node:path';

import type { SearchResponse, SearchResult } from '../types';
import { MARKDOWN_EXTENSION, contentHash, type FsVault } from './fsVault';

interface IndexedSection {
  heading: string;
  offset: number;
}

interface IndexedNote {
  path: string;
  title: string;
  titleLower: string;
  fileNameLower: string;
  content: string;
  contentLower: string;
  hash: string;
  sections: IndexedSection[];
  size: number;
  mtimeMs: number;
}

interface RefreshResult {
  changed: number;
  removed: number;
  total: number;
}

const EXCERPT_RADIUS_BEFORE = 100;
const EXCERPT_RADIUS_AFTER = 140;
const MAX_TOKENS = 8;

function deriveTitle(relativePath: string, content: string): string {
  const heading = content.match(/^#{1,3}[ \t]+(.+?)[ \t]*$/m);
  if (heading && heading[1] && heading[1].trim().length > 0) {
    return heading[1].trim();
  }
  const base = path.basename(relativePath);
  return base.toLowerCase().endsWith(MARKDOWN_EXTENSION)
    ? base.slice(0, -MARKDOWN_EXTENSION.length)
    : base;
}

function extractSections(content: string): IndexedSection[] {
  const sections: IndexedSection[] = [];
  const pattern = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (match[2]) sections.push({ heading: match[2].trim(), offset: match.index });
  }
  return sections;
}

function sectionForOffset(sections: IndexedSection[], offset: number): string | null {
  let current: string | null = null;
  for (const section of sections) {
    if (section.offset > offset) break;
    current = section.heading;
  }
  return current;
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1 && count < 50) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function tokenize(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  return [...new Set(tokens)].slice(0, MAX_TOKENS);
}

function buildExcerpt(
  note: IndexedNote,
  phrase: string,
  tokens: string[],
): Pick<SearchResult, 'excerpt' | 'matchStart' | 'matchEnd' | 'section'> {
  const term = phrase.length > 0 && note.contentLower.includes(phrase)
    ? phrase
    : tokens.find((token) => note.contentLower.includes(token)) ?? '';

  let matchIndex = term.length > 0 ? note.contentLower.indexOf(term) : -1;
  if (matchIndex < 0) matchIndex = 0;

  const start = Math.max(0, matchIndex - EXCERPT_RADIUS_BEFORE);
  const end = Math.min(note.content.length, matchIndex + EXCERPT_RADIUS_AFTER);
  const raw = note.content.slice(start, end);
  const excerpt = raw.replace(/\s+/g, ' ').trim();
  const excerptLower = excerpt.toLowerCase();
  let matchStart = term.length > 0 ? excerptLower.indexOf(term) : -1;
  if (matchStart < 0) matchStart = 0;
  const matchEnd = term.length > 0 && matchStart >= 0 ? matchStart + term.length : 0;

  return {
    excerpt,
    matchStart,
    matchEnd,
    section: sectionForOffset(note.sections, matchIndex),
  };
}

/**
 * In-memory, disposable full-text index. Markdown files are always the source
 * of truth: the index is rebuilt from disk and never writes to the vault.
 */
export class SearchIndex {
  private readonly entries = new Map<string, IndexedNote>();
  private refreshing: Promise<RefreshResult> | null = null;
  private lastIndexedAt: string | null = null;

  constructor(private readonly vault: FsVault) {}

  get indexedNotes(): number {
    return this.entries.size;
  }

  get indexedAt(): string | null {
    return this.lastIndexedAt;
  }

  invalidate(relativePath?: string | string[]): void {
    if (Array.isArray(relativePath)) {
      for (const p of relativePath) this.entries.delete(p);
      return;
    }
    if (typeof relativePath === 'string') this.entries.delete(relativePath);
    else this.entries.clear();
  }

  async rebuild(): Promise<RefreshResult> {
    this.entries.clear();
    return this.refresh();
  }

  /** Reconcile the index with disk, reading only new or modified notes. */
  async refresh(): Promise<RefreshResult> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<RefreshResult> {
    const files = await this.vault.walkNotes();
    const seen = new Set<string>();
    let changed = 0;
    let removed = 0;

    for (const file of files) {
      seen.add(file.path);
      const cached = this.entries.get(file.path);
      if (cached && cached.size === file.size && cached.mtimeMs === file.mtimeMs) continue;
      try {
        const note = await this.vault.readNote(file.path);
        const content = note.content;
        this.entries.set(file.path, {
          path: file.path,
          title: deriveTitle(file.path, content),
          titleLower: deriveTitle(file.path, content).toLowerCase(),
          fileNameLower: path.basename(file.path).toLowerCase(),
          content,
          contentLower: content.toLowerCase(),
          hash: contentHash(content),
          sections: extractSections(content),
          size: file.size,
          mtimeMs: file.mtimeMs,
        });
        changed += 1;
      } catch {
        // Unreadable or vanished notes are skipped; the next refresh retries.
      }
    }

    for (const key of this.entries.keys()) {
      if (!seen.has(key)) {
        this.entries.delete(key);
        removed += 1;
      }
    }

    this.lastIndexedAt = new Date().toISOString();
    return { changed, removed, total: this.entries.size };
  }

  async search(rawQuery: string, limit = 20): Promise<SearchResponse> {
    const started = Date.now();
    const query = rawQuery.trim();
    const tokens = tokenize(query);
    const phrase = tokens.join(' ');
    await this.refresh();

    if (tokens.length === 0) {
      return {
        query,
        results: [],
        total: 0,
        indexedNotes: this.entries.size,
        tookMs: Date.now() - started,
      };
    }

    const scored: Array<{ note: IndexedNote; score: number }> = [];
    for (const note of this.entries.values()) {
      let score = 0;
      let matchedTokens = 0;

      if (phrase.length > 0 && note.titleLower.includes(phrase)) score += 25;
      if (phrase.length > 0 && note.contentLower.includes(phrase)) {
        score += 12 + Math.min(countOccurrences(note.contentLower, phrase), 5) * 2;
      }

      for (const token of tokens) {
        let tokenScore = 0;
        if (note.titleLower.includes(token)) tokenScore += 8;
        if (note.fileNameLower.includes(token)) tokenScore += 4;
        if (note.sections.some((section) => section.heading.toLowerCase().includes(token))) {
          tokenScore += 5;
        }
        const occurrences = countOccurrences(note.contentLower, token);
        if (occurrences > 0) {
          tokenScore += Math.min(occurrences, 5) * 1.5;
          matchedTokens += 1;
        }
        score += tokenScore;
      }

      if (matchedTokens === tokens.length) score += 6;
      if (score > 0) scored.push({ note, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.note.titleLower !== b.note.titleLower) {
        return a.note.titleLower.localeCompare(b.note.titleLower);
      }
      return a.note.path.localeCompare(b.note.path);
    });

    const results: SearchResult[] = scored.slice(0, limit).map(({ note, score }) => ({
      path: note.path,
      title: note.title,
      score: Math.round(score * 100) / 100,
      ...buildExcerpt(note, phrase, tokens),
    }));

    return {
      query,
      results,
      total: scored.length,
      indexedNotes: this.entries.size,
      tookMs: Date.now() - started,
    };
  }
}

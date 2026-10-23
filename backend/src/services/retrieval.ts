import type { Chunk } from './chunker';
import { chunkMarkdown } from './chunker';
import type { FsVault } from './fsVault';
import type { SearchIndex } from './indexer';

export interface RetrievedPassage {
  id: number;
  chunkId: string;
  path: string;
  title: string;
  section: string | null;
  excerpt: string;
  content: string;
  score: number;
  headingHierarchy: string[];
}

export interface RetrievalResult {
  passages: RetrievedPassage[];
  query: string;
}

const MAX_TOKENS = 8;
const MIN_SCORE_THRESHOLD = 10;

const STOP_WORDS = new Set([
  'the', 'and', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'it', 'its', 'of', 'to', 'for',
  'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over',
  'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
  'what', 'how', 'why', 'where', 'when', 'who', 'which', 'this', 'that', 'these', 'those',
  'can', 'could', 'should', 'would', 'will', 'did', 'do', 'does', 'have', 'has', 'had'
]);

function tokenize(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
  
  const contentWords = words.filter((w) => !STOP_WORDS.has(w));
  const selected = contentWords.length > 0 ? contentWords : words;
  return [...new Set(selected)].slice(0, MAX_TOKENS);
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

function buildExcerpt(content: string, phrase: string, tokens: string[]): string {
  const contentLower = content.toLowerCase();
  const term = phrase.length > 0 && contentLower.includes(phrase)
    ? phrase
    : tokens.find((token) => contentLower.includes(token)) ?? '';
  
  let matchIndex = term.length > 0 ? contentLower.indexOf(term) : -1;
  if (matchIndex < 0) matchIndex = 0;
  
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(content.length, matchIndex + 120);
  const raw = content.slice(start, end);
  return raw.replace(/\s+/g, ' ').trim();
}

export class RetrievalService {
  private chunksCache = new Map<string, Chunk[]>();
  
  constructor(
    private readonly vault: FsVault,
    private readonly index: SearchIndex,
  ) {}
  
  async refreshIndex(): Promise<void> {
    await this.index.refresh();
    this.chunksCache.clear();
  }
  
  private async loadAllChunks(): Promise<Chunk[]> {
    await this.index.refresh();
    const allChunks: Chunk[] = [];
    
    const files = await this.vault.walkNotes();
    for (const file of files) {
      if (this.chunksCache.has(file.path)) {
        allChunks.push(...(this.chunksCache.get(file.path) || []));
        continue;
      }
      try {
        const note = await this.vault.readNote(file.path);
        const chunks = chunkMarkdown(file.path, note.content);
        allChunks.push(...chunks);
        this.chunksCache.set(file.path, chunks);
      } catch {
        // Skip unreadable files
      }
    }
    return allChunks;
  }
  
  async retrieve(query: string, topK = 4): Promise<RetrievalResult> {
    const tokens = tokenize(query);
    const phrase = tokens.join(' ');
    
    if (tokens.length === 0) {
      return { passages: [], query };
    }
    
    const allChunks = await this.loadAllChunks();
    const scored: Array<{ chunk: Chunk; score: number }> = [];
    
    for (const chunk of allChunks) {
      let score = 0;
      const chunkLower = chunk.content.toLowerCase();
      const titleLower = chunk.title.toLowerCase();
      const sectionLower = (chunk.section || '').toLowerCase();
      
      if (phrase.length > 0 && tokens.length > 1) {
        if (titleLower.includes(phrase)) score += 30;
        if (sectionLower.includes(phrase)) score += 25;
        if (chunkLower.includes(phrase)) {
          score += 15 + Math.min(countOccurrences(chunkLower, phrase), 3) * 3;
        }
      }
      
      for (const token of tokens) {
        let tokenScore = 0;
        if (titleLower.includes(token)) tokenScore += 12;
        if (sectionLower.includes(token)) tokenScore += 10;
        if (chunkLower.includes(token)) {
          const occurrences = countOccurrences(chunkLower, token);
          tokenScore += Math.min(occurrences, 4) * 2;
        }
        score += tokenScore;
      }
      
      // Boost if all tokens match
      const allMatch = tokens.every(t => 
        chunkLower.includes(t) || titleLower.includes(t) || sectionLower.includes(t)
      );
      if (allMatch && tokens.length > 1) score += 8;
      
      if (score >= MIN_SCORE_THRESHOLD) {
        scored.push({ chunk, score });
      }
    }
    
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunk.path.localeCompare(b.chunk.path);
    });
    
    const topChunks = scored.slice(0, topK);
    const passages: RetrievedPassage[] = topChunks.map((item, idx) => ({
      id: idx + 1,
      chunkId: item.chunk.id,
      path: item.chunk.path,
      title: item.chunk.title,
      section: item.chunk.section,
      excerpt: buildExcerpt(item.chunk.content, phrase, tokens),
      content: item.chunk.content,
      score: Math.round(item.score * 100) / 100,
      headingHierarchy: item.chunk.headingHierarchy,
    }));
    
    return { passages, query };
  }
  
  async getChunksForDebug(): Promise<Chunk[]> {
    return this.loadAllChunks();
  }
}

import path from 'node:path';

import { MARKDOWN_EXTENSION } from './fsVault';

export interface Chunk {
  id: string;
  path: string;
  title: string;
  section: string | null;
  content: string;
  startOffset: number;
  endOffset: number;
  headingHierarchy: string[];
}

export interface ChunkingOptions {
  targetWords?: number;
  maxWords?: number;
}

const DEFAULT_TARGET_WORDS = 200;
const DEFAULT_MAX_WORDS = 400;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

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

export function chunkMarkdown(
  relativePath: string,
  content: string,
  options: ChunkingOptions = {},
): Chunk[] {
  const targetWords = options.targetWords ?? DEFAULT_TARGET_WORDS;
  const maxWords = options.maxWords ?? DEFAULT_MAX_WORDS;
  
  const title = deriveTitle(relativePath, content);
  const chunks: Chunk[] = [];
  
  // Split by headings to maintain section context
  const headingRegex = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;
  const headings: Array<{ level: number; text: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      index: match.index,
    });
  }
  
  if (headings.length === 0) {
    // No headings, chunk by paragraphs/words
    const paragraphs = content.split(/\n\s*\n/);
    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const combined = currentChunk ? currentChunk + '\n\n' + para : para;
      const words = countWords(combined);
      
      if (words > maxWords && currentChunk) {
        // Save current chunk
        chunks.push({
          id: `${relativePath}#chunk-${chunkIndex++}`,
          path: relativePath,
          title,
          section: null,
          content: currentChunk.trim(),
          startOffset: currentStart,
          endOffset: currentStart + currentChunk.length,
          headingHierarchy: [],
        });
        currentChunk = para;
        currentStart = content.indexOf(para, currentStart);
      } else if (words > targetWords && currentChunk && i < paragraphs.length - 1) {
        // Try to save at target
        chunks.push({
          id: `${relativePath}#chunk-${chunkIndex++}`,
          path: relativePath,
          title,
          section: null,
          content: currentChunk.trim(),
          startOffset: currentStart,
          endOffset: currentStart + currentChunk.length,
          headingHierarchy: [],
        });
        currentChunk = para;
        currentStart = content.indexOf(para);
      } else {
        if (!currentChunk) {
          currentStart = content.indexOf(para);
        }
        currentChunk = combined;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        id: `${relativePath}#chunk-${chunkIndex++}`,
        path: relativePath,
        title,
        section: null,
        content: currentChunk.trim(),
        startOffset: currentStart,
        endOffset: currentStart + currentChunk.length,
        headingHierarchy: [],
      });
    }
    
    return chunks;
  }
  
  // Chunk with heading awareness
  for (let h = 0; h < headings.length; h++) {
    const heading = headings[h];
    const nextHeadingIndex = h + 1 < headings.length ? headings[h + 1].index : content.length;
    const sectionContent = content.slice(heading.index, nextHeadingIndex).trim();
    
    // Build heading hierarchy
    const hierarchy: string[] = [];
    for (let k = 0; k <= h; k++) {
      if (headings[k].level <= heading.level) {
        hierarchy.push(headings[k].text);
      }
    }
    // Keep only up to current level
    const currentHierarchy = hierarchy.filter((_, idx) => {
      const hLevel = headings.find(hd => hd.text === hierarchy[idx])?.level || 1;
      return hLevel <= heading.level;
    }).slice(-3); // Keep last 3 levels
    
    const words = countWords(sectionContent);
    if (words <= maxWords) {
      chunks.push({
        id: `${relativePath}#${heading.text.replace(/\s+/g, '-').toLowerCase()}-${h}`,
        path: relativePath,
        title,
        section: heading.text,
        content: sectionContent,
        startOffset: heading.index,
        endOffset: nextHeadingIndex,
        headingHierarchy: currentHierarchy,
      });
    } else {
      // Split large section
      const paragraphs = sectionContent.split(/\n\s*\n/);
      let currentChunk = heading.text + '\n\n';
      let chunkStart = heading.index;
      let localChunkIdx = 0;
      
      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        // Skip the heading paragraph if it's the first
        if (i === 0 && para.trim().startsWith('#')) {
          continue;
        }
        const combined = currentChunk + para + '\n\n';
        const cWords = countWords(combined);
        
        if (cWords > maxWords && currentChunk.length > heading.text.length + 4) {
          chunks.push({
            id: `${relativePath}#${heading.text.replace(/\s+/g, '-').toLowerCase()}-${h}-${localChunkIdx++}`,
            path: relativePath,
            title,
            section: heading.text,
            content: currentChunk.trim(),
            startOffset: chunkStart,
            endOffset: chunkStart + currentChunk.length,
            headingHierarchy: currentHierarchy,
          });
          currentChunk = para + '\n\n';
          chunkStart = heading.index + sectionContent.indexOf(para);
        } else {
          currentChunk = combined;
        }
      }
      
      if (currentChunk.trim() && !currentChunk.trim().startsWith('#')) {
        chunks.push({
          id: `${relativePath}#${heading.text.replace(/\s+/g, '-').toLowerCase()}-${h}-${localChunkIdx++}`,
          path: relativePath,
          title,
          section: heading.text,
          content: currentChunk.trim(),
          startOffset: chunkStart,
          endOffset: nextHeadingIndex,
          headingHierarchy: currentHierarchy,
        });
      }
    }
  }
  
  return chunks;
}

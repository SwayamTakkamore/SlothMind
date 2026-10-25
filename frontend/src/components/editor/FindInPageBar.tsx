import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface FindInPageBarProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectMatch?: (startIndex: number, endIndex: number) => void;
}

export function FindInPageBar({ content, isOpen, onClose, onSelectMatch }: FindInPageBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState<Array<{ start: number; end: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const computeMatches = useCallback(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const term = searchTerm.toLowerCase();
    const text = content.toLowerCase();
    const found: Array<{ start: number; end: number }> = [];
    let pos = 0;

    while (pos < text.length) {
      const idx = text.indexOf(term, pos);
      if (idx === -1) break;
      found.push({ start: idx, end: idx + term.length });
      pos = idx + term.length;
    }

    setMatches(found);
    if (found.length > 0) {
      setCurrentMatchIndex(0);
      onSelectMatch?.(found[0].start, found[0].end);
    } else {
      setCurrentMatchIndex(0);
    }
  }, [searchTerm, content, onSelectMatch]);

  useEffect(() => {
    computeMatches();
  }, [computeMatches]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isOpen]);

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    const m = matches[nextIdx];
    onSelectMatch?.(m.start, m.end);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIdx =
      (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    const m = matches[prevIdx];
    onSelectMatch?.(m.start, m.end);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const totalMatches = matches.length;

  return (
    <div className="absolute right-6 top-3 z-40 flex items-center gap-2 rounded-xl border border-sloth-border bg-sloth-panel/95 px-3 py-1.5 shadow-xl backdrop-blur-md text-xs select-none animate-in fade-in slide-in-from-top-2 duration-150">
      <Search size={13} className="text-sloth-subtle shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in page..."
        className="w-44 bg-transparent text-sloth-text outline-none text-xs placeholder:text-sloth-subtle"
      />

      <span className="text-[11px] text-sloth-subtle font-mono shrink-0">
        {totalMatches > 0
          ? `${currentMatchIndex + 1} of ${totalMatches}`
          : searchTerm
          ? 'No match'
          : '0 found'}
      </span>

      <div className="flex items-center gap-0.5 border-l border-sloth-border pl-1.5">
        <button
          onClick={handlePrev}
          disabled={totalMatches === 0}
          className="p-1 rounded text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface disabled:opacity-30 transition"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={handleNext}
          disabled={totalMatches === 0}
          className="p-1 rounded text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface disabled:opacity-30 transition"
          title="Next match (Enter)"
        >
          <ChevronDown size={13} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface transition ml-0.5"
          title="Close find (Esc)"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

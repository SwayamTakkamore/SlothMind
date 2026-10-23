import { FileText, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { SearchResult } from '../../types';
import { Modal } from '../common/Modal';
import { useVaultContext } from '../../App';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const { setActiveNotePath } = useVaultContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setActiveIndex(0);
      return;
    }
    const timer = window.setTimeout(() => {
      void search();
    }, 150);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const search = async () => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.search(query.trim(), 15);
      setResults(response.results);
      setActiveIndex(0);
    } catch (err) {
      console.error('Search failed', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openResult = (result: SearchResult) => {
    setActiveNotePath(result.path);
    onClose();
  };

  return (
    <Modal open={open} title="Quick search" onClose={onClose}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-2.5 text-sloth-subtle" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (event.key === 'Enter' && results[activeIndex]) {
              event.preventDefault();
              openResult(results[activeIndex]);
            }
          }}
          placeholder="Search notes by title or content..."
          className="w-full rounded-md border border-sloth-border bg-sloth-bg py-2 pl-9 pr-3 text-sm outline-none focus:border-sloth-accent"
          autoFocus
        />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {loading && <p className="px-2 py-2 text-sm text-sloth-subtle">Searching...</p>}
        {!loading && query.trim() && results.length === 0 && (
          <p className="px-2 py-2 text-sm text-sloth-subtle">No matches in this vault.</p>
        )}
        {!loading &&
          results.map((result, index) => (
            <button
              key={result.path}
              onClick={() => openResult(result)}
              className={`flex flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition ${
                index === activeIndex ? 'bg-sloth-accent/15' : 'hover:bg-sloth-surface'
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <FileText size={14} className="text-sloth-subtle" />
                <span className="truncate text-sm">{result.title}</span>
                <span className="ml-auto truncate text-xs text-sloth-subtle">{result.path}</span>
              </div>
              <p className="w-full truncate text-xs text-sloth-subtle">{result.excerpt}</p>
              {result.section && <p className="text-xs text-sloth-accent/80">#{result.section}</p>}
            </button>
          ))}
      </div>
    </Modal>
  );
}

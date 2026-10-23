import { useEffect } from 'react';

type Handler = (event: KeyboardEvent) => void;

interface Shortcuts {
  onSearch?: () => void;
  onSave?: () => void;
  onNewNote?: () => void;
}

export function useKeyboard({ onSearch, onSave, onNewNote }: Shortcuts) {
  useEffect(() => {
    const handler: Handler = (event) => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;

      if (mod && key === 'p') {
        event.preventDefault();
        onSearch?.();
        return;
      }
      if (mod && key === 'k') {
        event.preventDefault();
        onSearch?.();
        return;
      }
      if (mod && key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }
      if (mod && key === 'n') {
        event.preventDefault();
        onNewNote?.();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewNote, onSave, onSearch]);
}

import { useEffect } from 'react';

type Handler = (event: KeyboardEvent) => void;

interface Shortcuts {
  onSearch?: () => void;
  onSave?: () => void;
  onNewNote?: () => void;
  onSettings?: () => void;
  onToggleTheme?: () => void;
  onNotionAI?: () => void;
}

export function useKeyboard({
  onSearch,
  onSave,
  onNewNote,
  onSettings,
  onToggleTheme,
  onNotionAI,
}: Shortcuts) {
  useEffect(() => {
    const handler: Handler = (event) => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;

      if (mod && (key === 'p' || key === 'k')) {
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
      if (mod && key === 'j') {
        event.preventDefault();
        onNotionAI?.();
        return;
      }
      if (mod && key === ',') {
        event.preventDefault();
        onSettings?.();
        return;
      }
      if (mod && event.shiftKey && key === 'l') {
        event.preventDefault();
        onToggleTheme?.();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewNote, onSave, onSearch, onSettings, onToggleTheme, onNotionAI]);
}

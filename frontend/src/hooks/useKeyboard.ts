import { useEffect } from 'react';

type Handler = (event: KeyboardEvent) => void;

interface Shortcuts {
  onSearch?: () => void;
  onSave?: () => void;
  onNewNote?: () => void;
  onNewWindow?: () => void;
  onNewTab?: () => void;
  onCopyUrl?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onGoUpHierarchy?: () => void;
  onSettings?: () => void;
  onToggleTheme?: () => void;
  onNotionAI?: () => void;
  onEscape?: () => void;
}

export function useKeyboard({
  onSearch,
  onSave,
  onNewNote,
  onNewWindow,
  onNewTab,
  onCopyUrl,
  onGoBack,
  onGoForward,
  onGoUpHierarchy,
  onSettings,
  onToggleTheme,
  onNotionAI,
  onEscape,
}: Shortcuts) {
  useEffect(() => {
    const handler: Handler = (event) => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;

      // Esc: close active modals / menus
      if (event.key === 'Escape') {
        onEscape?.();
        return;
      }

      // Ctrl + P or Ctrl + K: Search / jump to a page
      if (mod && !event.shiftKey && (key === 'p' || key === 'k')) {
        event.preventDefault();
        onSearch?.();
        return;
      }

      // Ctrl + S: Save note
      if (mod && !event.shiftKey && key === 's') {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl + Shift + N: Open a new window
      if (mod && event.shiftKey && key === 'n') {
        event.preventDefault();
        if (onNewWindow) {
          onNewWindow();
        } else {
          window.open(window.location.href, '_blank');
        }
        return;
      }

      // Ctrl + N: Create a new page
      if (mod && !event.shiftKey && key === 'n') {
        event.preventDefault();
        onNewNote?.();
        return;
      }

      // Ctrl + T: Open a new tab
      if (mod && !event.shiftKey && key === 't') {
        event.preventDefault();
        if (onNewTab) {
          onNewTab();
        } else {
          window.open(window.location.href, '_blank');
        }
        return;
      }

      // Ctrl + L: Copy page / note URL
      if (mod && !event.shiftKey && key === 'l') {
        event.preventDefault();
        onCopyUrl?.();
        return;
      }

      // Ctrl + [: Go back in note history
      if (mod && event.key === '[') {
        event.preventDefault();
        onGoBack?.();
        return;
      }

      // Ctrl + ]: Go forward in note history
      if (mod && event.key === ']') {
        event.preventDefault();
        onGoForward?.();
        return;
      }

      // Ctrl + Shift + U: Go up one level in page hierarchy
      if (mod && event.shiftKey && key === 'u') {
        event.preventDefault();
        onGoUpHierarchy?.();
        return;
      }

      // Ctrl + J: Ask Sloth AI
      if (mod && !event.shiftKey && key === 'j') {
        event.preventDefault();
        onNotionAI?.();
        return;
      }

      // Ctrl + ,: Open Settings
      if (mod && key === ',') {
        event.preventDefault();
        onSettings?.();
        return;
      }

      // Ctrl + Shift + L: Toggle dark/light mode
      if (mod && event.shiftKey && key === 'l') {
        event.preventDefault();
        onToggleTheme?.();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    onNewNote,
    onNewWindow,
    onNewTab,
    onCopyUrl,
    onGoBack,
    onGoForward,
    onGoUpHierarchy,
    onSave,
    onSearch,
    onSettings,
    onToggleTheme,
    onNotionAI,
    onEscape,
  ]);
}

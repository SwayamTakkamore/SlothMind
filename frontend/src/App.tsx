import { useCallback, useEffect, useState } from 'react';
import { createContext, useContext } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorHeader } from './components/editor/EditorHeader';
import { MarkdownEditor } from './components/editor/MarkdownEditor';
import { SearchModal } from './components/search/SearchModal';
import { VaultPicker } from './components/vault/VaultPicker';
import { AIPanel } from './components/ai/AIPanel';
import { SettingsModal } from './components/settings/SettingsModal';
import { ModelLibraryModal } from './components/models/ModelLibraryModal';
import { useVault } from './hooks/useVault';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboard } from './hooks/useKeyboard';
import { useTheme } from './hooks/useTheme';
import { api } from './services/api';
import type { NoteContent } from './types';

interface VaultContextValue {
  activeNotePath: string | null;
  setActiveNotePath: (path: string | null) => void;
  refreshTree: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVaultContext() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVaultContext must be used within App');
  return ctx;
}

export default function App() {
  const vault = useVault();
  const theme = useTheme();
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelLibraryOpen, setModelLibraryOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);
  const [treeKey, setTreeKey] = useState(0);
  const [activeNotePath, setActiveNotePath] = useState<string | null>(null);
  const [note, setNote] = useState<NoteContent | null>(null);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  const refreshTree = useCallback(() => setTreeKey((k) => k + 1), []);

  useEffect(() => {
    fetch('/api/ai/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.model) {
          setActiveModelName(data.model);
        } else {
          setActiveModelName(null);
        }
      })
      .catch(() => setActiveModelName(null));
  }, []);

  useEffect(() => {
    if (!vault.hasVault && !vault.loading) {
      setVaultPickerOpen(true);
    }
  }, [vault.hasVault, vault.loading]);

  useEffect(() => {
    if (!activeNotePath) {
      setNote(null);
      setContent('');
      return;
    }
    let cancelled = false;
    setLoadingNote(true);
    api
      .readNote(activeNotePath)
      .then((loaded) => {
        if (cancelled) return;
        setNote(loaded);
        setContent(loaded.content);
        setPreview(false);
      })
      .catch((err) => {
        console.error('Failed to load note', err);
        if (!cancelled) setActiveNotePath(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingNote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeNotePath]);

  const autosave = useAutosave({
    path: activeNotePath,
    content,
    original: note?.content ?? '',
    delay: 800,
  });

  const createNote = useCallback(async () => {
    if (!vault.hasVault) return;
    try {
      const created = await api.createNote('');
      refreshTree();
      setActiveNotePath(created.path);
    } catch (err) {
      console.error('Create note failed', err);
    }
  }, [refreshTree, vault.hasVault]);

  const createFolder = useCallback(async () => {
    if (!vault.hasVault) return;
    const name = window.prompt('Folder name');
    if (!name) return;
    try {
      await api.createFolder('', name);
      refreshTree();
    } catch (err) {
      console.error('Create folder failed', err);
    }
  }, [refreshTree, vault.hasVault]);

  useKeyboard({
    onSearch: () => setSearchOpen(true),
    onSave: () => void autosave.saveNow(),
    onNewNote: () => void createNote(),
    onSettings: () => setSettingsOpen((o) => !o),
    onToggleTheme: theme.toggleTheme,
  });

  const editor = (
    <div className="flex h-full flex-col">
      <EditorHeader
        path={activeNotePath}
        saveStatus={autosave.status}
        preview={preview}
        onTogglePreview={() => setPreview((p) => !p)}
        onSaveNow={() => void autosave.saveNow()}
      />
      <div className="flex-1 overflow-hidden">
        {activeNotePath ? (
          loadingNote ? (
            <div className="flex h-full items-center justify-center text-sm text-sloth-subtle">Loading note...</div>
          ) : (
            <MarkdownEditor value={content} onChange={setContent} preview={preview} />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-6">
            <p className="text-base font-semibold text-sloth-text">No note selected</p>
            <p className="max-w-sm text-xs text-sloth-subtle leading-relaxed">
              Open a vault, pick a note from the explorer, or create a new Markdown note. Changes autosave to disk.
            </p>
            <button
              onClick={() => void createNote()}
              disabled={!vault.hasVault}
              className="rounded-lg bg-sloth-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sloth-accentHover disabled:opacity-40"
            >
              Create note
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const saveAsNote = useCallback(
    async (aiContent: string) => {
      if (!vault.hasVault) return;
      try {
        const name = window.prompt('Save as note with name:', `AI Note ${new Date().toISOString().slice(0, 10)}`);
        if (!name) return;
        const filename = name.endsWith('.md') ? name : `${name}.md`;
        await api.writeNote(filename, aiContent);
        refreshTree();
      } catch (err) {
        console.error('Save as note failed', err);
      }
    },
    [vault.hasVault, refreshTree]
  );

  return (
    <VaultContext.Provider value={{ activeNotePath, setActiveNotePath, refreshTree }}>
      <MainLayout
        sidebar={
          <Sidebar
            summary={vault.summary}
            onOpenVault={() => setVaultPickerOpen(true)}
            onCreateNote={() => void createNote()}
            onCreateFolder={() => void createFolder()}
            onRefresh={() => {
              void vault.refresh();
              refreshTree();
            }}
            onSearch={() => setSearchOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenModelLibrary={() => setModelLibraryOpen(true)}
            activeModelName={activeModelName}
            isDark={theme.isDark}
            onToggleTheme={theme.toggleTheme}
            treeKey={treeKey}
          />
        }
        editor={editor}
        statusBar={
          <StatusBar
            summary={vault.summary}
            saveStatus={autosave.status}
            activeNote={activeNotePath}
            onOpenModelLibrary={() => setModelLibraryOpen(true)}
            activeModelName={activeModelName}
          />
        }
        aiPanel={
          <AIPanel
            isOpen={aiPanelOpen}
            onToggle={() => setAiPanelOpen((o) => !o)}
            activeNotePath={activeNotePath}
            activeNoteContent={content}
            onSaveAsNote={saveAsNote}
            onOpenNote={(path) => setActiveNotePath(path)}
            onOpenModelLibrary={() => setModelLibraryOpen(true)}
            activeModelName={activeModelName}
          />
        }
      />
      <VaultPicker
        open={vaultPickerOpen}
        onClose={() => setVaultPickerOpen(false)}
        recent={vault.recent}
        onOpen={async (path) => {
          await vault.openVault(path);
        }}
        onCreate={async (parent, name) => {
          await vault.createVault(parent, name);
        }}
      />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme.theme}
        onThemeChange={theme.setTheme}
        isDark={theme.isDark}
        summary={vault.summary}
        onOpenVaultPicker={() => setVaultPickerOpen(true)}
        onReindexVault={async () => {
          await vault.refresh();
          refreshTree();
        }}
        onOpenModelLibrary={() => setModelLibraryOpen(true)}
        activeModelName={activeModelName}
      />
      <ModelLibraryModal
        open={modelLibraryOpen}
        onClose={() => setModelLibraryOpen(false)}
        onModelChanged={(modelId) => setActiveModelName(modelId)}
      />
    </VaultContext.Provider>
  );
}

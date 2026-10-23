import { useCallback, useEffect, useState } from 'react';
import { createContext, useContext } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorHeader } from './components/editor/EditorHeader';
import { MarkdownEditor } from './components/editor/MarkdownEditor';
import { SearchModal } from './components/search/SearchModal';
import { VaultPicker } from './components/vault/VaultPicker';
import { useVault } from './hooks/useVault';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboard } from './hooks/useKeyboard';
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
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  const [activeNotePath, setActiveNotePath] = useState<string | null>(null);
  const [note, setNote] = useState<NoteContent | null>(null);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  const refreshTree = useCallback(() => setTreeKey((k) => k + 1), []);

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
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-medium">No note selected</p>
            <p className="max-w-sm text-sm text-sloth-subtle">
              Open a vault, pick a note from the explorer, or create a new Markdown note. Changes autosave to disk.
            </p>
            <button
              onClick={() => void createNote()}
              disabled={!vault.hasVault}
              className="rounded-md bg-sloth-accent px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              Create note
            </button>
          </div>
        )}
      </div>
    </div>
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
            treeKey={treeKey}
          />
        }
        editor={editor}
        statusBar={<StatusBar summary={vault.summary} saveStatus={autosave.status} activeNote={activeNotePath} />}
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
    </VaultContext.Provider>
  );
}

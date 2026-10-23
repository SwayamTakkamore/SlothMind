import { FolderOpen, Plus, Search, Settings } from 'lucide-react';
import type { VaultSummary } from '../../types';
import { FileTree } from '../explorer/FileTree';

interface SidebarProps {
  summary: VaultSummary;
  onOpenVault: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
  onSearch: () => void;
  treeKey: number;
}

export function Sidebar({
  summary,
  onOpenVault,
  onCreateNote,
  onCreateFolder,
  onRefresh,
  onSearch,
  treeKey,
}: SidebarProps) {
  const hasVault = Boolean(summary.vault);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-sloth-border px-3 py-2">
        <div>
          <p className="text-sm font-semibold">SlothMind</p>
          <p className="text-xs text-sloth-subtle">Your second brain. Your rules.</p>
        </div>
      </header>
      <div className="flex flex-col gap-1 border-b border-sloth-border px-2 py-2">
        <button
          onClick={onSearch}
          disabled={!hasVault}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search size={16} />
          Quick search
          <span className="ml-auto text-xs">Ctrl+K</span>
        </button>
        <button
          onClick={onOpenVault}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
        >
          <FolderOpen size={16} />
          Open / Switch vault
        </button>
        <div className="flex gap-1">
          <button
            onClick={onCreateNote}
            disabled={!hasVault}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            New note
          </button>
          <button
            onClick={onCreateFolder}
            disabled={!hasVault}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            New folder
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {hasVault ? (
          <FileTree key={treeKey} onRefresh={onRefresh} />
        ) : (
          <p className="px-2 py-4 text-sm text-sloth-subtle">
            Open a local vault to browse Markdown notes.
          </p>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-sloth-border px-3 py-2 text-sm text-sloth-subtle">
        <Settings size={16} />
        Settings
        <span className="ml-auto text-xs">Local-first</span>
      </footer>
    </div>
  );
}

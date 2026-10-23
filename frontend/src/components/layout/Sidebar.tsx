import { FolderOpen, Plus, Search, Settings, Sparkles } from 'lucide-react';
import type { VaultSummary } from '../../types';
import { FileTree } from '../explorer/FileTree';
import { ThemeToggle } from '../common/ThemeToggle';

interface SidebarProps {
  summary: VaultSummary;
  onOpenVault: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
  onSearch: () => void;
  onOpenSettings: () => void;
  onOpenModelLibrary: () => void;
  activeModelName?: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  treeKey: number;
}

export function Sidebar({
  summary,
  onOpenVault,
  onCreateNote,
  onCreateFolder,
  onRefresh,
  onSearch,
  onOpenSettings,
  onOpenModelLibrary,
  activeModelName,
  isDark,
  onToggleTheme,
  treeKey,
}: SidebarProps) {
  const hasVault = Boolean(summary.vault);

  return (
    <div className="flex h-full flex-col select-none">
      <header className="flex items-center justify-between border-b border-sloth-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sloth-text tracking-tight">SlothMind</p>
          <p className="text-[11px] text-sloth-subtle truncate">
            {summary.vault ? summary.vault.name : 'Your second brain.'}
          </p>
        </div>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </header>
      <div className="flex flex-col gap-1 border-b border-sloth-border px-2 py-2">
        <button
          onClick={onSearch}
          disabled={!hasVault}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:cursor-not-allowed disabled:opacity-40"
          title="Search all notes (Ctrl+K)"
        >
          <Search size={14} />
          <span>Search</span>
          <kbd className="ml-auto rounded border border-sloth-border/80 bg-sloth-surface/50 px-1 py-0.5 text-[10px] font-mono text-sloth-subtle">
            Ctrl+K
          </kbd>
        </button>
        <button
          onClick={onOpenVault}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title={summary.vault?.path ?? 'Open or Switch vault'}
        >
          <FolderOpen size={14} />
          <span className="truncate">{summary.vault ? 'Switch vault' : 'Open vault'}</span>
        </button>
        <button
          onClick={onOpenModelLibrary}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title="Manage & switch Gemma models in Steam-style library"
        >
          <Sparkles size={14} className="text-sloth-accent" />
          <span>Model Library</span>
          {activeModelName ? (
            <span className="ml-auto rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[80px]">
              {activeModelName.split('/')[1] || activeModelName}
            </span>
          ) : (
            <span className="ml-auto rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-500">
              No Model
            </span>
          )}
        </button>
        <div className="flex gap-1 pt-1">
          <button
            onClick={onCreateNote}
            disabled={!hasVault}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sloth-border/60 bg-sloth-surface/40 px-2 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:cursor-not-allowed disabled:opacity-40"
            title="New note (Ctrl+N)"
          >
            <Plus size={13} />
            Note
          </button>
          <button
            onClick={onCreateFolder}
            disabled={!hasVault}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sloth-border/60 bg-sloth-surface/40 px-2 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:cursor-not-allowed disabled:opacity-40"
            title="New folder"
          >
            <Plus size={13} />
            Folder
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {hasVault ? (
          <FileTree key={treeKey} onRefresh={onRefresh} />
        ) : (
          <p className="px-2 py-4 text-xs text-sloth-subtle text-center">
            Open a vault to browse notes.
          </p>
        )}
      </div>
      <footer className="border-t border-sloth-border p-1.5">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title="Open Settings (Ctrl+,)"
        >
          <Settings size={14} className="text-sloth-subtle transition-transform duration-300 group-hover:rotate-45" />
          <span className="font-medium">Settings</span>
          <kbd className="ml-auto rounded border border-sloth-border/80 bg-sloth-surface/50 px-1 py-0.5 text-[10px] font-mono text-sloth-subtle">
            Ctrl+,
          </kbd>
        </button>
      </footer>
    </div>
  );
}

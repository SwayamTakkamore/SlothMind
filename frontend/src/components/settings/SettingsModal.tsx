import { Check, Cpu, Database, Eye, HardDrive, Keyboard, Monitor, Moon, Palette, RefreshCw, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../common/Modal';
import { ThemeToggle } from '../common/ThemeToggle';
import type { ThemeMode } from '../../services/storage';
import type { VaultSummary } from '../../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isDark: boolean;
  summary: VaultSummary;
  onOpenVaultPicker: () => void;
  onReindexVault?: () => void;
  onOpenModelLibrary?: () => void;
  activeModelName?: string | null;
}

type SettingsTab = 'appearance' | 'vault' | 'ai' | 'shortcuts';

export function SettingsModal({
  open,
  onClose,
  theme,
  onThemeChange,
  isDark,
  summary,
  onOpenVaultPicker,
  onReindexVault,
  onOpenModelLibrary,
  activeModelName,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [reindexing, setReindexing] = useState(false);

  const handleReindex = async () => {
    if (!onReindexVault) return;
    setReindexing(true);
    try {
      await onReindexVault();
    } finally {
      setTimeout(() => setReindexing(false), 500);
    }
  };

  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <div className="flex h-[420px] -mx-4 -my-3">
        {/* Left Tab Navigation */}
        <aside className="w-44 border-r border-sloth-border bg-sloth-surface/30 p-2 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'appearance'
                ? 'bg-sloth-surface text-sloth-text shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface/50 hover:text-sloth-text'
            }`}
          >
            <Palette size={14} className={activeTab === 'appearance' ? 'text-sloth-accent' : ''} />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'vault'
                ? 'bg-sloth-surface text-sloth-text shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface/50 hover:text-sloth-text'
            }`}
          >
            <Database size={14} className={activeTab === 'vault' ? 'text-sloth-accent' : ''} />
            Vault & Storage
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'ai'
                ? 'bg-sloth-surface text-sloth-text shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface/50 hover:text-sloth-text'
            }`}
          >
            <Cpu size={14} className={activeTab === 'ai' ? 'text-sloth-accent' : ''} />
            Local AI
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'shortcuts'
                ? 'bg-sloth-surface text-sloth-text shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface/50 hover:text-sloth-text'
            }`}
          >
            <Keyboard size={14} className={activeTab === 'shortcuts' ? 'text-sloth-accent' : ''} />
            Shortcuts
          </button>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-sloth-text">Theme & Palette</h3>
                <p className="text-xs text-sloth-subtle mt-0.5">
                  Select your interface theme or let it match your system.
                </p>
              </div>

              {/* Theme Selection Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Light Card */}
                <button
                  onClick={() => onThemeChange('light')}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    theme === 'light'
                      ? 'border-sloth-accent ring-2 ring-sloth-accent/20 bg-sloth-surface'
                      : 'border-sloth-border bg-sloth-surface/30 hover:border-sloth-subtle/50'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                    <Sun size={18} />
                  </div>
                  <span className="text-xs font-medium text-sloth-text">Light</span>
                  <span className="text-[10px] text-sloth-subtle">Paper Minimal</span>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2 rounded-full bg-sloth-accent p-0.5 text-white">
                      <Check size={10} />
                    </div>
                  )}
                </button>

                {/* Dark Card */}
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    theme === 'dark'
                      ? 'border-sloth-accent ring-2 ring-sloth-accent/20 bg-sloth-surface'
                      : 'border-sloth-border bg-sloth-surface/30 hover:border-sloth-subtle/50'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sloth-accent/15 text-sloth-accent">
                    <Moon size={18} />
                  </div>
                  <span className="text-xs font-medium text-sloth-text">Dark</span>
                  <span className="text-[10px] text-sloth-subtle">Charcoal Obsidian</span>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2 rounded-full bg-sloth-accent p-0.5 text-white">
                      <Check size={10} />
                    </div>
                  )}
                </button>

                {/* System Card */}
                <button
                  onClick={() => onThemeChange('system')}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition ${
                    theme === 'system'
                      ? 'border-sloth-accent ring-2 ring-sloth-accent/20 bg-sloth-surface'
                      : 'border-sloth-border bg-sloth-surface/30 hover:border-sloth-subtle/50'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sloth-subtle/15 text-sloth-subtle">
                    <Monitor size={18} />
                  </div>
                  <span className="text-xs font-medium text-sloth-text">System</span>
                  <span className="text-[10px] text-sloth-subtle">Follows OS</span>
                  {theme === 'system' && (
                    <div className="absolute top-2 right-2 rounded-full bg-sloth-accent p-0.5 text-white">
                      <Check size={10} />
                    </div>
                  )}
                </button>
              </div>

              {/* Quick Switcher Demonstration */}
              <div className="rounded-xl border border-sloth-border bg-sloth-surface/30 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sloth-text">Quick Appearance Toggle</p>
                  <p className="text-[11px] text-sloth-subtle mt-0.5">Click to preview animated transition</p>
                </div>
                <div className="flex items-center gap-2 bg-sloth-panel rounded-lg px-2 py-1 border border-sloth-border">
                  <span className="text-xs text-sloth-subtle">Toggle:</span>
                  <ThemeToggle
                    isDark={isDark}
                    onToggle={() => onThemeChange(isDark ? 'light' : 'dark')}
                  />
                </div>
              </div>

              {/* Minimalism info */}
              <div className="rounded-xl border border-sloth-border/70 bg-sloth-surface/20 p-3 flex items-start gap-2.5">
                <Eye size={16} className="text-sloth-accent shrink-0 mt-0.5" />
                <div className="text-xs text-sloth-subtle leading-relaxed">
                  <span className="font-medium text-sloth-text">Clean Minimalist Interface:</span> File extensions (.md) and redundant system markers are hidden from view into tooltips on hover to minimize visual noise.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-sloth-text">Vault Storage</h3>
                <p className="text-xs text-sloth-subtle mt-0.5">
                  SlothMind notes are stored directly as plain Markdown files on your disk.
                </p>
              </div>

              <div className="rounded-xl border border-sloth-border bg-sloth-surface/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sloth-subtle">Active Vault:</span>
                  <span className="text-xs font-medium text-sloth-text">{summary.vault?.name ?? 'None'}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-sloth-subtle">Disk Path:</span>
                  <span className="text-xs font-mono text-sloth-subtle break-all text-right">
                    {summary.vault?.path ?? 'No vault selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-sloth-border/60">
                  <span className="text-xs text-sloth-subtle">Indexed Notes:</span>
                  <span className="text-xs font-medium text-sloth-accent">{summary.indexedNotes} notes</span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={handleReindex}
                  disabled={!summary.vault || reindexing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sloth-border bg-sloth-surface px-3 py-2 text-xs font-medium text-sloth-text transition hover:bg-sloth-border disabled:opacity-40"
                >
                  <RefreshCw size={13} className={reindexing ? 'animate-spin' : ''} />
                  {reindexing ? 'Re-indexing...' : 'Re-index Vault'}
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenVaultPicker();
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sloth-accent px-3 py-2 text-xs font-medium text-white transition hover:bg-sloth-accentHover"
                >
                  <HardDrive size={13} />
                  Switch Vault
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-sloth-text">Local Hugging Face AI</h3>
                <p className="text-xs text-sloth-subtle mt-0.5">
                  100% private, on-device intelligence powered by PyTorch and Transformers.
                </p>
              </div>

              <div className="rounded-xl border border-sloth-border bg-sloth-surface/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sloth-subtle">Hardware Accelerator:</span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500">
                    <Cpu size={12} />
                    NVIDIA RTX 3050 Laptop GPU (CUDA)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sloth-subtle">Active Model:</span>
                  {activeModelName ? (
                    <span className="text-xs font-mono font-medium text-emerald-500">{activeModelName}</span>
                  ) : (
                    <span className="text-xs text-amber-500 font-medium">None (No model selected)</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sloth-subtle">Available / Offline Cache:</span>
                  <span className="text-xs font-mono text-sloth-subtle">HuggingFaceTB/SmolLM-135M-Instruct</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sloth-subtle">Inference Service:</span>
                  <span className="text-xs text-sloth-subtle">FastAPI • 127.0.0.1:43118</span>
                </div>
              </div>

              {onOpenModelLibrary && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenModelLibrary();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-sloth-accent px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-sloth-accentHover"
                >
                  <Sparkles size={14} />
                  <span>Open Model Library (Steam Style)</span>
                </button>
              )}

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  Zero cloud telemetry. Your notes, prompts, embeddings, and citations never touch third-party servers.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-sloth-text">Keyboard Shortcuts</h3>
                <p className="text-xs text-sloth-subtle mt-0.5">Quick actions for maximum typing flow.</p>
              </div>

              <div className="divide-y divide-sloth-border rounded-xl border border-sloth-border bg-sloth-surface/30">
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-xs text-sloth-text">Quick Search Vault</span>
                  <kbd className="rounded border border-sloth-border bg-sloth-panel px-1.5 py-0.5 text-[11px] font-mono text-sloth-subtle">
                    Ctrl + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-xs text-sloth-text">New Note</span>
                  <kbd className="rounded border border-sloth-border bg-sloth-panel px-1.5 py-0.5 text-[11px] font-mono text-sloth-subtle">
                    Ctrl + N
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-xs text-sloth-text">Save Immediately</span>
                  <kbd className="rounded border border-sloth-border bg-sloth-panel px-1.5 py-0.5 text-[11px] font-mono text-sloth-subtle">
                    Ctrl + S
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-xs text-sloth-text">Settings</span>
                  <kbd className="rounded border border-sloth-border bg-sloth-panel px-1.5 py-0.5 text-[11px] font-mono text-sloth-subtle">
                    Ctrl + ,
                  </kbd>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-xs text-sloth-text">Toggle Theme</span>
                  <kbd className="rounded border border-sloth-border bg-sloth-panel px-1.5 py-0.5 text-[11px] font-mono text-sloth-subtle">
                    Ctrl + Shift + L
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

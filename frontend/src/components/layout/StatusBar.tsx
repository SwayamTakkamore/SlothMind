import { Cpu, Database, FileText, HardDrive, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SaveStatus, VaultSummary } from '../../types';

interface StatusBarProps {
  summary: VaultSummary;
  saveStatus: SaveStatus;
  activeNote: string | null;
  onOpenModelLibrary?: () => void;
  activeModelName?: string | null;
}

function saveLabel(status: SaveStatus): { text: string; className: string } {
  switch (status) {
    case 'saving':
      return { text: 'Saving...', className: 'text-sloth-accent' };
    case 'unsaved':
      return { text: 'Unsaved changes', className: 'text-sloth-warning' };
    case 'error':
      return { text: 'Save error', className: 'text-red-400' };
    default:
      return { text: 'Saved', className: 'text-emerald-500' };
  }
}

export function StatusBar({
  summary,
  saveStatus,
  activeNote,
  onOpenModelLibrary,
  activeModelName,
}: StatusBarProps) {
  const { text: statusText, className: statusClass } = saveLabel(saveStatus);
  const vaultName = summary.vault?.name ?? 'No vault open';
  const vaultPath = summary.vault?.path ?? 'None';
  const [aiStatus, setAiStatus] = useState<{ status: string; provider?: string; device?: string; gpu?: string; model?: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/ai/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAiStatus(data))
      .catch(() => setAiStatus(null));
  }, [activeModelName]);

  const aiReady = aiStatus?.status === 'ok';
  const currentModel = activeModelName !== undefined ? activeModelName : aiStatus?.model;
  const currentModelShort = currentModel ? currentModel.split('/')[1] || currentModel : null;

  return (
    <footer className="flex h-7 items-center justify-between border-t border-sloth-border bg-sloth-panel/90 px-3 text-[11px] text-sloth-subtle select-none">
      {/* Left side: Vault and Notes info with rich hover tooltips */}
      <div className="flex items-center gap-3">
        <span
          className="flex items-center gap-1.5 cursor-help transition hover:text-sloth-text"
          title={`Vault: ${vaultName}\nPath: ${vaultPath}`}
        >
          <Database size={11} className="text-sloth-accent" />
          <span className="font-medium text-sloth-text">{vaultName}</span>
        </span>
        <span
          className="flex items-center gap-1.5 cursor-help transition hover:text-sloth-text"
          title={`${summary.indexedNotes} notes indexed for full-text search and grounded RAG`}
        >
          <FileText size={11} />
          <span>{summary.indexedNotes} indexed note{summary.indexedNotes === 1 ? '' : 's'}</span>
        </span>
        {activeNote && (
          <span
            className="hidden truncate sm:inline cursor-help text-sloth-subtle/80 hover:text-sloth-text transition"
            title={`Active note path: ${activeNote}`}
          >
            • {activeNote}
          </span>
        )}
      </div>

      {/* Right side: Clean minimal indicators with detailed hover tooltips */}
      <div className="flex items-center gap-3">
        {/* Local-first marker with detailed hover tooltip */}
        <span
          className="flex items-center gap-1.5 cursor-help transition hover:text-sloth-text"
          title="Local-first Architecture: All files are stored purely on your local filesystem with zero cloud sync."
        >
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Local-first</span>
        </span>

        {/* AI status with technical details on hover and 1-click model library opener */}
        <button
          onClick={onOpenModelLibrary}
          className="flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 transition hover:bg-sloth-surface hover:text-sloth-text"
          title={
            aiReady
              ? `Local AI: Online\nDevice: ${aiStatus?.device ?? 'CUDA'}\nGPU: ${aiStatus?.gpu ?? 'RTX 3050'}\nActive Model: ${currentModel ?? 'None (Click to choose & activate model)'}\nClick to open Steam-style Model Library`
              : 'Local AI: Service starting or offline. Click to view models.'
          }
        >
          {currentModel ? (
            <>
              <Cpu size={12} className="text-emerald-500" />
              <span className="hidden md:inline text-emerald-500 font-medium">
                {currentModelShort}
              </span>
            </>
          ) : aiReady ? (
            <>
              <Sparkles size={12} className="text-amber-500" />
              <span className="hidden md:inline text-amber-500 font-medium">
                AI: No Model (Click to Load)
              </span>
            </>
          ) : (
            <>
              <Cpu size={12} className="text-sloth-subtle" />
              <span className="hidden md:inline text-sloth-subtle">AI Offline</span>
            </>
          )}
        </button>

        {/* Save status */}
        <span
          className={`flex items-center gap-1 cursor-help transition hover:text-sloth-text ${statusClass}`}
          title={`Save state: ${statusText}`}
        >
          <HardDrive size={11} />
          <span>{statusText}</span>
        </span>
      </div>
    </footer>
  );
}

import { Circle, Cpu, Database, FileText, Save, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SaveStatus, VaultSummary } from '../../types';

interface StatusBarProps {
  summary: VaultSummary;
  saveStatus: SaveStatus;
  activeNote: string | null;
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
      return { text: 'Saved', className: 'text-emerald-400' };
  }
}

export function StatusBar({ summary, saveStatus, activeNote }: StatusBarProps) {
  const { text, className } = saveLabel(saveStatus);
  const vaultName = summary.vault?.name ?? 'No vault open';
  const [aiStatus, setAiStatus] = useState<{ status: string; provider?: string; device?: string; gpu?: string } | null>(null);

  useEffect(() => {
    fetch('/api/ai/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAiStatus(data))
      .catch(() => setAiStatus(null));
  }, []);

  const aiReady = aiStatus?.status === 'ok' && aiStatus?.provider === 'huggingface-local';

  return (
    <footer className="flex h-8 items-center justify-between border-t border-sloth-border bg-sloth-panel px-3 text-xs text-sloth-subtle">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <Database size={12} />
          {vaultName}
        </span>
        <span className="flex items-center gap-1.5">
          <FileText size={12} />
          {summary.indexedNotes} indexed note{summary.indexedNotes === 1 ? '' : 's'}
        </span>
        {activeNote && <span className="hidden truncate sm:inline">• {activeNote}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <WifiOff size={12} />
          Local-first
        </span>
        <span className="flex items-center gap-1.5">
          <Cpu size={12} />
          {aiReady ? `Hugging Face Local${aiStatus?.device?.includes('cuda') ? ' (CUDA)' : ''}` : 'AI: offline'}
        </span>
        <span className={`flex items-center gap-1.5 ${className}`}>
          <Save size={12} />
          {text}
        </span>
        <span className="flex items-center gap-1.5">
          <Circle size={8} className="fill-emerald-400 text-emerald-400" />
          Backend ready
        </span>
      </div>
    </footer>
  );
}

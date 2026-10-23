import { Eye, EyeOff, Save } from 'lucide-react';
import type { SaveStatus } from '../../types';

interface EditorHeaderProps {
  path: string | null;
  saveStatus: SaveStatus;
  preview: boolean;
  onTogglePreview: () => void;
  onSaveNow: () => void;
}

function statusCopy(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving';
    case 'unsaved':
      return 'Unsaved';
    case 'error':
      return 'Error';
    default:
      return 'Saved';
  }
}

export function EditorHeader({ path, saveStatus, preview, onTogglePreview, onSaveNow }: EditorHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-sloth-border px-6 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm">{path ?? 'No note selected'}</p>
        <p className="text-xs text-sloth-subtle">UTF-8 Markdown • {statusCopy(saveStatus)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onSaveNow}
          disabled={!path || saveStatus === 'saving'}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
        >
          <Save size={16} />
          Save
        </button>
        <button
          onClick={onTogglePreview}
          disabled={!path}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
        >
          {preview ? <EyeOff size={16} /> : <Eye size={16} />}
          {preview ? 'Source' : 'Preview'}
        </button>
      </div>
    </header>
  );
}

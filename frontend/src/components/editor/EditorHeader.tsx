import { Check, Columns2, Eye, FileText, Info, PenLine, Save, Sparkles } from 'lucide-react';
import type { SaveStatus } from '../../types';

export type EditorViewMode = 'edit' | 'split' | 'preview';

interface EditorHeaderProps {
  path: string | null;
  saveStatus: SaveStatus;
  preview?: boolean;
  viewMode?: EditorViewMode;
  onTogglePreview?: () => void;
  onViewModeChange?: (mode: EditorViewMode) => void;
  onSaveNow: () => void;
  onOpenNotionAI?: () => void;
}

function cleanTitle(path: string | null): { folder: string | null; title: string } {
  if (!path) return { folder: null, title: 'No note selected' };
  const parts = path.split('/');
  const rawFileName = parts[parts.length - 1];
  const title = rawFileName.replace(/\.md$/i, '');
  const folder = parts.length > 1 ? parts.slice(0, -1).join(' / ') : null;
  return { folder, title };
}

export function EditorHeader({
  path,
  saveStatus,
  preview = false,
  viewMode,
  onTogglePreview,
  onViewModeChange,
  onSaveNow,
  onOpenNotionAI,
}: EditorHeaderProps) {
  const { folder, title } = cleanTitle(path);
  const currentMode: EditorViewMode = viewMode ?? (preview ? 'preview' : 'edit');

  const handleModeClick = (newMode: EditorViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(newMode);
    } else if (onTogglePreview) {
      // Fallback for simple boolean toggle
      if ((newMode === 'preview' && !preview) || (newMode !== 'preview' && preview)) {
        onTogglePreview();
      }
    }
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-sloth-border px-6 select-none bg-sloth-panel/40 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText size={15} className="text-sloth-subtle shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-sloth-text truncate">
            {folder && <span className="text-xs text-sloth-subtle font-normal">{folder} /</span>}
            <span className="truncate" title={path ?? undefined}>{title}</span>
          </div>
        </div>

        {/* Clean Save / Format Indicator with full details in hover tooltip */}
        {path && (
          <div
            className="group relative ml-2 flex items-center gap-1.5 cursor-help rounded-full px-2 py-0.5 text-[11px] text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
            title={`Format: UTF-8 Plain Markdown\nPath: ${path}\nStatus: ${saveStatus === 'saved' ? 'Autosaved to disk' : saveStatus}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                saveStatus === 'saving'
                  ? 'bg-sloth-accent animate-pulse'
                  : saveStatus === 'unsaved'
                  ? 'bg-sloth-warning'
                  : saveStatus === 'error'
                  ? 'bg-sloth-danger'
                  : 'bg-sloth-success'
              }`}
            />
            <span className="capitalize">{saveStatus}</span>
            <Info size={11} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-sloth-subtle" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onOpenNotionAI && (
          <button
            onClick={onOpenNotionAI}
            disabled={!path}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600/15 to-indigo-600/15 border border-purple-500/30 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-40"
            title="Open Sloth AI workspace assistant (Ctrl+J)"
          >
            <Sparkles size={13} className="text-purple-500" />
            <span>Sloth AI</span>
            <kbd className="hidden sm:inline rounded bg-purple-500/15 border border-purple-500/30 px-1 py-0.2 text-[9px] font-mono">
              Ctrl+J
            </kbd>
          </button>
        )}

        <button
          onClick={onSaveNow}
          disabled={!path || saveStatus === 'saving'}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
          title="Save note (Ctrl+S)"
        >
          {saveStatus === 'saved' ? <Check size={14} className="text-sloth-success" /> : <Save size={14} />}
          <span>Save</span>
        </button>

        {/* View Mode Segmented Control: Edit, Split (Side-by-Side), Preview */}
        <div className="flex items-center rounded-lg border border-sloth-border bg-sloth-surface/60 p-0.5">
          <button
            onClick={() => handleModeClick('edit')}
            disabled={!path}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition disabled:opacity-40 ${
              currentMode === 'edit'
                ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:text-sloth-text'
            }`}
            title="Editor View (Full document editor)"
          >
            <PenLine size={13} />
            <span>Edit</span>
          </button>

          <button
            onClick={() => handleModeClick('split')}
            disabled={!path}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition disabled:opacity-40 ${
              currentMode === 'split'
                ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:text-sloth-text'
            }`}
            title="Split View (Editor + Live Rendered Preview Side-by-Side)"
          >
            <Columns2 size={13} />
            <span>Split</span>
          </button>

          <button
            onClick={() => handleModeClick('preview')}
            disabled={!path}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition disabled:opacity-40 ${
              currentMode === 'preview'
                ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:text-sloth-text'
            }`}
            title="Full Rendered Preview"
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </header>
  );
}

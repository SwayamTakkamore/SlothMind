import { CheckSquare, FileText, Minimize2, Sparkles, Type, Wand2 } from 'lucide-react';

interface NotionAIFloatingToolbarProps {
  visible: boolean;
  onAskAI: () => void;
  onQuickAction: (action: string) => void;
}

export function NotionAIFloatingToolbar({
  visible,
  onAskAI,
  onQuickAction,
}: NotionAIFloatingToolbarProps) {
  if (!visible) return null;

  return (
    <div className="absolute right-8 top-4 z-20 flex items-center gap-1 rounded-xl border border-sloth-border bg-sloth-panel/95 p-1 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 select-none">
      <button
        onClick={onAskAI}
        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
        title="Open full Sloth AI palette (Ctrl+J)"
      >
        <Sparkles size={13} />
        <span>Ask Sloth AI</span>
      </button>

      <div className="h-4 w-px bg-sloth-border mx-0.5" />

      <button
        onClick={() => onQuickAction('improve')}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition"
        title="Improve writing"
      >
        <Wand2 size={12} className="text-purple-500" />
        <span className="hidden sm:inline">Improve</span>
      </button>

      <button
        onClick={() => onQuickAction('fix-grammar')}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition"
        title="Fix spelling & grammar"
      >
        <Type size={12} className="text-emerald-500" />
        <span className="hidden sm:inline">Grammar</span>
      </button>

      <button
        onClick={() => onQuickAction('make-shorter')}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition"
        title="Make shorter"
      >
        <Minimize2 size={12} className="text-blue-500" />
        <span className="hidden sm:inline">Shorter</span>
      </button>

      <button
        onClick={() => onQuickAction('action-items')}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition"
        title="Extract action items"
      >
        <CheckSquare size={12} className="text-emerald-500" />
        <span className="hidden sm:inline">Action items</span>
      </button>

      <button
        onClick={() => onQuickAction('summarize')}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition"
        title="Summarize selection"
      >
        <FileText size={12} className="text-amber-500" />
        <span className="hidden sm:inline">Summarize</span>
      </button>
    </div>
  );
}

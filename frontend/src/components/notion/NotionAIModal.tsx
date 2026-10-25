import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  Copy,
  FileSpreadsheet,
  FileText,
  Languages,
  ListTodo,
  Mail,
  Maximize2,
  Minimize2,
  PenTool,
  RefreshCw,
  RotateCcw,
  Send,
  Sliders,
  Smile,
  Sparkles,
  Type,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../../services/api';
import type { NotionAITask, NotionAITemplate, NotionAITone } from '../../types';

interface NotionAIModalProps {
  open: boolean;
  onClose: () => void;
  selectedText?: string;
  activeNoteContent?: string;
  activeModelName?: string | null;
  onInsertContent: (content: string, mode: 'replace-selection' | 'insert-below' | 'replace-all' | 'append') => void;
  onOpenModelLibrary?: () => void;
}

export function NotionAIModal({
  open,
  onClose,
  selectedText = '',
  activeNoteContent = '',
  activeModelName,
  onInsertContent,
  onOpenModelLibrary,
}: NotionAIModalProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedResult, setGeneratedResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<NotionAITone>('professional');
  const [selectedLang, setSelectedLang] = useState<string>('Spanish');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCustomPrompt('');
      setGeneratedResult('');
      setErrorMsg(null);
      setActiveTask(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const runTask = useCallback(
    async (
      task: NotionAITask | string,
      options?: {
        prompt?: string;
        template_type?: NotionAITemplate | string;
        tone?: NotionAITone | string;
        target_language?: string;
      }
    ) => {
      if (!activeModelName) {
        setErrorMsg('No local AI model is active. Please open the Model Library to activate a model.');
        return;
      }

      setIsGenerating(true);
      setErrorMsg(null);
      setActiveTask(task);
      setGeneratedResult('');

      const targetText = selectedText.trim() || activeNoteContent.trim();

      try {
        const res = await api.notionAI({
          task,
          text: targetText,
          prompt: options?.prompt || customPrompt,
          template_type: options?.template_type,
          tone: options?.tone || selectedTone,
          target_language: options?.target_language || selectedLang,
          max_tokens: 768,
        });

        if (res.result) {
          setGeneratedResult(res.result);
        } else {
          throw new Error('No content returned from Notion AI');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Notion AI generation failed';
        setErrorMsg(msg);
      } finally {
        setIsGenerating(false);
      }
    },
    [activeModelName, selectedText, activeNoteContent, customPrompt, selectedTone, selectedLang]
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    runTask(selectedText ? 'edit' : 'draft', { prompt: customPrompt });
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInsert = (mode: 'replace-selection' | 'insert-below' | 'replace-all' | 'append') => {
    if (!generatedResult) return;
    onInsertContent(generatedResult, mode);
    onClose();
  };

  if (!open) return null;

  const hasSelection = Boolean(selectedText && selectedText.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-sloth-border bg-sloth-panel shadow-2xl overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-sloth-border px-4 py-3 bg-sloth-surface/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-sm">
              <Sparkles size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-sloth-text">Notion AI</span>
                <span className="rounded-full bg-purple-500/15 px-2 py-0.2 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  Universal Workspace AI
                </span>
              </div>
              <p className="text-[11px] text-sloth-subtle flex items-center gap-1.5 mt-0.5">
                {activeModelName ? (
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Model: {activeModelName.split('/')[1] || activeModelName}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenModelLibrary?.();
                    }}
                    className="text-amber-500 underline font-medium hover:text-amber-400 cursor-pointer"
                  >
                    No model active — Click to activate in Model Library
                  </button>
                )}
                {hasSelection && (
                  <>
                    <span className="text-sloth-border">•</span>
                    <span className="text-sloth-accent font-medium">
                      {selectedText.trim().split(/\s+/).length} words selected
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
            title="Close Notion AI"
          >
            <X size={16} />
          </button>
        </header>

        {/* Search & Custom Prompt Input */}
        <div className="border-b border-sloth-border p-3 bg-sloth-surface/20">
          <form onSubmit={handleCustomSubmit} className="relative flex items-center">
            <Sparkles size={15} className="absolute left-3 text-purple-500" />
            <input
              ref={inputRef}
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                hasSelection
                  ? 'Ask Notion AI to edit or rewrite selection... (e.g. "turn into bullet points", "more concise")'
                  : 'Ask Notion AI to write, brainstorm, or outline anything...'
              }
              disabled={isGenerating}
              className="w-full rounded-xl border border-sloth-border bg-sloth-panel py-2 pl-9 pr-24 text-xs text-sloth-text placeholder:text-sloth-subtle focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none"
            />
            <button
              type="submit"
              disabled={!customPrompt.trim() || isGenerating}
              className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
            >
              {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              <span>Ask AI</span>
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-sloth-danger/30 bg-sloth-danger/10 px-3 py-2 text-xs text-sloth-danger">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Content Area: Generated Output OR Notion AI Command Palette */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg animate-pulse">
                <Sparkles size={24} className="animate-spin duration-1000" />
              </div>
              <div>
                <p className="text-sm font-bold text-sloth-text">Notion AI is generating...</p>
                <p className="text-xs text-sloth-subtle mt-0.5">
                  Running {activeTask || 'task'} locally on your RTX 3050 GPU
                </p>
              </div>
            </div>
          ) : generatedResult ? (
            /* Result Preview Card */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                  <Wand2 size={13} />
                  <span>Notion AI Response</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-2.5 py-1 text-[11px] text-sloth-subtle hover:text-sloth-text transition"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => runTask(activeTask || 'improve')}
                    className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-2.5 py-1 text-[11px] text-sloth-subtle hover:text-sloth-text transition"
                    title="Regenerate output"
                  >
                    <RotateCcw size={12} />
                    <span>Try again</span>
                  </button>
                </div>
              </div>

              {/* Markdown Preview container */}
              <div className="max-h-[300px] overflow-y-auto rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-4 text-xs leading-relaxed text-sloth-text select-text">
                <article className="prose prose-sloth max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedResult}</ReactMarkdown>
                </article>
              </div>

              {/* Notion-Style Action Decision Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sloth-border">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasSelection ? (
                    <button
                      onClick={() => handleInsert('replace-selection')}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-bold text-white shadow-md transition"
                    >
                      <Check size={13} />
                      <span>Replace Selection</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInsert('append')}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-bold text-white shadow-md transition"
                    >
                      <Check size={13} />
                      <span>Insert into Note</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleInsert('insert-below')}
                    className="flex items-center gap-1.5 rounded-xl border border-sloth-border bg-sloth-surface px-3 py-2 text-xs font-medium text-sloth-text hover:bg-sloth-panel transition"
                  >
                    <ArrowRight size={13} />
                    <span>Insert Below</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => runTask('make-shorter')}
                    className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface/60 px-2.5 py-1.5 text-xs text-sloth-subtle hover:text-sloth-text transition"
                    title="Make shorter"
                  >
                    <Minimize2 size={12} />
                    <span>Shorter</span>
                  </button>
                  <button
                    onClick={() => runTask('make-longer')}
                    className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface/60 px-2.5 py-1.5 text-xs text-sloth-subtle hover:text-sloth-text transition"
                    title="Make longer"
                  >
                    <Maximize2 size={12} />
                    <span>Longer</span>
                  </button>
                  <button
                    onClick={() => setGeneratedResult('')}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-sloth-subtle hover:text-sloth-danger transition"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Notion AI Command Categories */
            <div className="space-y-4">
              {/* Category 1: Generation & First Drafts */}
              <div>
                <p className="text-[11px] font-bold text-sloth-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PenTool size={12} className="text-purple-500" />
                  <span>Draft with Notion AI</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => runTask('draft', { template_type: 'brainstorm', prompt: customPrompt || 'Product ideas and growth strategies' })}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2.5 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Zap size={14} className="text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sloth-text truncate">Brainstorm Ideas</p>
                      <p className="text-[10px] text-sloth-subtle truncate">Creative list of concepts</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('draft', { template_type: 'blog-post', prompt: customPrompt || 'AI-powered local note-taking' })}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2.5 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <FileText size={14} className="text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sloth-text truncate">Blog Post</p>
                      <p className="text-[10px] text-sloth-subtle truncate">Structured article draft</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('draft', { template_type: 'prd', prompt: customPrompt || 'Local-first knowledge base' })}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2.5 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sloth-text truncate">PRD / Spec</p>
                      <p className="text-[10px] text-sloth-subtle truncate">Product requirements doc</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('draft', { template_type: 'meeting-agenda', prompt: customPrompt || 'Sprint planning & backlog grooming' })}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2.5 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Calendar size={14} className="text-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sloth-text truncate">Meeting Agenda</p>
                      <p className="text-[10px] text-sloth-subtle truncate">Timed discussion topics</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('draft', { template_type: 'email', prompt: customPrompt || 'Project launch announcement' })}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2.5 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Mail size={14} className="text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sloth-text truncate">Sales / Outreach Email</p>
                      <p className="text-[10px] text-sloth-subtle truncate">Persuasive email copy</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('continue')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2.5 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <ArrowRight size={14} className="text-purple-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-sloth-text truncate">Continue Writing</p>
                      <p className="text-[10px] text-sloth-subtle truncate">Seamlessly expand notes</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 2: Edit & Refine */}
              <div>
                <p className="text-[11px] font-bold text-sloth-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sliders size={12} className="text-indigo-500" />
                  <span>Edit, Polish & Transform</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => runTask('improve')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Wand2 size={13} className="text-purple-500 shrink-0" />
                    <span className="text-xs font-medium text-sloth-text truncate">Improve Writing</span>
                  </button>

                  <button
                    onClick={() => runTask('fix-grammar')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Type size={13} className="text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-sloth-text truncate">Fix Grammar</span>
                  </button>

                  <button
                    onClick={() => runTask('make-shorter')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Minimize2 size={13} className="text-blue-500 shrink-0" />
                    <span className="text-xs font-medium text-sloth-text truncate">Make Shorter</span>
                  </button>

                  <button
                    onClick={() => runTask('make-longer')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Maximize2 size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-sloth-text truncate">Make Longer</span>
                  </button>

                  <button
                    onClick={() => runTask('simplify')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <Smile size={13} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-sloth-text truncate">Simplify Language</span>
                  </button>

                  <button
                    onClick={() => runTask('explain')}
                    className="flex items-center gap-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-2 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <BookOpen size={13} className="text-rose-500 shrink-0" />
                    <span className="text-xs font-medium text-sloth-text truncate">Explain This</span>
                  </button>

                  {/* Tone Modifier */}
                  <div className="flex items-center gap-1.5 col-span-2 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-1.5">
                    <span className="text-[11px] text-sloth-subtle font-medium pl-1.5">Tone:</span>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value as NotionAITone)}
                      className="bg-sloth-panel rounded-lg border border-sloth-border px-2 py-1 text-xs text-sloth-text outline-none"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="direct">Direct</option>
                      <option value="confident">Confident</option>
                      <option value="friendly">Friendly</option>
                    </select>
                    <button
                      onClick={() => runTask('change-tone', { tone: selectedTone })}
                      className="ml-auto rounded-lg bg-sloth-surface px-2.5 py-1 text-[11px] font-semibold text-sloth-text hover:bg-sloth-panel transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Category 3: Review, Summarize & Actions */}
              <div>
                <p className="text-[11px] font-bold text-sloth-subtle uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ListTodo size={12} className="text-emerald-500" />
                  <span>Synthesize & Automate Tasks</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => runTask('action-items')}
                    className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition hover:border-emerald-500 hover:bg-emerald-500/10"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <CheckSquare size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sloth-text">Extract Action Items</p>
                      <p className="text-[10px] text-sloth-subtle">Checklist with checkboxes</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('summarize')}
                    className="flex items-center gap-2.5 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-3 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                      <FileText size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sloth-text">Summarize Note</p>
                      <p className="text-[10px] text-sloth-subtle">Executive overview</p>
                    </div>
                  </button>

                  <button
                    onClick={() => runTask('key-takeaways')}
                    className="flex items-center gap-2.5 rounded-xl border border-sloth-border/80 bg-sloth-surface/40 p-3 text-left transition hover:border-purple-500/50 hover:bg-sloth-surface"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <Zap size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-sloth-text">Key Takeaways</p>
                      <p className="text-[10px] text-sloth-subtle">Bullet points & insights</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 4: Translate */}
              <div className="flex items-center justify-between rounded-xl border border-sloth-border/80 bg-sloth-surface/30 p-2.5">
                <div className="flex items-center gap-2">
                  <Languages size={15} className="text-indigo-500" />
                  <span className="text-xs font-semibold text-sloth-text">Translate Selection:</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="bg-sloth-panel rounded-lg border border-sloth-border px-2 py-1 text-xs text-sloth-text outline-none"
                  >
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Mandarin">Mandarin</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                  </select>
                  <button
                    onClick={() => runTask('translate', { target_language: selectedLang })}
                    className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                  >
                    Translate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

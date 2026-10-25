import {
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  FileText,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../../services/api';
import type { NotionAITask, NotionAITemplate, NotionAITone } from '../../types';

export interface RecognizedIntent {
  task: NotionAITask | string;
  template_type?: NotionAITemplate | string;
  tone?: NotionAITone | string;
  target_language?: string;
  prompt: string;
  badge: string;
}

export function recognizeIntent(rawPrompt: string, selectedText?: string): RecognizedIntent {
  const p = rawPrompt.trim();
  const lower = p.toLowerCase();
  const hasSelection = Boolean(selectedText && selectedText.trim().length > 0);

  // 1. Action items / Checklists / Tasks
  if (/(?:action\s*items?|tasks?|to-?dos?|checklist|extract\s*tasks)/i.test(lower)) {
    return {
      task: 'action-items',
      prompt: p,
      badge: '📋 Action Items',
    };
  }

  // 2. Summarize / TLDR / Key takeaways
  if (/(?:summariz|summary|tl;?dr|brief|recap|overview)/i.test(lower)) {
    return {
      task: 'summarize',
      prompt: p,
      badge: '📝 Summary',
    };
  }
  if (/(?:takeaways?|key\s*points?|highlights?|bullet\s*points?)/i.test(lower) && hasSelection) {
    return {
      task: 'key-takeaways',
      prompt: p,
      badge: '📌 Key Takeaways',
    };
  }

  // 3. Grammar / Proofreading / Spelling
  if (/(?:grammar|spell(?:ing)?|typos?|proofread|correct(?:ion)?)/i.test(lower)) {
    return {
      task: 'fix-grammar',
      prompt: p,
      badge: '✨ Fix Grammar',
    };
  }

  // 4. Shorter / Condense / Conciseness
  if (/(?:shorter|condense|concise|abbreviate|trim|cut\s*down)/i.test(lower)) {
    return {
      task: 'make-shorter',
      prompt: p,
      badge: '✂️ Make Shorter',
    };
  }

  // 5. Longer / Expand / Elaborate
  if (/(?:longer|expand|elaborate|more\s*detail|flesh\s*out|extend)/i.test(lower)) {
    return {
      task: 'make-longer',
      prompt: p,
      badge: '🔍 Expand',
    };
  }

  // 6. Simplify / Plain English / Explain like I'm 5
  if (/(?:simplif|plain\s*english|eli5|explain\s*simply|easy\s*to\s*understand)/i.test(lower)) {
    return {
      task: 'simplify',
      prompt: p,
      badge: '💡 Simplify',
    };
  }

  // 7. Explain concept
  if (/(?:explain|what\s+is|what\s+are|how\s+does|meaning\s+of)/i.test(lower) && hasSelection) {
    return {
      task: 'explain',
      prompt: p,
      badge: '📖 Explain',
    };
  }

  // 8. Translation
  const commonLangs = [
    'spanish',
    'french',
    'german',
    'japanese',
    'chinese',
    'hindi',
    'italian',
    'portuguese',
    'russian',
    'arabic',
    'korean',
  ];
  for (const lang of commonLangs) {
    if (lower.includes(lang) && (lower.includes('translate') || lower.includes('in') || lower.includes('to'))) {
      const capLang = lang.charAt(0).toUpperCase() + lang.slice(1);
      return {
        task: 'translate',
        target_language: capLang,
        prompt: p,
        badge: `🌐 Translate (${capLang})`,
      };
    }
  }

  // 9. Tone modifications
  const tones: NotionAITone[] = ['professional', 'casual', 'confident', 'friendly', 'direct'];
  for (const t of tones) {
    if (lower.includes(t) && (lower.includes('tone') || lower.includes('sound') || lower.includes('make it') || lower.includes('rewrite'))) {
      return {
        task: 'change-tone',
        tone: t,
        prompt: p,
        badge: `🎭 ${t.charAt(0).toUpperCase() + t.slice(1)} Tone`,
      };
    }
  }

  // 10. Specific Drafting Templates
  if (/(?:brainstorm|ideas?|concept|angles?)/i.test(lower)) {
    return {
      task: 'draft',
      template_type: 'brainstorm',
      prompt: p.replace(/^(?:brainstorm|give me ideas for|ideas for)\s*/i, '') || p,
      badge: '⚡ Brainstorm',
    };
  }
  if (/(?:blog(?:\s*post)?|article|essay)/i.test(lower)) {
    return {
      task: 'draft',
      template_type: 'blog-post',
      prompt: p.replace(/^(?:write a blog post about|write an article about|blog about)\s*/i, '') || p,
      badge: '📰 Blog Post',
    };
  }
  if (/(?:prd|spec|product\s*requirements?|feature\s*spec)/i.test(lower)) {
    return {
      task: 'draft',
      template_type: 'prd',
      prompt: p.replace(/^(?:draft a prd for|create a spec for|prd for)\s*/i, '') || p,
      badge: '📋 PRD Spec',
    };
  }
  if (/(?:meeting|agenda|sync)/i.test(lower)) {
    return {
      task: 'draft',
      template_type: 'meeting-agenda',
      prompt: p.replace(/^(?:meeting agenda for|create an agenda for)\s*/i, '') || p,
      badge: '📅 Agenda',
    };
  }
  if (/(?:email|outreach|cold\s*email|newsletter)/i.test(lower)) {
    return {
      task: 'draft',
      template_type: 'email',
      prompt: p.replace(/^(?:draft an email to|write an email about)\s*/i, '') || p,
      badge: '✉️ Email',
    };
  }

  // 11. Polish / Improve
  if (hasSelection && /(?:improve|rewrite|polish|rephrase|better)/i.test(lower)) {
    return {
      task: 'improve',
      prompt: p,
      badge: '✨ Polish Writing',
    };
  }

  // 12. General fallback: edit selection or draft
  if (hasSelection) {
    return {
      task: 'edit',
      prompt: p,
      badge: '✏️ Edit Selection',
    };
  }

  return {
    task: 'draft',
    prompt: p,
    badge: '💬 Chat Response',
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intentBadge?: string;
  task?: string;
  timestamp: string;
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<RecognizedIntent | null>(null);
  const [useSelectionContext, setUseSelectionContext] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasSelection = Boolean(selectedText && selectedText.trim().length > 0);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setUseSelectionContext(hasSelection);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, hasSelection]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSendMessage = useCallback(
    async (overridePrompt?: string) => {
      const promptToSend = (overridePrompt || inputPrompt).trim();
      if (!promptToSend) return;

      if (!activeModelName) {
        setErrorMsg('No local AI model is active. Please open the Model Library to activate a model.');
        return;
      }

      const activeText = useSelectionContext && hasSelection ? selectedText.trim() : activeNoteContent.trim();
      const recognized = recognizeIntent(promptToSend, activeText);
      setCurrentIntent(recognized);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: promptToSend,
        intentBadge: recognized.badge,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputPrompt('');
      setIsGenerating(true);
      setErrorMsg(null);

      try {
        const res = await api.notionAI({
          task: recognized.task,
          text: activeText,
          prompt: recognized.prompt,
          template_type: recognized.template_type,
          tone: recognized.tone,
          target_language: recognized.target_language,
          max_tokens: 768,
        });

        if (res.result) {
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.result,
            intentBadge: recognized.badge,
            task: recognized.task,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error('No content returned from Sloth AI');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        setErrorMsg(msg);
      } finally {
        setIsGenerating(false);
      }
    },
    [inputPrompt, activeModelName, useSelectionContext, hasSelection, selectedText, activeNoteContent]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInsert = (content: string, mode: 'replace-selection' | 'insert-below' | 'replace-all' | 'append') => {
    onInsertContent(content, mode);
    onClose();
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    setCurrentIntent(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl h-[640px] max-h-[90vh] rounded-2xl border border-sloth-border bg-sloth-panel shadow-2xl overflow-hidden">
        {/* Chatbot Top Header */}
        <header className="flex items-center justify-between border-b border-sloth-border px-4 py-3 bg-sloth-surface/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-sloth-text">Sloth AI Chatbot</span>
                <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  Intent-Driven
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-sloth-subtle mt-0.5">
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
                    No model active — Open Model Library
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text cursor-pointer"
              title="Close Chatbot (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Selection Context Chip Banner */}
        {hasSelection && (
          <div className="flex items-center justify-between border-b border-sloth-border/80 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-700 dark:text-purple-300">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={13} className="shrink-0 text-purple-500" />
              <span className="font-semibold shrink-0">Selected Text:</span>
              <span className="truncate italic opacity-90 max-w-[340px]">
                &quot;{selectedText.trim().slice(0, 65)}{selectedText.trim().length > 65 ? '...' : ''}&quot;
              </span>
              <span className="text-[10px] opacity-75 shrink-0">
                ({selectedText.trim().split(/\s+/).length} words)
              </span>
            </div>

            <button
              onClick={() => setUseSelectionContext(!useSelectionContext)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                useSelectionContext
                  ? 'bg-purple-600 text-white'
                  : 'bg-sloth-surface text-sloth-subtle hover:text-sloth-text'
              }`}
              title="Toggle whether Sloth AI attaches this selection to prompts"
            >
              {useSelectionContext ? 'Using Selection' : 'Ignored'}
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-sloth-danger/30 bg-sloth-danger/10 px-3 py-2 text-xs text-sloth-danger">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg">
                <Sparkles size={28} />
              </div>

              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-sloth-text">How can I help with your notes today?</h3>
                <p className="text-xs text-sloth-subtle leading-relaxed">
                  Type whatever you need. Sloth AI uses intent recognition to automatically draft, summarize, fix grammar, extract checklists, or translate.
                </p>
              </div>

              {/* 4 Clean Quick Suggestion Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-lg">
                <button
                  onClick={() => handleSendMessage(hasSelection ? 'Summarize this selection' : 'Summarize active note')}
                  className="flex items-center gap-1.5 rounded-full border border-sloth-border bg-sloth-surface/70 px-3 py-1.5 text-xs text-sloth-text hover:border-purple-500/50 hover:bg-sloth-surface transition cursor-pointer"
                >
                  <span>📝 Summarize</span>
                </button>
                <button
                  onClick={() => handleSendMessage('Extract all action items into a checklist')}
                  className="flex items-center gap-1.5 rounded-full border border-sloth-border bg-sloth-surface/70 px-3 py-1.5 text-xs text-sloth-text hover:border-purple-500/50 hover:bg-sloth-surface transition cursor-pointer"
                >
                  <span>📋 Extract Action Items</span>
                </button>
                <button
                  onClick={() => handleSendMessage('Fix grammar, typos, and spelling')}
                  className="flex items-center gap-1.5 rounded-full border border-sloth-border bg-sloth-surface/70 px-3 py-1.5 text-xs text-sloth-text hover:border-purple-500/50 hover:bg-sloth-surface transition cursor-pointer"
                >
                  <span>✨ Fix Grammar</span>
                </button>
                <button
                  onClick={() => handleSendMessage('Brainstorm 5 ideas')}
                  className="flex items-center gap-1.5 rounded-full border border-sloth-border bg-sloth-surface/70 px-3 py-1.5 text-xs text-sloth-text hover:border-purple-500/50 hover:bg-sloth-surface transition cursor-pointer"
                >
                  <span>⚡ Brainstorm Ideas</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                {msg.role === 'user' ? (
                  /* User Message Bubble */
                  <div className="flex justify-end">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="rounded-2xl rounded-tr-none bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs text-white shadow-md">
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.intentBadge && (
                          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-purple-200">
                            <span className="rounded bg-black/20 px-1.5 py-0.5 font-medium">
                              {msg.intentBadge}
                            </span>
                            <span>{msg.timestamp}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-purple-600 border border-purple-500/30">
                        <User size={13} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message Card */
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2.5 max-w-[92%] w-full">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-sm mt-0.5">
                        <Bot size={14} />
                      </div>

                      <div className="flex-1 space-y-2 rounded-2xl rounded-tl-none border border-sloth-border bg-sloth-surface/40 p-4 shadow-sm">
                        {/* Header with intent and copy */}
                        <div className="flex items-center justify-between border-b border-sloth-border/50 pb-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                            <Wand2 size={13} />
                            <span>{msg.intentBadge || 'Sloth AI Response'}</span>
                          </span>

                          <div className="flex items-center gap-1 text-[11px] text-sloth-subtle">
                            <span>{msg.timestamp}</span>
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="ml-2 flex items-center gap-1 rounded px-2 py-0.5 text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition cursor-pointer"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Markdown Content */}
                        <article className="prose prose-sloth max-w-none text-xs leading-relaxed text-sloth-text">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </article>

                        {/* 1-Click Document Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sloth-border/50">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasSelection && useSelectionContext ? (
                              <button
                                onClick={() => handleInsert(msg.content, 'replace-selection')}
                                className="flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
                              >
                                <Check size={12} />
                                <span>Replace Selection</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInsert(msg.content, 'append')}
                                className="flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
                              >
                                <Check size={12} />
                                <span>Insert into Note</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleInsert(msg.content, 'insert-below')}
                              className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-2.5 py-1 text-xs font-medium text-sloth-text hover:bg-sloth-panel transition cursor-pointer"
                            >
                              <ArrowRight size={12} />
                              <span>Insert Below</span>
                            </button>
                          </div>

                          <button
                            onClick={() => handleSendMessage(msg.content)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface transition cursor-pointer"
                            title="Regenerate"
                          >
                            <RotateCcw size={12} />
                            <span>Try again</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Generating Indicator */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5 max-w-[90%]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-sm animate-pulse">
                  <Sparkles size={14} className="animate-spin duration-1000" />
                </div>
                <div className="rounded-2xl rounded-tl-none border border-sloth-border bg-sloth-surface/40 px-4 py-3 text-xs shadow-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Sloth AI is generating...
                    </span>
                    {currentIntent && (
                      <span className="rounded bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                        {currentIntent.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-sloth-subtle flex items-center gap-1">
                    <RefreshCw size={10} className="animate-spin" />
                    Running locally on your device
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="border-t border-sloth-border p-3 bg-sloth-surface/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="space-y-1.5"
          >
            <div className="relative flex items-center">
              <div className="absolute left-3 text-purple-500">
                <Sparkles size={15} />
              </div>

              <textarea
                ref={inputRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasSelection && useSelectionContext
                    ? 'Ask Sloth AI to edit, summarize, shorten, or format selection...'
                    : 'Ask Sloth AI to write, summarize, brainstorm, or answer anything...'
                }
                disabled={isGenerating}
                className="w-full resize-none rounded-xl border border-sloth-border bg-sloth-panel py-2.5 pl-9 pr-24 text-xs text-sloth-text placeholder:text-sloth-subtle focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none leading-relaxed"
              />

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isGenerating}
                className="absolute right-1.5 flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Send</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-sloth-subtle select-none">
              <span className="flex items-center gap-1">
                <CornerDownLeft size={10} />
                <span>Press Enter to send · Shift+Enter for new line</span>
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                Intent recognized automatically
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

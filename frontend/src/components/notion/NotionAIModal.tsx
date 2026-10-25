import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  Copy,
  FileText,
  RefreshCw,
  RotateCcw,
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

  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex flex-col w-full max-w-xl animate-in zoom-in-95 duration-150 space-y-2">
        {/* Selection Context Tag (if text was highlighted) */}
        {hasSelection && (
          <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs text-purple-600 dark:text-purple-300 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={12} className="shrink-0 text-purple-500" />
              <span className="font-semibold shrink-0">Selected:</span>
              <span className="truncate italic opacity-90 max-w-[320px]">
                &quot;{selectedText.trim().slice(0, 55)}{selectedText.trim().length > 55 ? '...' : ''}&quot;
              </span>
              <span className="text-[10px] opacity-75 shrink-0">
                ({selectedText.trim().split(/\s+/).length} words)
              </span>
            </div>

            <button
              onClick={() => setUseSelectionContext(!useSelectionContext)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded transition ${
                useSelectionContext
                  ? 'bg-purple-600 text-white'
                  : 'bg-sloth-surface text-sloth-subtle hover:text-sloth-text'
              }`}
            >
              {useSelectionContext ? 'Using Context' : 'Ignored'}
            </button>
          </div>
        )}

        {/* Minimal Pill Input (Exact aesthetic from user screenshot) */}
        <div className="group relative flex items-center gap-3 rounded-full border border-sloth-border bg-sloth-panel/95 px-3.5 py-2 shadow-2xl backdrop-blur-xl transition-all hover:border-sloth-border/80 focus-within:border-purple-500/70 focus-within:ring-2 focus-within:ring-purple-500/20">
          {/* Left Avatar / Logo Circle */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sloth-surface border border-sloth-border text-xs shadow-xs">
            <span>🦥</span>
          </div>

          {/* Main Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasSelection && useSelectionContext
                ? 'Edit with AI (e.g. summarize, shorten, fix grammar)...'
                : 'Edit with AI'
            }
            disabled={isGenerating}
            className="flex-1 bg-transparent text-xs text-sloth-text outline-none placeholder:text-sloth-subtle leading-relaxed"
          />

          {/* Model Status Pill or Open Library */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-sloth-subtle">
            {activeModelName ? (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeModelName.split('/')[1] || activeModelName}
              </span>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenModelLibrary?.();
                }}
                className="text-amber-500 hover:text-amber-400 underline font-medium cursor-pointer"
              >
                No model
              </button>
            )}
          </div>

          {/* Right Circular Up-Arrow Button (↑) */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isGenerating}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
              inputPrompt.trim() && !isGenerating
                ? 'bg-purple-600 text-white shadow-sm hover:bg-purple-500 scale-105'
                : 'bg-sloth-surface border border-sloth-border/60 text-sloth-subtle opacity-40 hover:opacity-70'
            }`}
            title="Submit with AI (Enter)"
          >
            {isGenerating ? (
              <RefreshCw size={12} className="animate-spin text-purple-400" />
            ) : (
              <ArrowUp size={13} strokeWidth={2.5} />
            )}
          </button>

          {/* Small Close Button */}
          <button
            onClick={onClose}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface transition cursor-pointer"
            title="Close (Esc)"
          >
            <X size={12} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center justify-between rounded-xl border border-sloth-danger/30 bg-sloth-danger/10 px-3 py-2 text-xs text-sloth-danger animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={13} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="hover:opacity-80">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Empty State Suggestion Chips (Minimal inspiration, not crowded) */}
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] select-none animate-in fade-in">
            <button
              onClick={() => handleSendMessage(hasSelection ? 'Summarize this selection' : 'Summarize note')}
              className="flex items-center gap-1 rounded-full border border-sloth-border/80 bg-sloth-panel/80 px-2.5 py-1 text-sloth-subtle hover:text-sloth-text hover:border-purple-500/40 hover:bg-sloth-surface transition cursor-pointer"
            >
              <span>📝 Summarize</span>
            </button>
            <button
              onClick={() => handleSendMessage('Extract all action items')}
              className="flex items-center gap-1 rounded-full border border-sloth-border/80 bg-sloth-panel/80 px-2.5 py-1 text-sloth-subtle hover:text-sloth-text hover:border-purple-500/40 hover:bg-sloth-surface transition cursor-pointer"
            >
              <span>📋 Action items</span>
            </button>
            <button
              onClick={() => handleSendMessage('Fix grammar and spelling')}
              className="flex items-center gap-1 rounded-full border border-sloth-border/80 bg-sloth-panel/80 px-2.5 py-1 text-sloth-subtle hover:text-sloth-text hover:border-purple-500/40 hover:bg-sloth-surface transition cursor-pointer"
            >
              <span>✨ Fix grammar</span>
            </button>
            <button
              onClick={() => handleSendMessage('Brainstorm 5 ideas')}
              className="flex items-center gap-1 rounded-full border border-sloth-border/80 bg-sloth-panel/80 px-2.5 py-1 text-sloth-subtle hover:text-sloth-text hover:border-purple-500/40 hover:bg-sloth-surface transition cursor-pointer"
            >
              <span>💡 Brainstorm</span>
            </button>
          </div>
        )}

        {/* Conversation Responses Card */}
        {(messages.length > 0 || isGenerating) && (
          <div className="flex flex-col max-h-[460px] overflow-hidden rounded-2xl border border-sloth-border bg-sloth-panel/95 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Conversation Header with Clear */}
            <div className="flex items-center justify-between border-b border-sloth-border/70 px-4 py-2 bg-sloth-surface/40 text-[11px] text-sloth-subtle">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-purple-500" />
                <span className="font-semibold text-sloth-text">Sloth AI Assistant</span>
                {currentIntent && (
                  <span className="rounded bg-purple-500/15 px-1.5 py-0.2 text-[9px] font-medium text-purple-600 dark:text-purple-400">
                    {currentIntent.badge}
                  </span>
                )}
              </div>

              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1 text-[10px] text-sloth-subtle hover:text-sloth-text transition cursor-pointer"
                  title="Clear chat"
                >
                  <Trash2 size={11} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="rounded-2xl rounded-tr-none bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs text-white shadow-sm">
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          {msg.intentBadge && (
                            <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] text-purple-200">
                              <span>{msg.intentBadge}</span>
                              <span>•</span>
                              <span>{msg.timestamp}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-purple-600 border border-purple-500/30 text-[10px]">
                          <User size={12} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2.5 max-w-[95%] w-full">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-xs mt-0.5">
                          <Bot size={13} />
                        </div>

                        <div className="flex-1 space-y-2 rounded-2xl rounded-tl-none border border-sloth-border bg-sloth-surface/40 p-3.5 shadow-xs">
                          {/* Top badge and copy */}
                          <div className="flex items-center justify-between border-b border-sloth-border/50 pb-1.5">
                            <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                              <Wand2 size={12} />
                              <span>{msg.intentBadge || 'Response'}</span>
                            </span>

                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text transition cursor-pointer"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <Check size={11} className="text-emerald-500" />
                              ) : (
                                <Copy size={11} />
                              )}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          {/* Rendered Markdown */}
                          <article className="prose prose-sloth max-w-none text-xs leading-relaxed text-sloth-text">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </article>

                          {/* Quick 1-Click Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-sloth-border/50">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {hasSelection && useSelectionContext ? (
                                <button
                                  onClick={() => handleInsert(msg.content, 'replace-selection')}
                                  className="flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                                >
                                  <Check size={11} />
                                  <span>Replace Selection</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleInsert(msg.content, 'append')}
                                  className="flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                                >
                                  <Check size={11} />
                                  <span>Insert into Note</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleInsert(msg.content, 'insert-below')}
                                className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-2 py-1 text-xs font-medium text-sloth-text hover:bg-sloth-panel transition cursor-pointer"
                              >
                                <ArrowRight size={11} />
                                <span>Insert Below</span>
                              </button>
                            </div>

                            <button
                              onClick={() => handleSendMessage(msg.content)}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle hover:text-sloth-text hover:bg-sloth-surface transition cursor-pointer"
                              title="Try again"
                            >
                              <RotateCcw size={11} />
                              <span>Try again</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Generating Animation */}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5 max-w-[90%]">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-xs animate-pulse">
                      <Sparkles size={13} className="animate-spin duration-1000" />
                    </div>
                    <div className="rounded-2xl rounded-tl-none border border-sloth-border bg-sloth-surface/40 px-3.5 py-2.5 text-xs shadow-xs space-y-1">
                      <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <RefreshCw size={11} className="animate-spin" />
                        Generating response...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

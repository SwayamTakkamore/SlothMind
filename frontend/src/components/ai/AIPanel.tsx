import {
  ArrowDownToLine,
  BookOpen,
  Calendar,
  CheckSquare,
  Copy,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  PenTool,
  Save,
  Smile,
  Sparkles,
  Trash2,
  Type,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AIChatMessage } from './AIChatMessage';
import { AIPromptInput } from './AIPromptInput';
import { api } from '../../services/api';
import type { NotionAITask, NotionAITemplate, NotionAITone } from '../../types';

interface Citation {
  id: number;
  path: string;
  title: string;
  section: string | null;
  excerpt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  taskLabel?: string;
}

interface AIStatus {
  status?: string;
  provider?: string;
  device?: string;
  gpu?: string;
  model?: string | null;
  active_model?: string | null;
}

interface AIPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeNotePath: string | null;
  activeNoteContent: string;
  onSaveAsNote?: (content: string) => void;
  onOpenNote?: (path: string) => void;
  onInsertContent?: (content: string, mode: 'replace-selection' | 'insert-below' | 'replace-all' | 'append') => void;
  onOpenModelLibrary?: () => void;
  activeModelName?: string | null;
}

export function AIPanel({
  isOpen,
  onToggle,
  activeNotePath: _activeNotePath,
  activeNoteContent,
  onSaveAsNote,
  onOpenNote: _onOpenNote,
  onInsertContent,
  onOpenModelLibrary,
  activeModelName,
}: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [mode, setMode] = useState<'notion' | 'rag' | 'chat'>('notion');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ai/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAiStatus(data))
      .catch(() => setAiStatus(null));
  }, [activeModelName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentActiveModel = (activeModelName !== undefined && activeModelName !== null) ? activeModelName : (aiStatus?.active_model || aiStatus?.model || null);

  const runNotionTask = useCallback(
    async (
      task: NotionAITask | string,
      options?: {
        prompt?: string;
        template_type?: NotionAITemplate | string;
        tone?: NotionAITone | string;
        target_language?: string;
        label?: string;
      }
    ) => {
      if (!currentActiveModel) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'No AI model is currently active. Please open the Model Library to activate a model.',
          },
        ]);
        return;
      }

      const label = options?.label || options?.template_type || task;
      const targetText = activeNoteContent.trim();
      const userMsg: Message = {
        role: 'user',
        content: options?.prompt ? `Sloth AI [${label}]: ${options.prompt}` : `Sloth AI: ${label}`,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);

      try {
        const res = await api.notionAI({
          task,
          text: targetText,
          prompt: options?.prompt,
          template_type: options?.template_type,
          tone: options?.tone,
          target_language: options?.target_language,
          max_tokens: 768,
        });

        if (res.result) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: res.result,
              taskLabel: label,
            },
          ]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Sloth AI generation failed';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${msg}`,
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [currentActiveModel, activeNoteContent]
  );

  const runTask = runNotionTask;

  const handleSend = useCallback(
    async (content: string) => {
      if (!currentActiveModel) {
        setMessages((prev) => [
          ...prev,
          { role: 'user', content },
          {
            role: 'assistant',
            content:
              'No AI model is currently active. Please open the Model Library and activate a Gemma or local model to start.',
          },
        ]);
        return;
      }

      if (mode === 'notion') {
        await runNotionTask('draft', { prompt: content, label: 'Custom' });
        return;
      }

      const userMessage: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const endpoint = mode === 'rag' ? '/api/ai/ask' : '/api/ai/chat';
        const body =
          mode === 'rag' ? { question: content } : { messages: [...messages, userMessage] };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errMsg = errorData?.detail || errorData?.error || 'Failed to get response';
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let citations: Citation[] = [];

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;
                try {
                  const parsed = JSON.parse(data) as {
                    content?: string;
                    type?: string;
                    citations?: Citation[];
                  };
                  if (parsed.type === 'citations' && parsed.citations) {
                    citations = parsed.citations;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: assistantContent,
                        citations,
                      };
                      return newMessages;
                    });
                  } else if (parsed.content) {
                    assistantContent += parsed.content;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: assistantContent,
                        citations,
                      };
                      return newMessages;
                    });
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Error: ${error.message}` },
          ]);
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [messages, mode, currentActiveModel, runNotionTask]
  );

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleInsert = (content: string) => {
    if (onInsertContent) {
      onInsertContent(content, 'append');
    }
  };

  const handleSaveAsNote = useCallback(
    (content: string) => {
      if (onSaveAsNote) {
        onSaveAsNote(content);
      } else {
        alert('Save as note functionality - create a new note with this content');
      }
    },
    [onSaveAsNote]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-lg border border-r-0 border-sloth-border bg-sloth-panel p-2 text-sloth-subtle transition hover:text-sloth-text hover:bg-sloth-surface"
        title="Open AI Panel"
      >
        <Sparkles size={16} />
      </button>
    );
  }

  const modelShortName = currentActiveModel
    ? currentActiveModel.split('/')[1] || currentActiveModel
    : null;

  return (
    <aside className="relative flex h-full w-[330px] flex-col border-l border-sloth-border bg-sloth-panel select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sloth-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-purple-600 to-indigo-500 text-white">
            <Sparkles size={12} />
          </div>
          <span className="text-xs font-semibold text-sloth-text">Sloth & Local AI</span>
          <button
            onClick={onOpenModelLibrary}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition cursor-pointer ${
              currentActiveModel
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
            }`}
            title={`Active: ${currentActiveModel ?? 'None (Click to choose model)'}\nClick to open Model Library`}
          >
            {currentActiveModel ? modelShortName : 'No Model'}
          </button>
        </div>
        <button
          onClick={onToggle}
          className="rounded-lg p-1 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title="Close panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1 border-b border-sloth-border p-1 bg-sloth-surface/30">
        <button
          onClick={() => setMode('notion')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ${
            mode === 'notion'
              ? 'bg-sloth-panel text-sloth-text shadow-sm border border-sloth-border/50 font-bold'
              : 'text-sloth-subtle hover:text-sloth-text'
          }`}
          title="Sloth AI writing, editing, and task automation suite"
        >
          <Sparkles size={12} className={mode === 'notion' ? 'text-purple-500' : ''} />
          Sloth AI
        </button>
        <button
          onClick={() => setMode('rag')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ${
            mode === 'rag'
              ? 'bg-sloth-panel text-sloth-text shadow-sm border border-sloth-border/50'
              : 'text-sloth-subtle hover:text-sloth-text'
          }`}
          title="Ask questions grounded strictly in your vault notes"
        >
          <BookOpen size={12} className={mode === 'rag' ? 'text-sloth-accent' : ''} />
          Vault Q&A
        </button>
        <button
          onClick={() => setMode('chat')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ${
            mode === 'chat'
              ? 'bg-sloth-panel text-sloth-text shadow-sm border border-sloth-border/50'
              : 'text-sloth-subtle hover:text-sloth-text'
          }`}
          title="General conversation with local model"
        >
          <MessageSquare size={12} className={mode === 'chat' ? 'text-sloth-accent' : ''} />
          Chat
        </button>
      </div>

      {/* Sloth AI Quick Actions Ribbon (Only when Notion AI tab is active) */}
      {mode === 'notion' && (
        <div className="border-b border-sloth-border bg-sloth-surface/20 p-2 space-y-1.5">
          <p className="text-[10px] font-bold text-sloth-subtle uppercase tracking-wider">
            1-Click AI Actions:
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => runTask('action-items')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-40"
              title="Extract tasks from active note as checklist"
            >
              <CheckSquare size={11} />
              <span>Action Items</span>
            </button>
            <button
              onClick={() => runTask('summarize')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-2 py-1 text-[11px] text-sloth-subtle hover:text-sloth-text transition disabled:opacity-40"
              title="Summarize active note"
            >
              <FileText size={11} />
              <span>Summarize</span>
            </button>
            <button
              onClick={() => runTask('key-takeaways')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-2 py-1 text-[11px] text-sloth-subtle hover:text-sloth-text transition disabled:opacity-40"
              title="Extract key takeaways"
            >
              <Zap size={11} />
              <span>Takeaways</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 pt-0.5">
            <button
              onClick={() => runTask('improve')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center justify-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-1.5 py-0.5 text-[10px] text-sloth-subtle hover:text-sloth-text transition disabled:opacity-40"
              title="Improve writing"
            >
              <Wand2 size={10} className="text-purple-500" />
              <span>Improve</span>
            </button>
            <button
              onClick={() => runTask('fix-grammar')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center justify-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-1.5 py-0.5 text-[10px] text-sloth-subtle hover:text-sloth-text transition disabled:opacity-40"
              title="Fix grammar & typos"
            >
              <Type size={10} className="text-emerald-500" />
              <span>Grammar</span>
            </button>
            <button
              onClick={() => runTask('simplify')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center justify-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-1.5 py-0.5 text-[10px] text-sloth-subtle hover:text-sloth-text transition disabled:opacity-40"
              title="Simplify language"
            >
              <Smile size={10} className="text-amber-500" />
              <span>Simplify</span>
            </button>
            <button
              onClick={() => runTask('continue')}
              disabled={isGenerating || !activeNoteContent}
              className="flex items-center justify-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface px-1.5 py-0.5 text-[10px] text-sloth-subtle hover:text-sloth-text transition disabled:opacity-40"
              title="Continue writing"
            >
              <PenTool size={10} className="text-blue-500" />
              <span>Continue</span>
            </button>
          </div>

          <div className="flex gap-1 pt-1">
            <button
              onClick={() => runTask('draft', { template_type: 'brainstorm', prompt: 'New features and roadmap' })}
              disabled={isGenerating}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-40"
            >
              <Zap size={10} />
              <span>Brainstorm</span>
            </button>
            <button
              onClick={() => runTask('draft', { template_type: 'blog-post', prompt: 'Notes and insights from this week' })}
              disabled={isGenerating}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-40"
            >
              <FileText size={10} />
              <span>Blog Post</span>
            </button>
            <button
              onClick={() => runTask('draft', { template_type: 'prd', prompt: 'Product feature spec' })}
              disabled={isGenerating}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-40"
            >
              <FileSpreadsheet size={10} />
              <span>PRD</span>
            </button>
            <button
              onClick={() => runTask('draft', { template_type: 'meeting-agenda', prompt: 'Team sync' })}
              disabled={isGenerating}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-40"
            >
              <Calendar size={10} />
              <span>Agenda</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Bar for clear / status */}
      <div className="flex items-center justify-between border-b border-sloth-border px-3 py-1 text-[11px] text-sloth-subtle">
        <span>{mode === 'notion' ? 'Sloth AI Studio' : mode === 'rag' ? 'Vault Q&A' : 'Chat'}</span>
        <button
          onClick={clearChat}
          className="flex items-center gap-1 rounded p-1 hover:text-sloth-text transition"
          title="Clear messages"
        >
          <Trash2 size={12} />
          <span>Clear</span>
        </button>
      </div>

      {/* No model loaded banner */}
      {!currentActiveModel && (
        <div className="m-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-500">
            <Sparkles size={13} />
            <span>No Model Active</span>
          </div>
          <p className="mt-1 text-[11px] text-sloth-subtle leading-relaxed">
            No model is selected by default. Open the Model Library to activate a Gemma or local model.
          </p>
          {onOpenModelLibrary && (
            <button
              onClick={onOpenModelLibrary}
              className="mt-2 w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white py-1.5 px-3 font-semibold text-xs shadow-sm transition"
            >
              Open Model Library
            </button>
          )}
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 select-text space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
              <Sparkles size={18} />
            </div>
            <p className="text-xs font-bold text-sloth-text mt-1">
              {mode === 'notion'
                ? 'Sloth AI Workspace'
                : mode === 'rag'
                ? 'Ask Your Vault'
                : 'Local AI Chat'}
            </p>
            <p className="text-[11px] text-sloth-subtle max-w-[210px] leading-relaxed">
              {mode === 'notion'
                ? 'Draft blogs, PRDs, extract action items, fix grammar, and summarize notes on your RTX 3050 GPU.'
                : mode === 'rag'
                ? 'Answers are grounded strictly in your notes with source citations.'
                : 'Free-form offline chat powered by local Hugging Face models.'}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="space-y-1">
              <AIChatMessage role={msg.role} content={msg.content} />
              {msg.role === 'assistant' && msg.content && !isGenerating && (
                <div className="flex items-center justify-end gap-1 text-[10px] text-sloth-subtle pt-0.5">
                  <button
                    onClick={() => handleCopyMessage(msg.content, idx)}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-sloth-surface hover:text-sloth-text transition"
                    title="Copy to clipboard"
                  >
                    <Copy size={10} />
                    <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                  {onInsertContent && (
                    <button
                      onClick={() => handleInsert(msg.content)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 transition font-medium"
                      title="Insert content into active note"
                    >
                      <ArrowDownToLine size={10} />
                      <span>Insert</span>
                    </button>
                  )}
                  {onSaveAsNote && (
                    <button
                      onClick={() => handleSaveAsNote(msg.content)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-sloth-surface hover:text-sloth-text transition"
                      title="Save response to a new note"
                    >
                      <Save size={10} />
                      <span>Save as Note</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-sloth-border p-3">
        <AIPromptInput
          onSend={handleSend}
          onCancel={handleCancel}
          isGenerating={isGenerating}
        />
      </div>
    </aside>
  );
}

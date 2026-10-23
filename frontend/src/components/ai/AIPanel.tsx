import { BookOpen, FileText, MessageSquare, RefreshCw, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AIChatMessage } from './AIChatMessage';
import { AIPromptInput } from './AIPromptInput';

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
}

interface AIStatus {
  status?: string;
  provider?: string;
  device?: string;
  gpu?: string;
  model?: string | null;
}

interface AIPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeNotePath: string | null;
  activeNoteContent: string;
  onSaveAsNote?: (content: string) => void;
  onOpenNote?: (path: string) => void;
  onOpenModelLibrary?: () => void;
  activeModelName?: string | null;
}

export function AIPanel({
  isOpen,
  onToggle,
  activeNotePath,
  activeNoteContent,
  onSaveAsNote,
  onOpenNote: _onOpenNote,
  onOpenModelLibrary,
  activeModelName,
}: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [mode, setMode] = useState<'rag' | 'chat'>('rag');
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

  const currentActiveModel = activeModelName !== undefined ? activeModelName : aiStatus?.model;

  const handleSend = useCallback(async (content: string) => {
    if (!currentActiveModel) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content },
        {
          role: 'assistant',
          content: 'No AI model is currently active. Please open the Model Library and activate a Gemma or local model to start chatting.',
        },
      ]);
      return;
    }

    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const endpoint = mode === 'rag' ? '/api/ai/ask' : '/api/ai/chat';
      const body = mode === 'rag' 
        ? { question: content }
        : { messages: [...messages, userMessage] };

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
                const parsed = JSON.parse(data) as { content?: string; type?: string; citations?: Citation[] };
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
  }, [messages, mode, currentActiveModel]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleSummarizeNote = useCallback(async () => {
    if (!activeNoteContent) return;
    if (!currentActiveModel) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'No AI model is currently active. Please activate a model in the Model Library to summarize.',
        },
      ]);
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: activeNoteContent }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `**Summary of ${activeNotePath ?? 'Note'}:**\n\n${data.summary}` },
        ]);
      } else {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || err?.error || 'Summarization failed');
      }
    } catch (error) {
      console.error('Summarize failed', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Summarize error: ${error instanceof Error ? error.message : 'Failed'}` },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [activeNoteContent, activeNotePath, currentActiveModel]);

  const handleRewrite = useCallback(async (instruction: string) => {
    const selection = window.getSelection()?.toString();
    const textToRewrite = selection || activeNoteContent;
    if (!textToRewrite) return;
    if (!currentActiveModel) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'No AI model is currently active. Please activate a model in the Model Library to rewrite text.',
        },
      ]);
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToRewrite, instruction }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.rewritten },
        ]);
      } else {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || err?.error || 'Rewrite failed');
      }
    } catch (error) {
      console.error('Rewrite failed', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Rewrite error: ${error instanceof Error ? error.message : 'Failed'}` },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [activeNoteContent, currentActiveModel]);

  const handleSaveAsNote = useCallback((content: string) => {
    if (onSaveAsNote) {
      onSaveAsNote(content);
    } else {
      alert('Save as note functionality - create a new note with this content');
    }
  }, [onSaveAsNote]);

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

  const modelShortName = currentActiveModel ? currentActiveModel.split('/')[1] || currentActiveModel : null;

  return (
    <aside className="relative flex h-full w-[320px] flex-col border-l border-sloth-border bg-sloth-panel select-none">
      <div className="flex items-center justify-between border-b border-sloth-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-sloth-accent" />
          <span className="text-xs font-semibold text-sloth-text">AI Assistant</span>
          {/* Clickable model badge that opens model library */}
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

      <div className="flex gap-1 border-b border-sloth-border p-1 bg-sloth-surface/30">
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
          General Chat
        </button>
      </div>

      <div className="flex gap-1 border-b border-sloth-border px-2 py-1.5">
        <button
          onClick={handleSummarizeNote}
          disabled={!activeNoteContent || isGenerating}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
          title="Summarize active note"
        >
          <FileText size={12} />
          Summarize
        </button>
        <button
          onClick={() => handleRewrite('simplify')}
          disabled={isGenerating}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
          title="Rewrite selected text"
        >
          <RefreshCw size={12} />
          Rewrite
        </button>
        <button
          onClick={clearChat}
          className="rounded-lg p-1 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title="Clear chat history"
        >
          <Trash2 size={13} />
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

      <div className="flex-1 overflow-y-auto p-3 select-text">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sloth-accent/10 text-sloth-accent">
              <Sparkles size={18} />
            </div>
            <p className="text-xs font-medium text-sloth-text mt-1">
              {mode === 'rag' ? 'Ask Your Vault' : 'Local AI Chat'}
            </p>
            <p className="text-[11px] text-sloth-subtle max-w-[200px] leading-relaxed">
              {mode === 'rag'
                ? 'Answers are grounded strictly in your notes with source citations.'
                : 'Free-form offline chat powered by local Hugging Face models.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <AIChatMessage role={msg.role} content={msg.content} />
                {msg.role === 'assistant' && msg.content && !isGenerating && (
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={() => handleSaveAsNote(msg.content)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
                      title="Save response to a new note"
                    >
                      <Save size={10} />
                      Save as Note
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

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

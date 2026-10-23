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
}

interface AIPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeNotePath: string | null;
  activeNoteContent: string;
  onSaveAsNote?: (content: string) => void;
  onOpenNote?: (path: string) => void;
}

export function AIPanel({ isOpen, onToggle, activeNotePath, activeNoteContent, onSaveAsNote, onOpenNote }: AIPanelProps) {
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (content: string) => {
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
        throw new Error('Failed to get response');
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
          { role: 'assistant', content: 'Error: Failed to generate response. Make sure the AI service is running.' },
        ]);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [messages, mode]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleSummarizeNote = useCallback(async () => {
    if (!activeNoteContent) return;
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
          { role: 'user', content: `Summarize: ${activeNotePath ? activeNotePath.replace(/\.md$/i, '') : 'current note'}` },
          { role: 'assistant', content: data.summary },
        ]);
      }
    } catch (error) {
      console.error('Summarize failed', error);
    } finally {
      setIsGenerating(false);
    }
  }, [activeNoteContent, activeNotePath]);

  const handleRewrite = useCallback(async (instruction: string) => {
    const selection = window.getSelection()?.toString();
    if (!selection) {
      alert('Please select text in the editor to rewrite');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection, instruction }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: `Rewrite (${instruction}): ${selection.substring(0, 40)}...` },
          { role: 'assistant', content: data.rewritten },
        ]);
      }
    } catch (error) {
      console.error('Rewrite failed', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

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

  return (
    <aside className="relative flex h-full w-[320px] flex-col border-l border-sloth-border bg-sloth-panel select-none">
      <div className="flex items-center justify-between border-b border-sloth-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-sloth-accent" />
          <span className="text-xs font-semibold text-sloth-text">AI Assistant</span>
          {/* Clean minimal badge with full hardware details on hover */}
          <span
            className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 cursor-help"
            title={`Offline Hugging Face Local AI\nDevice: ${aiStatus?.device ?? 'CUDA'}\nGPU: ${aiStatus?.gpu ?? 'NVIDIA RTX 3050'}\nModel: SmolLM-135M-Instruct`}
          >
            Local AI
          </span>
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
                : 'Free-form offline chat powered by SmolLM on your RTX 3050 GPU.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <AIChatMessage role={msg.role} content={msg.content} />
                {msg.role === 'assistant' && msg.content && (
                  <>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="ml-7 mt-2 space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-sloth-subtle">
                          Sources ({msg.citations.length})
                        </p>
                        {msg.citations.map((citation) => (
                          <button
                            key={citation.id}
                            onClick={() => {
                              if (onOpenNote) {
                                onOpenNote(citation.path);
                              }
                            }}
                            className="group flex w-full items-center gap-2 rounded-lg border border-sloth-border/50 bg-sloth-surface/40 p-1.5 text-left text-xs transition hover:bg-sloth-surface hover:border-sloth-accent/40"
                            title={`Open Note: ${citation.path}\n\nSection: ${citation.section ?? 'Top'}\nExcerpt: ${citation.excerpt}`}
                          >
                            <span className="shrink-0 rounded bg-sloth-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-sloth-accent">
                              [{citation.id}]
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sloth-text truncate text-xs">
                                {citation.title}
                                {citation.section && (
                                  <span className="text-sloth-subtle font-normal text-[11px]"> • {citation.section}</span>
                                )}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleSaveAsNote(msg.content)}
                      className="ml-7 mt-1.5 flex items-center gap-1 text-[11px] text-sloth-accent transition hover:underline"
                    >
                      <Save size={11} />
                      Save as note
                    </button>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <AIPromptInput onSend={handleSend} disabled={!aiStatus} isGenerating={isGenerating} onCancel={handleCancel} />
    </aside>
  );
}

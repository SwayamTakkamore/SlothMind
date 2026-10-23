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
  const [mode, setMode] = useState<'chat' | 'rag'>('rag');
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
          { role: 'user', content: `Summarize: ${activeNotePath || 'current note'}` },
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
          { role: 'user', content: `Rewrite (${instruction}): ${selection.substring(0, 50)}...` },
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
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-md border border-r-0 border-sloth-border bg-sloth-panel p-2 text-sloth-subtle transition hover:text-sloth-text"
        title="Open AI Panel"
      >
        <Sparkles size={16} />
      </button>
    );
  }

  return (
    <aside className="relative flex h-full w-[320px] flex-col border-l border-sloth-border bg-sloth-panel">
      <div className="flex items-center justify-between border-b border-sloth-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-sloth-accent" />
          <span className="text-sm font-medium">AI Assistant</span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
            Hugging Face Local
          </span>
        </div>
        <button
          onClick={onToggle}
          className="rounded p-1 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-1 border-b border-sloth-border p-1">
        <button
          onClick={() => setMode('rag')}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition ${
            mode === 'rag'
              ? 'bg-sloth-accent text-white'
              : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
          }`}
          title="Ask Your Vault"
        >
          <BookOpen size={12} />
          Vault Q&A
        </button>
        <button
          onClick={() => setMode('chat')}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition ${
            mode === 'chat'
              ? 'bg-sloth-accent text-white'
              : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
          }`}
          title="General Chat"
        >
          <MessageSquare size={12} />
          General Chat
        </button>
      </div>

      <div className="flex gap-1 border-b border-sloth-border p-2">
        <button
          onClick={handleSummarizeNote}
          disabled={!activeNoteContent || isGenerating}
          className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
          title="Summarize current note"
        >
          <FileText size={12} />
          Summarize
        </button>
        <button
          onClick={() => handleRewrite('simplify')}
          disabled={isGenerating}
          className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text disabled:opacity-40"
          title="Rewrite selection"
        >
          <RefreshCw size={12} />
          Rewrite
        </button>
        <button
          onClick={clearChat}
          className="rounded-md p-1 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
          title="Clear chat"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Sparkles size={24} className="text-sloth-subtle" />
            <p className="text-sm text-sloth-subtle">Start a conversation or use actions above</p>
            {aiStatus && (
              <p className="text-xs text-sloth-subtle">
                {aiStatus.device?.includes('cuda') ? `GPU: ${aiStatus.gpu}` : 'Running on CPU'}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <AIChatMessage role={msg.role} content={msg.content} />
                {msg.role === 'assistant' && msg.content && (
                  <>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="ml-8 mt-2 space-y-1">
                        <p className="text-xs text-sloth-subtle">Sources:</p>
                        {msg.citations.map((citation) => (
                          <button
                            key={citation.id}
                            onClick={() => {
                              if (onOpenNote) {
                                onOpenNote(citation.path);
                              }
                            }}
                            className="flex w-full items-start gap-2 rounded-md bg-sloth-surface p-2 text-left text-xs transition hover:bg-sloth-border"
                            title={`Open ${citation.path}`}
                          >
                            <span className="rounded bg-sloth-accent/20 px-1.5 py-0.5 text-sloth-accent">
                              [{citation.id}]
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sloth-text truncate">{citation.title}</p>
                              {citation.section && (
                                <p className="text-sloth-subtle truncate">{citation.section}</p>
                              )}
                              <p className="text-sloth-subtle truncate">{citation.path}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleSaveAsNote(msg.content)}
                      className="ml-8 mt-1 flex items-center gap-1 text-xs text-sloth-accent transition hover:underline"
                    >
                      <Save size={10} />
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

import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Strips outer markdown code block fences if the model wrapped its entire response
 * in ```markdown\n...\n``` or ```\n...\n```
 */
function cleanMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (match) {
    return match[1].trim();
  }
  return text;
}

export function AIChatMessage({ role, content }: AIChatMessageProps) {
  const displayContent = role === 'assistant' ? cleanMarkdownFences(content) : content;

  return (
    <div className={`flex gap-2 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {role === 'assistant' && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sloth-accent/20 mt-1">
          <Bot size={13} className="text-sloth-accent" />
        </div>
      )}
      <div
        className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
          role === 'user'
            ? 'max-w-[85%] bg-sloth-accent text-white shadow-sm'
            : 'flex-1 min-w-0 border border-sloth-border/80 bg-sloth-surface/70 text-sloth-text shadow-sm'
        }`}
      >
        {role === 'user' ? (
          <div className="whitespace-pre-wrap break-words">{displayContent}</div>
        ) : (
          <article className="prose prose-xs max-w-none text-sloth-text select-text prose-headings:text-sloth-text prose-headings:font-bold prose-headings:my-2 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-sloth-text prose-code:bg-sloth-panel prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px] prose-pre:bg-sloth-panel prose-pre:border prose-pre:border-sloth-border prose-pre:p-2 prose-pre:rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
          </article>
        )}
      </div>
      {role === 'user' && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sloth-border mt-1">
          <User size={13} className="text-sloth-text" />
        </div>
      )}
    </div>
  );
}

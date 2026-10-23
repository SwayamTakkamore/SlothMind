import { User, Bot } from 'lucide-react';

interface AIChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatMessage({ role, content }: AIChatMessageProps) {
  return (
    <div className={`flex gap-2 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {role === 'assistant' && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sloth-accent/20">
          <Bot size={14} className="text-sloth-accent" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          role === 'user'
            ? 'bg-sloth-accent text-white'
            : 'bg-sloth-surface text-sloth-text'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{content}</div>
      </div>
      {role === 'user' && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sloth-border">
          <User size={14} className="text-sloth-text" />
        </div>
      )}
    </div>
  );
}

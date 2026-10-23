import { Send, Square } from 'lucide-react';
import { useState } from 'react';

interface AIPromptInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onCancel?: () => void;
}

export function AIPromptInput({ onSend, disabled, isGenerating, onCancel }: AIPromptInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && !isGenerating) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-sloth-border p-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask something..."
        disabled={disabled || isGenerating}
        className="flex-1 rounded-md border border-sloth-border bg-sloth-bg px-2 py-1.5 text-sm text-sloth-text placeholder:text-sloth-subtle focus:border-sloth-accent focus:outline-none disabled:opacity-40"
      />
      {isGenerating ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-red-500/20 p-1.5 text-red-400 transition hover:bg-red-500/30"
          title="Cancel generation"
        >
          <Square size={16} />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="rounded-md bg-sloth-accent p-1.5 text-white transition hover:bg-sloth-accent/90 disabled:opacity-40"
          title="Send message"
        >
          <Send size={16} />
        </button>
      )}
    </form>
  );
}

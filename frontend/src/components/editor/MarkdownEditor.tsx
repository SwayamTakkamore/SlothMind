import { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NotionAIFloatingToolbar } from '../notion/NotionAIFloatingToolbar';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview: boolean;
  onOpenNotionAI?: (selectedText?: string) => void;
  onQuickNotionAction?: (action: string, selectedText: string) => void;
}

export function MarkdownEditor({
  value,
  onChange,
  preview,
  onOpenNotionAI,
  onQuickNotionAction,
}: MarkdownEditorProps) {
  const [selectedText, setSelectedText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSelect = useCallback(() => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (start !== end) {
      setSelectedText(textareaRef.current.value.slice(start, end));
    } else {
      setSelectedText('');
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+J or Cmd+J opens Notion AI
    if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      onOpenNotionAI?.(selectedText);
      return;
    }

    // Typing /ai triggers Notion AI modal
    if (e.key === 'Enter') {
      const target = e.currentTarget;
      const cursorPos = target.selectionStart;
      const textBeforeCursor = target.value.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      if (currentLine.trim() === '/ai') {
        e.preventDefault();
        // Remove /ai from the text
        const newText =
          target.value.slice(0, cursorPos - currentLine.length) +
          target.value.slice(cursorPos);
        onChange(newText);
        onOpenNotionAI?.('');
      }
    }
  };

  if (preview) {
    return (
      <div className="h-full overflow-y-auto px-10 py-8">
        <article className="prose prose-sloth mx-auto max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {value || '*Nothing to preview yet.*'}
          </ReactMarkdown>
        </article>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <NotionAIFloatingToolbar
        visible={selectedText.trim().length > 0}
        onAskAI={() => onOpenNotionAI?.(selectedText)}
        onQuickAction={(action) => onQuickNotionAction?.(action, selectedText)}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onMouseUp={handleSelect}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="h-full w-full resize-none bg-transparent px-10 py-8 font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
        placeholder="# Start writing in Markdown... (Type /ai or press Ctrl+J to summon Notion AI)"
      />
    </div>
  );
}

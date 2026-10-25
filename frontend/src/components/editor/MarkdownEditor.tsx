import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Code,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Sparkles,
  Strikethrough,
  Terminal,
} from 'lucide-react';
import { NotionAIFloatingToolbar } from '../notion/NotionAIFloatingToolbar';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview: boolean;
  onOpenNotionAI?: (selectedText?: string) => void;
  onQuickNotionAction?: (action: string, selectedText: string) => void;
}

type EditorInstance = ReturnType<typeof useEditor>;

function getEditorMarkdown(editorInstance: EditorInstance): string {
  if (!editorInstance) return '';
  const storage = editorInstance.storage as unknown as Record<string, { getMarkdown?: () => string }>;
  return storage.markdown?.getMarkdown?.() ?? '';
}

export function MarkdownEditor({
  value,
  onChange,
  preview,
  onOpenNotionAI,
  onQuickNotionAction,
}: MarkdownEditorProps) {
  const [selectedText, setSelectedText] = useState('');
  const [editorMode, setEditorMode] = useState<'dynamic' | 'source'>('dynamic');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingFromExternal = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Type '#' for Heading 1, '##' for Heading 2, or press Ctrl+J / type /ai for Notion AI...",
        emptyEditorClass: 'is-editor-empty',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-sloth max-w-none focus:outline-none min-h-full px-10 py-6 font-sans text-sm leading-relaxed text-sloth-text selection:bg-sloth-accent/25',
        spellcheck: 'false',
      },
      handleKeyDown: (_view, event) => {
        // Ctrl+J or Cmd+J opens Notion AI with selection
        if ((event.ctrlKey || event.metaKey) && (event.key === 'j' || event.key === 'J')) {
          event.preventDefault();
          onOpenNotionAI?.(selectedText);
          return true;
        }

        // Enter key shortcuts (/ai, /h1, /h2, /h3)
        if (event.key === 'Enter' && editor) {
          const { state } = editor;
          const { $from } = state.selection;
          const currentLineText = $from.parent.textContent.trim();

          if (currentLineText === '/ai') {
            event.preventDefault();
            // Clear current line and open Notion AI
            editor.commands.deleteRange({
              from: $from.start(),
              to: $from.end(),
            });
            onOpenNotionAI?.('');
            return true;
          }

          if (currentLineText === '/h1' || currentLineText === '/1') {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.setHeading({ level: 1 });
            return true;
          }

          if (currentLineText === '/h2' || currentLineText === '/2') {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.setHeading({ level: 2 });
            return true;
          }

          if (currentLineText === '/h3' || currentLineText === '/3') {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.setHeading({ level: 3 });
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (isUpdatingFromExternal.current) return;
      const markdown = getEditorMarkdown(currentEditor);
      onChange(markdown);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      if (from !== to) {
        const text = currentEditor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
      } else {
        setSelectedText('');
      }
    },
  });

  // Sync external value changes (e.g., when clicking another note in the explorer or AI replaces content)
  useEffect(() => {
    if (!editor) return;
    const currentMarkdown = getEditorMarkdown(editor);
    if (value !== currentMarkdown) {
      isUpdatingFromExternal.current = true;
      editor.commands.setContent(value, { emitUpdate: false });
      isUpdatingFromExternal.current = false;
    }
  }, [value, editor]);

  // Handle textarea selection in raw source mode
  const handleTextareaSelect = useCallback(() => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (start !== end) {
      setSelectedText(textareaRef.current.value.slice(start, end));
    } else {
      setSelectedText('');
    }
  }, []);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      onOpenNotionAI?.(selectedText);
      return;
    }

    if (e.key === 'Enter') {
      const target = e.currentTarget;
      const cursorPos = target.selectionStart;
      const textBeforeCursor = target.value.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      if (currentLine.trim() === '/ai') {
        e.preventDefault();
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent">
      {/* Floating Notion AI toolbar on text selection */}
      <NotionAIFloatingToolbar
        visible={selectedText.trim().length > 0}
        onAskAI={() => onOpenNotionAI?.(selectedText)}
        onQuickAction={(action) => onQuickNotionAction?.(action, selectedText)}
      />

      {/* Dynamic Markdown Format Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-sloth-border/70 bg-sloth-panel/50 px-6 py-1.5 select-none text-xs">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={!editor}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition font-bold ${
              editor?.isActive('heading', { level: 1 })
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Heading 1 (Type '# ' at start of line)"
          >
            <Heading1 size={14} />
            <span className="text-[11px]">H1</span>
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition font-bold ${
              editor?.isActive('heading', { level: 2 })
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Heading 2 (Type '## ' at start of line)"
          >
            <Heading2 size={14} />
            <span className="text-[11px]">H2</span>
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 transition font-semibold ${
              editor?.isActive('heading', { level: 3 })
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Heading 3 (Type '### ' at start of line)"
          >
            <Heading3 size={14} />
            <span className="text-[11px]">H3</span>
          </button>

          <div className="h-4 w-px bg-sloth-border mx-1" />

          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('bold')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Bold (**text**)"
          >
            <Bold size={13} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('italic')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Italic (*text*)"
          >
            <Italic size={13} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('strike')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough size={13} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleCode().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('code')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Inline Code (`code`)"
          >
            <Code size={13} />
          </button>

          <div className="h-4 w-px bg-sloth-border mx-1" />

          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('bulletList')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Bulleted List (Type '- ' or '* ')"
          >
            <List size={13} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('orderedList')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Numbered List (Type '1. ')"
          >
            <ListOrdered size={13} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('blockquote')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Blockquote (Type '> ')"
          >
            <Quote size={13} />
          </button>

          <button
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('codeBlock')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Code Block (Type '```')"
          >
            <FileCode size={13} />
          </button>
        </div>

        {/* Mode Switcher: Dynamic vs Raw Markdown Source */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenNotionAI?.(selectedText)}
            className="flex items-center gap-1 rounded-lg bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition"
            title="Ask Notion AI (Ctrl+J)"
          >
            <Sparkles size={11} />
            <span>AI</span>
          </button>

          <div className="flex items-center rounded-lg border border-sloth-border bg-sloth-surface p-0.5">
            <button
              onClick={() => setEditorMode('dynamic')}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                editorMode === 'dynamic'
                  ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                  : 'text-sloth-subtle hover:text-sloth-text'
              }`}
              title="Dynamic Markdown Editor (Live formatting)"
            >
              <Sparkles size={11} />
              <span>Dynamic</span>
            </button>
            <button
              onClick={() => setEditorMode('source')}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                editorMode === 'source'
                  ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                  : 'text-sloth-subtle hover:text-sloth-text'
              }`}
              title="Raw Markdown Source (Edit raw # tags)"
            >
              <Terminal size={11} />
              <span>Raw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto">
        {editorMode === 'dynamic' ? (
          <div className="h-full w-full cursor-text" onClick={() => editor?.commands.focus()}>
            <EditorContent editor={editor} className="h-full" />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onSelect={handleTextareaSelect}
            onKeyUp={handleTextareaSelect}
            onMouseUp={handleTextareaSelect}
            onKeyDown={handleTextareaKeyDown}
            spellCheck={false}
            className="h-full w-full resize-none bg-transparent px-10 py-6 font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
            placeholder="# Start writing in Markdown... (Type /ai or press Ctrl+J for Notion AI)"
          />
        )}
      </div>
    </div>
  );
}

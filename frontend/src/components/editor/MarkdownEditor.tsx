import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Extension, InputRule } from '@tiptap/core';
import {
  AlignCenter,
  AlignJustify,
  Bold,
  CheckSquare,
  Code,
  Columns,
  Columns2,
  Eye,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Rows,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  Terminal,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { NotionAIFloatingToolbar } from '../notion/NotionAIFloatingToolbar';

export type EditorViewMode = 'edit' | 'split' | 'preview';
export type EditorWidthMode = 'centered' | 'full';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview?: boolean;
  viewMode?: EditorViewMode;
  onViewModeChange?: (mode: EditorViewMode) => void;
  onOpenNotionAI?: (selectedText?: string) => void;
  onQuickNotionAction?: (action: string, selectedText: string) => void;
}

type EditorInstance = ReturnType<typeof useEditor>;

function getEditorMarkdown(editorInstance: EditorInstance): string {
  if (!editorInstance) return '';
  const storage = editorInstance.storage as unknown as Record<string, { getMarkdown?: () => string }>;
  return storage.markdown?.getMarkdown?.() ?? '';
}

// Custom dynamic markdown input rules (e.g. typing '| ' creates table, '--- ' creates horizontal rule)
const DynamicMarkdownRules = Extension.create({
  name: 'dynamicMarkdownRules',
  addInputRules() {
    return [
      // Typing '| ' at start of line creates a 3x3 table with header row
      new InputRule({
        find: /^\|\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        },
      }),
      // Typing '--- ' or '*** ' creates horizontal rule divider
      new InputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .setHorizontalRule()
            .run();
        },
      }),
      // Typing '[ ] ' or '[] ' creates interactive task list
      new InputRule({
        find: /^\[\s?\]\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .run();
        },
      }),
    ];
  },
});

export function MarkdownEditor({
  value,
  onChange,
  preview = false,
  viewMode,
  onViewModeChange,
  onOpenNotionAI,
  onQuickNotionAction,
}: MarkdownEditorProps) {
  const [selectedText, setSelectedText] = useState('');
  const [editorMode, setEditorMode] = useState<'dynamic' | 'source'>('dynamic');
  const [widthMode, setWidthMode] = useState<EditorWidthMode>(() => {
    return (localStorage.getItem('slothmind_editor_width') as EditorWidthMode) || 'centered';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingFromExternal = useRef(false);

  const effectiveViewMode: EditorViewMode = viewMode ?? (preview ? 'preview' : 'edit');

  const toggleWidthMode = () => {
    const next = widthMode === 'centered' ? 'full' : 'centered';
    setWidthMode(next);
    localStorage.setItem('slothmind_editor_width', next);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      DynamicMarkdownRules,
      Placeholder.configure({
        placeholder: "Type '#' for Heading, '| ' for Table, '---' for Divider, '[ ]' for Task, or Ctrl+J / /ai for Notion AI...",
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
          'tiptap prose prose-sloth max-w-none focus:outline-none min-h-full font-sans text-sm leading-relaxed text-sloth-text selection:bg-sloth-accent/25',
        spellcheck: 'false',
      },
      handleKeyDown: (_view, event) => {
        // Ctrl+J or Cmd+J opens Notion AI with selection
        if ((event.ctrlKey || event.metaKey) && (event.key === 'j' || event.key === 'J')) {
          event.preventDefault();
          onOpenNotionAI?.(selectedText);
          return true;
        }

        // Ctrl+K for Link
        if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K') && editor) {
          event.preventDefault();
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('Enter URL:', previousUrl);
          if (url === null) return true;
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
          return true;
        }

        // Enter key dynamic markdown shortcuts
        if (event.key === 'Enter' && editor) {
          const { state } = editor;
          const { $from } = state.selection;
          const currentLineText = $from.parent.textContent.trim();

          // /ai shortcut
          if (currentLineText === '/ai') {
            event.preventDefault();
            editor.commands.deleteRange({
              from: $from.start(),
              to: $from.end(),
            });
            onOpenNotionAI?.('');
            return true;
          }

          // Horizontal Rule / Divider shortcuts: '---', '***', '___', '/hr', '/divider'
          if (
            currentLineText === '---' ||
            currentLineText === '***' ||
            currentLineText === '___' ||
            currentLineText === '/hr' ||
            currentLineText === '/divider'
          ) {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.setHorizontalRule();
            return true;
          }

          // Table shortcut: '|', '/table', '/tbl'
          if (
            currentLineText === '|' ||
            currentLineText === '/table' ||
            currentLineText === '/tbl'
          ) {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
            return true;
          }

          // Table header syntax: '| Col 1 | Col 2 |' or '| Header |'
          if (currentLineText.startsWith('|') && currentLineText.endsWith('|')) {
            const columns = currentLineText
              .split('|')
              .map((c) => c.trim())
              .filter(Boolean);
            if (columns.length >= 1) {
              event.preventDefault();
              editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
              editor.commands.insertTable({
                rows: 2,
                cols: columns.length,
                withHeaderRow: true,
              });
              return true;
            }
          }

          // Task list / Checkbox shortcuts: '[]', '[ ]', '/todo', '/task'
          if (
            currentLineText === '[]' ||
            currentLineText === '[ ]' ||
            currentLineText === '/todo' ||
            currentLineText === '/task'
          ) {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.toggleTaskList();
            return true;
          }

          // Heading shortcuts: /h1, /1, /h2, /2, /h3, /3
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

          // Blockquote shortcut: /quote
          if (currentLineText === '/quote') {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.toggleBlockquote();
            return true;
          }

          // Code block shortcut: /code
          if (currentLineText === '/code') {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.toggleCodeBlock();
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

  // Handle link prompt in toolbar
  const handleLinkButton = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

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

  const isInsideTable = editor?.isActive('table') ?? false;

  // Full Preview Mode
  if ((effectiveViewMode as EditorViewMode) === 'preview') {
    return (
      <div className="h-full overflow-y-auto px-8 py-8 flex justify-center">
        <article className="prose prose-sloth w-full max-w-4xl">
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
      <div className="flex flex-wrap items-center justify-between border-b border-sloth-border/70 bg-sloth-panel/50 px-6 py-1.5 select-none text-xs gap-2">
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Headings */}
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

          {/* Inline styles */}
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
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('underline')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={13} />
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

          <button
            onClick={handleLinkButton}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('link')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Insert Link (Ctrl+K)"
          >
            <LinkIcon size={13} />
          </button>

          <div className="h-4 w-px bg-sloth-border mx-1" />

          {/* Lists & Tasks */}
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
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            disabled={!editor}
            className={`rounded-lg p-1.5 transition ${
              editor?.isActive('taskList')
                ? 'bg-sloth-accent/20 text-sloth-accent shadow-sm'
                : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
            }`}
            title="Task List / Checkbox (Type '[ ] ' or '- [ ] ')"
          >
            <CheckSquare size={13} />
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

          {/* Horizontal Rule Divider */}
          <button
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={!editor}
            className="rounded-lg p-1.5 transition text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text"
            title="Divider / Horizontal Rule (Type '---' on new line)"
          >
            <Minus size={13} />
          </button>

          <div className="h-4 w-px bg-sloth-border mx-1" />

          {/* Table Controls */}
          {!isInsideTable ? (
            <button
              onClick={() =>
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              disabled={!editor}
              className="flex items-center gap-1 rounded-lg px-2 py-1 transition text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text"
              title="Insert Table (Type '| ' or '| Col 1 | Col 2 |' on new line)"
            >
              <TableIcon size={13} />
              <span className="text-[11px]">Table</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-sloth-surface px-1.5 py-0.5 rounded-lg border border-sloth-border">
              <span className="text-[10px] font-semibold text-sloth-accent mr-0.5">Table:</span>
              <button
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-sloth-subtle hover:bg-sloth-panel hover:text-sloth-text"
                title="Add row below"
              >
                <Rows size={11} />
                <span>+Row</span>
              </button>
              <button
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-sloth-subtle hover:bg-sloth-panel hover:text-sloth-text"
                title="Add column right"
              >
                <Columns size={11} />
                <span>+Col</span>
              </button>
              <button
                onClick={() => editor?.chain().focus().deleteRow().run()}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-sloth-subtle hover:bg-red-500/10 hover:text-red-500"
                title="Delete current row"
              >
                <span>-Row</span>
              </button>
              <button
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-sloth-subtle hover:bg-red-500/10 hover:text-red-500"
                title="Delete current column"
              >
                <span>-Col</span>
              </button>
              <button
                onClick={() => editor?.chain().focus().deleteTable().run()}
                className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-red-500 hover:bg-red-500/15"
                title="Delete table"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Right side controls: Document Width, View Mode, Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Centered vs Full-width Canvas Alignment Toggle */}
          {effectiveViewMode === 'edit' && (
            <button
              onClick={toggleWidthMode}
              className="flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface/70 px-2 py-0.5 text-[11px] text-sloth-subtle hover:text-sloth-text transition"
              title={
                widthMode === 'centered'
                  ? 'Currently Centered (Click for Full Width)'
                  : 'Currently Full Width (Click for Centered Layout)'
              }
            >
              {widthMode === 'centered' ? <AlignCenter size={12} /> : <AlignJustify size={12} />}
              <span className="capitalize">{widthMode}</span>
            </button>
          )}

          {/* Quick View Mode Switcher in toolbar */}
          {onViewModeChange && (
            <div className="flex items-center rounded-lg border border-sloth-border bg-sloth-surface/70 p-0.5">
              <button
                onClick={() => onViewModeChange('edit')}
                className={`p-1 rounded transition ${
                  effectiveViewMode === 'edit'
                    ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                    : 'text-sloth-subtle hover:text-sloth-text'
                }`}
                title="Full Editor View"
              >
                <PenLine size={12} />
              </button>
              <button
                onClick={() => onViewModeChange('split')}
                className={`p-1 rounded transition ${
                  effectiveViewMode === 'split'
                    ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                    : 'text-sloth-subtle hover:text-sloth-text'
                }`}
                title="Split View (Side-by-Side: Editor on Left, Live Preview on Right)"
              >
                <Columns2 size={12} />
              </button>
              <button
                onClick={() => onViewModeChange('preview')}
                className={`p-1 rounded transition ${
                  effectiveViewMode === 'preview'
                    ? 'bg-sloth-panel text-sloth-accent shadow-sm'
                    : 'text-sloth-subtle hover:text-sloth-text'
                }`}
                title="Full Preview"
              >
                <Eye size={12} />
              </button>
            </div>
          )}

          {/* Notion AI summon pill */}
          <button
            onClick={() => onOpenNotionAI?.(selectedText)}
            className="flex items-center gap-1 rounded-lg bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition"
            title="Ask Notion AI (Ctrl+J)"
          >
            <Sparkles size={11} />
            <span>AI</span>
          </button>

          {/* Dynamic vs Raw Markdown Source toggle */}
          <div className="flex items-center rounded-lg border border-sloth-border bg-sloth-surface/70 p-0.5">
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
      {effectiveViewMode === 'split' ? (
        /* Split View: Side-by-side (Left: Editor, Right: Live Rendered Preview) */
        <div className="flex-1 flex overflow-hidden divide-x divide-sloth-border">
          {/* Left half: Editor */}
          <div className="flex-1 h-full overflow-y-auto">
            {editorMode === 'dynamic' ? (
              <div
                className="min-h-full w-full cursor-text px-8 py-6"
                onClick={() => editor?.commands.focus()}
              >
                <EditorContent editor={editor} className="min-h-full" />
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
                className="h-full w-full min-h-[500px] resize-none bg-transparent px-8 py-6 font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
                placeholder="# Start writing in Markdown... (Type /ai or press Ctrl+J for Notion AI)"
              />
            )}
          </div>

          {/* Right half: Live Rendered Markdown Preview */}
          <div className="flex-1 h-full overflow-y-auto bg-sloth-surface/15 px-8 py-6 select-text">
            <div className="text-[10px] font-bold text-sloth-subtle uppercase tracking-wider mb-4 border-b border-sloth-border/50 pb-1.5 flex items-center justify-between">
              <span>Live Rendered Preview</span>
              <span className="text-[9px] font-normal lowercase opacity-70">markdown sync</span>
            </div>
            <article className="prose prose-sloth max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value || '*Live preview appears here as you write...*'}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      ) : (
        /* Full Single Editor: Centered or Full-width layout */
        <div className="flex-1 overflow-y-auto">
          <div
            className={`min-h-full w-full cursor-text ${
              widthMode === 'centered' ? 'flex justify-center' : ''
            }`}
            onClick={() => editor?.commands.focus()}
          >
            <div
              className={`w-full ${
                widthMode === 'centered' ? 'max-w-4xl px-8 py-6' : 'px-10 py-6'
              }`}
            >
              {editorMode === 'dynamic' ? (
                <EditorContent editor={editor} className="min-h-full" />
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
                  className="h-full w-full min-h-[500px] resize-none bg-transparent font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
                  placeholder="# Start writing in Markdown... (Type /ai or press Ctrl+J for Notion AI)"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

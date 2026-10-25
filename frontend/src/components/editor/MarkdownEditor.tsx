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
  Search,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  Terminal,
  Trash2,
  Underline as UnderlineIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { NotionAIFloatingToolbar } from '../notion/NotionAIFloatingToolbar';
import { SLASH_COMMANDS, SlashCommandMenu } from './SlashCommandMenu';
import { FindInPageBar } from './FindInPageBar';

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

// Emoji dictionary for fast inline replacement
const EMOJI_MAP: Record<string, string> = {
  ':rocket:': '🚀',
  ':fire:': '🔥',
  ':sloth:': '🦥',
  ':check:': '✅',
  ':star:': '⭐',
  ':heart:': '❤️',
  ':bulb:': '💡',
  ':memo:': '📝',
  ':tada:': '🎉',
  ':eyes:': '👀',
  ':warning:': '⚠️',
  ':zap:': '⚡',
  ':book:': '📖',
  ':bug:': '🐛',
  ':coffee:': '☕',
  ':gear:': '⚙️',
  ':lock:': '🔒',
  ':pin:': '📌',
  ':calendar:': '📅',
  ':sparkles:': '✨',
  ':100:': '💯',
  ':smile:': '😊',
  ':thumbsup:': '👍',
  ':+1:': '👍',
};

// Auto-generate Table of Contents from markdown headings
function generateTableOfContents(markdownText: string): string {
  const lines = markdownText.split('\n');
  const headings: Array<{ level: number; text: string; slug: string }> = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ level, text, slug });
    }
  }

  if (headings.length === 0) {
    return '### 📑 Table of Contents\n- [Section 1](#section-1)\n- [Section 2](#section-2)\n';
  }

  let toc = '### 📑 Table of Contents\n';
  for (const h of headings) {
    const indent = '  '.repeat(Math.max(0, h.level - 1));
    toc += `${indent}- [${h.text}](#${h.slug})\n`;
  }
  return toc + '\n';
}

const DAILY_STANDUP_TEMPLATE = `# 📅 Daily Standup - ${new Date().toISOString().slice(0, 10)}

### 🎯 Goals for Today
- [ ] Primary focus task
- [ ] Review pending pull requests

### ⏳ Yesterday's Achievements
- Completed core editor components
- Verified test suite

### 🚧 Blockers & Notes
- None currently
`;

const PRD_TEMPLATE = `# 📋 Product Requirement Document: [Feature Name]

## 1. Problem Statement
Explain what pain point users are facing.

## 2. Proposed Solution
Detail the architecture and user experience.

## 3. Success Metrics
- Metric 1: 50% improvement in task velocity
- Metric 2: Zero regressions in test suite

## 4. Milestone Schedule
| Phase | Scope | ETA |
| --- | --- | --- |
| Phase 1 | Core MVP | Week 1 |
| Phase 2 | Polish & Shortcuts | Week 2 |
`;

const MEETING_TEMPLATE = `# 🤝 Meeting Notes: [Meeting Topic]
**Date:** ${new Date().toISOString().slice(0, 10)} | **Attendees:** @team

### 📝 Agenda
1. Project milestones review
2. Technical blockers

### 💬 Discussion Points
- Architecture discussion and trade-offs

### ✅ Action Items
- [ ] @assignee follow up on benchmarks
- [ ] Update documentation
`;

// Custom dynamic markdown input rules (fast block creation prefix + space, emojis, dates)
const DynamicMarkdownRules = Extension.create({
  name: 'dynamicMarkdownRules',
  addInputRules() {
    return [
      // Typing '--- ' or '*** ' creates horizontal rule divider
      new InputRule({
        find: /^(?:---|\u2014-|___\s|\*\*\*\s)$/,
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
      // Typing '" ' at start of line creates blockquote
      new InputRule({
        find: /^"\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .toggleBlockquote()
            .run();
        },
      }),
      // Typing '@today ' inserts current date
      new InputRule({
        find: /@today\s$/,
        handler: ({ chain, range }) => {
          const dateStr = new Date().toISOString().slice(0, 10);
          chain()
            .deleteRange(range)
            .insertContent(`${dateStr} `)
            .run();
        },
      }),
      // Typing '@now ' inserts current timestamp
      new InputRule({
        find: /@now\s$/,
        handler: ({ chain, range }) => {
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
          chain()
            .deleteRange(range)
            .insertContent(`${nowStr} `)
            .run();
        },
      }),
      // Typing '@remind ' inserts reminder tag
      new InputRule({
        find: /@remind\s$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .insertContent('⏰ **Reminder:** ')
            .run();
        },
      }),
      // Typing emoji shortcode :name: followed by space
      new InputRule({
        find: /:([a-z0-9_+-]+):\s$/,
        handler: ({ chain, range, match }) => {
          const code = `:${match[1]}:`;
          const emoji = EMOJI_MAP[code];
          if (emoji) {
            chain()
              .deleteRange(range)
              .insertContent(`${emoji} `)
              .run();
          }
        },
      }),
    ];
  },
});

// Indent a markdown line (Notion-style list nesting & block indentation)
export function indentMarkdownLine(line: string): string {
  const m = line.match(/^(\s*)(?:(\d+)\.\s|(- \[[ xX]\]\s)|([*+-]\s))(.*)$/);
  if (!m) {
    return '  ' + line;
  }
  const currentIndent = m[1];
  const isNum = m[2] !== undefined;
  const isTask = m[3] !== undefined;
  const isBullet = m[4] !== undefined;
  const text = m[5];

  if (isNum) {
    // When nesting a numbered list item, reset sub-level to 1.
    return '  ' + currentIndent + '1. ' + text;
  } else if (isTask) {
    return '  ' + currentIndent + m[3] + text;
  } else if (isBullet) {
    return '  ' + currentIndent + m[4] + text;
  }
  return '  ' + line;
}

// Outdent a markdown line (Notion-style list un-nesting)
export function outdentMarkdownLine(line: string): string {
  if (line.startsWith('  ')) {
    return line.slice(2);
  }
  if (line.startsWith('\t') || line.startsWith(' ')) {
    return line.slice(1);
  }
  return line;
}

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
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('slothmind_editor_zoom');
    return saved ? Number(saved) : 100;
  });

  // Slash command popup state
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    query: string;
    position: { top: number; left: number };
    selectedIndex: number;
    range?: { from: number; to: number };
  }>({
    open: false,
    query: '',
    position: { top: 0, left: 0 },
    selectedIndex: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUpdatingFromExternal = useRef(false);

  const effectiveViewMode: EditorViewMode = viewMode ?? (preview ? 'preview' : 'edit');

  const toggleWidthMode = () => {
    const next = widthMode === 'centered' ? 'full' : 'centered';
    setWidthMode(next);
    localStorage.setItem('slothmind_editor_width', next);
  };

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.min(prev + 10, 160);
      localStorage.setItem('slothmind_editor_zoom', String(next));
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 10, 70);
      localStorage.setItem('slothmind_editor_zoom', String(next));
      return next;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
    localStorage.setItem('slothmind_editor_zoom', '100');
  }, []);

  // Filter commands by active query
  const cleanQuery = slashMenu.query.toLowerCase().trim();
  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!cleanQuery) return true;
    return (
      cmd.title.toLowerCase().includes(cleanQuery) ||
      cmd.id.toLowerCase().includes(cleanQuery) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  });

  // Duplicate current block or line
  const duplicateCurrentBlock = useCallback(() => {
    if (editorMode === 'dynamic' && editor) {
      const { state } = editor;
      const { $from } = state.selection;
      const lineText = $from.parent.textContent;
      editor.commands.insertContentAt($from.end(), '\n' + (lineText || ''));
    } else if (textareaRef.current) {
      const target = textareaRef.current;
      const val = target.value;
      const selStart = target.selectionStart;
      const lineStart = val.lastIndexOf('\n', selStart - 1) + 1;
      const lineEndIdx = val.indexOf('\n', selStart);
      const lineEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
      const lineText = val.slice(lineStart, lineEnd);
      const nextContent = val.slice(0, lineEnd) + '\n' + lineText + val.slice(lineEnd);
      onChange(nextContent);
      setTimeout(() => {
        target.setSelectionRange(lineEnd + 1, lineEnd + 1 + lineText.length);
      }, 10);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode, onChange]);

  // Execute command in TipTap Dynamic mode
  const executeSlashCommand = useCallback(
    (cmdId: string) => {
      setSlashMenu((prev) => ({ ...prev, open: false }));

      if (slashMenu.range && editor) {
        editor.commands.deleteRange(slashMenu.range);
      }

      switch (cmdId) {
        case 'ai':
          onOpenNotionAI?.('');
          break;
        case 'h1':
          editor?.commands.setHeading({ level: 1 });
          break;
        case 'h2':
          editor?.commands.setHeading({ level: 2 });
          break;
        case 'h3':
          editor?.commands.setHeading({ level: 3 });
          break;
        case 'table':
          editor?.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
          break;
        case 'board':
          editor?.commands.insertContent(
            '| 📋 To Do | ⏳ In Progress | ✅ Done |\n| --- | --- | --- |\n| Task 1 | Task 2 | Task 3 |\n'
          );
          break;
        case 'calendar':
          editor?.commands.insertContent(
            '| Sun | Mon | Tue | Wed | Thu | Fri | Sat |\n| --- | --- | --- | --- | --- | --- | --- |\n| | 1 | 2 | 3 | 4 | 5 | 6 |\n'
          );
          break;
        case 'todo':
          editor?.commands.toggleTaskList();
          break;
        case 'bullet':
          editor?.commands.toggleBulletList();
          break;
        case 'number':
          editor?.commands.toggleOrderedList();
          break;
        case 'toggle':
          editor?.commands.insertContent(
            '<details>\n<summary>▶ Toggle List</summary>\n\nCollapsible content goes here.\n</details>\n'
          );
          break;
        case 'quote':
          editor?.commands.toggleBlockquote();
          break;
        case 'callout':
          editor?.commands.insertContent(
            '> 💡 **Note:** Highlighted callout text with key information.\n\n'
          );
          break;
        case 'code':
          editor?.commands.toggleCodeBlock();
          break;
        case 'math':
          editor?.commands.insertContent(
            '$$\nf(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi\n$$\n\n'
          );
          break;
        case 'divider':
          editor?.commands.setHorizontalRule();
          break;
        case 'toc': {
          const toc = generateTableOfContents(value);
          editor?.commands.insertContent(toc);
          break;
        }
        case 'today':
          editor?.commands.insertContent(`${new Date().toISOString().slice(0, 10)} `);
          break;
        case 'remind':
          editor?.commands.insertContent('⏰ **Reminder:** Tomorrow ');
          break;
        case 'wikilink':
          editor?.commands.insertContent('[[Page Name]] ');
          break;
        case 'page':
          editor?.commands.insertContent('[[New Subpage]] ');
          break;
        case 'duplicate':
          duplicateCurrentBlock();
          break;
        case 'color':
          editor?.commands.insertContent('<mark>Highlighted text</mark> ');
          break;
        case 'emoji':
          editor?.commands.insertContent('🚀 ');
          break;
        case 'button':
          editor?.commands.insertContent('[🚀 Action Button](https://slothmind.local) ');
          break;
        case 'embed':
          editor?.commands.insertContent(
            '<iframe src="https://example.com" width="100%" height="400"></iframe>\n\n'
          );
          break;
        case 'file':
          editor?.commands.insertContent('[📎 attachment.pdf](file://attachment.pdf) ');
          break;
        case 'image':
          editor?.commands.insertContent(
            '![Image description](https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800)\n\n'
          );
          break;
        case 'video':
          editor?.commands.insertContent(
            '[![Watch Video](https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg)](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n\n'
          );
          break;
        case 'template-daily':
          editor?.commands.insertContent(DAILY_STANDUP_TEMPLATE);
          break;
        case 'template-prd':
          editor?.commands.insertContent(PRD_TEMPLATE);
          break;
        case 'template-meeting':
          editor?.commands.insertContent(MEETING_TEMPLATE);
          break;
      }
      editor?.commands.focus();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slashMenu.range, onOpenNotionAI, value, duplicateCurrentBlock]
  );

  // Execute command in Raw Source mode (textarea)
  const executeSlashCommandTextarea = useCallback(
    (cmdId: string) => {
      setSlashMenu((prev) => ({ ...prev, open: false }));
      if (!textareaRef.current) return;

      const target = textareaRef.current;
      const cursorPos = target.selectionStart;
      const textBefore = target.value.slice(0, cursorPos);
      const match = textBefore.match(/(?:\s|^)\/([a-zA-Z0-9_-]*)$/);
      const queryLen = match ? match[1].length + 1 : 1;
      const replaceStart = cursorPos - queryLen;
      const replaceEnd = cursorPos;

      let inserted = '';
      switch (cmdId) {
        case 'ai':
          onOpenNotionAI?.('');
          break;
        case 'h1':
          inserted = '# ';
          break;
        case 'h2':
          inserted = '## ';
          break;
        case 'h3':
          inserted = '### ';
          break;
        case 'table':
          inserted = '| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n';
          break;
        case 'board':
          inserted = '| 📋 To Do | ⏳ In Progress | ✅ Done |\n| --- | --- | --- |\n| Task 1 | Task 2 | Task 3 |\n';
          break;
        case 'calendar':
          inserted = '| Sun | Mon | Tue | Wed | Thu | Fri | Sat |\n| --- | --- | --- | --- | --- | --- | --- |\n| | 1 | 2 | 3 | 4 | 5 | 6 |\n';
          break;
        case 'todo':
          inserted = '- [ ] ';
          break;
        case 'bullet':
          inserted = '- ';
          break;
        case 'number':
          inserted = '1. ';
          break;
        case 'toggle':
          inserted = '<details>\n<summary>▶ Toggle List</summary>\n\nCollapsible content goes here.\n</details>\n';
          break;
        case 'quote':
          inserted = '> ';
          break;
        case 'callout':
          inserted = '> 💡 **Note:** Highlighted callout text with key information.\n\n';
          break;
        case 'code':
          inserted = '```\n\n```';
          break;
        case 'math':
          inserted = '$$\nf(x) = \\int_{-\\infty}^\\infty \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi\n$$\n\n';
          break;
        case 'divider':
          inserted = '\n---\n';
          break;
        case 'toc':
          inserted = generateTableOfContents(target.value);
          break;
        case 'today':
          inserted = `${new Date().toISOString().slice(0, 10)} `;
          break;
        case 'remind':
          inserted = '⏰ **Reminder:** Tomorrow ';
          break;
        case 'wikilink':
          inserted = '[[Page Name]] ';
          break;
        case 'page':
          inserted = '[[New Subpage]] ';
          break;
        case 'duplicate':
          duplicateCurrentBlock();
          return;
        case 'color':
          inserted = '<mark>Highlighted text</mark> ';
          break;
        case 'emoji':
          inserted = '🚀 ';
          break;
        case 'button':
          inserted = '[🚀 Action Button](https://slothmind.local) ';
          break;
        case 'embed':
          inserted = '<iframe src="https://example.com" width="100%" height="400"></iframe>\n\n';
          break;
        case 'file':
          inserted = '[📎 attachment.pdf](file://attachment.pdf) ';
          break;
        case 'image':
          inserted = '![Image description](https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800)\n\n';
          break;
        case 'video':
          inserted = '[![Watch Video](https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg)](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n\n';
          break;
        case 'template-daily':
          inserted = DAILY_STANDUP_TEMPLATE;
          break;
        case 'template-prd':
          inserted = PRD_TEMPLATE;
          break;
        case 'template-meeting':
          inserted = MEETING_TEMPLATE;
          break;
      }

      const newContent =
        target.value.slice(0, replaceStart) +
        inserted +
        target.value.slice(replaceEnd);
      onChange(newContent);
      setTimeout(() => {
        target.focus();
        const nextPos = replaceStart + inserted.length;
        target.setSelectionRange(nextPos, nextPos);
      }, 10);
    },
    [onOpenNotionAI, onChange, duplicateCurrentBlock]
  );

  // Check cursor position for slash command in TipTap
  const checkSlashCommand = useCallback((currentEditor: ReturnType<typeof useEditor>) => {
    if (!currentEditor) return;
    const { state, view } = currentEditor;
    const { $from } = state.selection;
    const currentLineText = $from.parent.textContent;
    const offset = $from.parentOffset;
    const textBefore = currentLineText.slice(0, offset);

    const match = textBefore.match(/(?:\s|^)\/([a-zA-Z0-9_-]*)$/);
    if (match) {
      const query = match[1];
      const from = $from.pos - query.length - 1;
      const to = $from.pos;
      try {
        const coords = view.coordsAtPos(to);
        setSlashMenu({
          open: true,
          query,
          position: {
            top: coords.bottom + 6,
            left: Math.min(Math.max(coords.left, 24), window.innerWidth - 340),
          },
          selectedIndex: 0,
          range: { from, to },
        });
      } catch {
        // coordsAtPos may fail during initial mount
      }
    } else {
      setSlashMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
    }
  }, []);

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
        placeholder: "Type '/' for commands, '#' for Heading, '---' for Divider, or Ctrl+J for Notion AI...",
        emptyEditorClass: 'is-editor-empty',
      }),
      Markdown.configure({
        html: true,
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
        // Handle slash command menu keyboard navigation
        if (slashMenu.open && filteredCommands.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashMenu((prev) => ({
              ...prev,
              selectedIndex: (prev.selectedIndex + 1) % filteredCommands.length,
            }));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashMenu((prev) => ({
              ...prev,
              selectedIndex:
                (prev.selectedIndex - 1 + filteredCommands.length) % filteredCommands.length,
            }));
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const cmd = filteredCommands[slashMenu.selectedIndex % filteredCommands.length];
            if (cmd) {
              executeSlashCommand(cmd.id);
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setSlashMenu((prev) => ({ ...prev, open: false }));
            return true;
          }
        }

        // Ctrl+F or Cmd+F: Search within page
        if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
          event.preventDefault();
          setFindBarOpen(true);
          return true;
        }

        // Ctrl+/ : Open block actions slash menu at cursor
        if ((event.ctrlKey || event.metaKey) && event.key === '/' && editor) {
          event.preventDefault();
          try {
            const coords = _view.coordsAtPos(editor.state.selection.from);
            setSlashMenu({
              open: true,
              query: '',
              position: {
                top: coords.bottom + 6,
                left: Math.min(Math.max(coords.left, 24), window.innerWidth - 340),
              },
              selectedIndex: 0,
              range: { from: editor.state.selection.from, to: editor.state.selection.to },
            });
          } catch {
            setSlashMenu({
              open: true,
              query: '',
              position: { top: 120, left: 100 },
              selectedIndex: 0,
            });
          }
          return true;
        }

        // Ctrl+D: Duplicate current block / line
        if ((event.ctrlKey || event.metaKey) && (event.key === 'd' || event.key === 'D') && editor) {
          event.preventDefault();
          duplicateCurrentBlock();
          return true;
        }

        // Ctrl+Enter: Open/toggle current block (e.g. toggle task checkbox)
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && editor) {
          event.preventDefault();
          editor.commands.toggleTaskList();
          return true;
        }

        // Ctrl + + / Ctrl + - / Ctrl + 0 : Zoom in / out / reset
        if (event.ctrlKey || event.metaKey) {
          if (event.key === '=' || event.key === '+') {
            event.preventDefault();
            handleZoomIn();
            return true;
          }
          if (event.key === '-' || event.key === '_') {
            event.preventDefault();
            handleZoomOut();
            return true;
          }
          if (event.key === '0') {
            event.preventDefault();
            handleZoomReset();
            return true;
          }
        }

        // Ctrl+Shift+1 through Ctrl+Shift+9 block conversions
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && editor) {
          if (event.key === '!' || event.key === '1') {
            event.preventDefault();
            editor.chain().focus().setHeading({ level: 1 }).run();
            return true;
          }
          if (event.key === '@' || event.key === '2') {
            event.preventDefault();
            editor.chain().focus().setHeading({ level: 2 }).run();
            return true;
          }
          if (event.key === '#' || event.key === '3') {
            event.preventDefault();
            editor.chain().focus().setHeading({ level: 3 }).run();
            return true;
          }
          if (event.key === '$' || event.key === '4') {
            event.preventDefault();
            editor.chain().focus().toggleTaskList().run();
            return true;
          }
          if (event.key === '%' || event.key === '5') {
            event.preventDefault();
            editor.chain().focus().toggleBulletList().run();
            return true;
          }
          if (event.key === '^' || event.key === '6') {
            event.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
            return true;
          }
          if (event.key === '&' || event.key === '7') {
            event.preventDefault();
            editor.chain().focus().insertContent('<details>\n<summary>▶ Toggle List</summary>\n\nContent\n</details>\n').run();
            return true;
          }
          if (event.key === '*' || event.key === '8') {
            event.preventDefault();
            editor.chain().focus().toggleCodeBlock().run();
            return true;
          }
          if (event.key === '(' || event.key === '9' || event.key === ')' || event.key === '0') {
            event.preventDefault();
            editor.chain().focus().setParagraph().run();
            return true;
          }
          // Ctrl+Shift+S: Strikethrough
          if (event.key === 'S' || event.key === 's') {
            event.preventDefault();
            editor.chain().focus().toggleStrike().run();
            return true;
          }
          // Ctrl+Shift+M: Add comment
          if (event.key === 'M' || event.key === 'm') {
            event.preventDefault();
            const sel = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
            editor.chain().focus().insertContent(`<!-- ${sel || 'Comment'} -->`).run();
            return true;
          }
        }

        // Ctrl+E: Inline code
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'e' || event.key === 'E') && editor) {
          event.preventDefault();
          editor.chain().focus().toggleCode().run();
          return true;
        }

        // Tab and Shift+Tab: Notion-style indent / nest / outdent blocks
        if (event.key === 'Tab' && editor) {
          event.preventDefault();
          if (editor.isActive('table')) {
            if (event.shiftKey) {
              editor.commands.goToPreviousCell();
            } else {
              editor.commands.goToNextCell();
            }
            return true;
          }

          if (event.shiftKey) {
            // Outdent (un-nest) list items
            const lifted =
              editor.chain().focus().liftListItem('taskItem').run() ||
              editor.chain().focus().liftListItem('listItem').run();
            if (lifted) return true;
          } else {
            // Indent (nest) list items under previous item
            const isInsideList = editor.isActive('taskItem') || editor.isActive('listItem');
            if (isInsideList) {
              const sunk =
                editor.chain().focus().sinkListItem('taskItem').run() ||
                editor.chain().focus().sinkListItem('listItem').run();
              if (sunk) return true;
              return true;
            }

            editor.chain().focus().insertContent('  ').run();
            return true;
          }
          return true;
        }

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

          // Horizontal Rule / Divider shortcuts: '---', '***', '___'
          if (
            currentLineText === '---' ||
            currentLineText === '***' ||
            currentLineText === '___'
          ) {
            event.preventDefault();
            editor.commands.deleteRange({ from: $from.start(), to: $from.end() });
            editor.commands.setHorizontalRule();
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
      checkSlashCommand(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      if (from !== to) {
        const text = currentEditor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
      } else {
        setSelectedText('');
      }
      checkSlashCommand(currentEditor);
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

  // Handle textarea change with emoji and shortcode replacement
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    for (const [shortcode, emoji] of Object.entries(EMOJI_MAP)) {
      if (val.includes(`${shortcode} `)) {
        val = val.split(`${shortcode} `).join(`${emoji} `);
      }
    }
    if (val.includes('@today ')) {
      val = val.split('@today ').join(`${new Date().toISOString().slice(0, 10)} `);
    }
    if (val.includes('@now ')) {
      val = val.split('@now ').join(`${new Date().toISOString().replace('T', ' ').slice(0, 16)} `);
    }
    onChange(val);
  };

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

    // Check slash command in textarea
    const textBefore = textareaRef.current.value.slice(0, start);
    const match = textBefore.match(/(?:\s|^)\/([a-zA-Z0-9_-]*)$/);
    if (match) {
      const rect = textareaRef.current.getBoundingClientRect();
      setSlashMenu({
        open: true,
        query: match[1],
        position: {
          top: Math.min(rect.top + 100, window.innerHeight - 350),
          left: Math.min(rect.left + 50, window.innerWidth - 340),
        },
        selectedIndex: 0,
      });
    } else {
      setSlashMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
    }
  }, []);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash command keyboard handling in textarea
    if (slashMenu.open && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenu((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % filteredCommands.length,
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenu((prev) => ({
          ...prev,
          selectedIndex:
            (prev.selectedIndex - 1 + filteredCommands.length) % filteredCommands.length,
        }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const cmd = filteredCommands[slashMenu.selectedIndex % filteredCommands.length];
        if (cmd) {
          executeSlashCommandTextarea(cmd.id);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenu((prev) => ({ ...prev, open: false }));
        return;
      }
    }

    // Ctrl+F: Search within page
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setFindBarOpen(true);
      return;
    }

    // Ctrl+/ : Open slash commands menu
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setSlashMenu({
        open: true,
        query: '',
        position: {
          top: Math.min(rect.top + 80, window.innerHeight - 350),
          left: Math.min(rect.left + 50, window.innerWidth - 340),
        },
        selectedIndex: 0,
      });
      return;
    }

    // Ctrl+D: Duplicate current line
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      duplicateCurrentBlock();
      return;
    }

    // Ctrl+Enter: Toggle checkbox or list
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget;
      const val = target.value;
      const selStart = target.selectionStart;
      const lineStart = val.lastIndexOf('\n', selStart - 1) + 1;
      const lineEndIdx = val.indexOf('\n', selStart);
      const lineEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
      const lineText = val.slice(lineStart, lineEnd);
      let updatedLine = lineText;
      if (lineText.includes('- [ ] ')) {
        updatedLine = lineText.replace('- [ ] ', '- [x] ');
      } else if (lineText.includes('- [x] ') || lineText.includes('- [X] ')) {
        updatedLine = lineText.replace(/- \[[xX]\] /, '- [ ] ');
      } else if (lineText.startsWith('- ')) {
        updatedLine = lineText.replace(/^- /, '- [ ] ');
      }
      if (updatedLine !== lineText) {
        const nextContent = val.slice(0, lineStart) + updatedLine + val.slice(lineEnd);
        onChange(nextContent);
      }
      return;
    }

    // Tab and Shift+Tab: Notion-style list nesting & block indent/outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      if (start === end) {
        // Single line indent/outdent
        const lineStart = target.value.lastIndexOf('\n', start - 1) + 1;
        const lineEndIdx = target.value.indexOf('\n', start);
        const lineEnd = lineEndIdx === -1 ? target.value.length : lineEndIdx;
        const line = target.value.slice(lineStart, lineEnd);

        if (e.shiftKey) {
          const outdented = outdentMarkdownLine(line);
          const diff = line.length - outdented.length;
          const nextVal = target.value.slice(0, lineStart) + outdented + target.value.slice(lineEnd);
          onChange(nextVal);
          setTimeout(() => {
            target.setSelectionRange(Math.max(lineStart, start - diff), Math.max(lineStart, end - diff));
          }, 10);
        } else {
          const indented = indentMarkdownLine(line);
          const diff = indented.length - line.length;
          const nextVal = target.value.slice(0, lineStart) + indented + target.value.slice(lineEnd);
          onChange(nextVal);
          setTimeout(() => {
            target.setSelectionRange(start + diff, end + diff);
          }, 10);
        }
      } else {
        // Multi-line selection indent/outdent
        const selStartLine = target.value.lastIndexOf('\n', start - 1) + 1;
        const selEndIdx = target.value.indexOf('\n', end);
        const selEndLine = selEndIdx === -1 ? target.value.length : selEndIdx;
        const selectedBlock = target.value.slice(selStartLine, selEndLine);
        const lines = selectedBlock.split('\n');

        let diffTotal = 0;
        const processedLines = lines.map((l) => {
          if (e.shiftKey) {
            const out = outdentMarkdownLine(l);
            diffTotal -= (l.length - out.length);
            return out;
          } else {
            const ind = indentMarkdownLine(l);
            diffTotal += (ind.length - l.length);
            return ind;
          }
        });

        const nextVal = target.value.slice(0, selStartLine) + processedLines.join('\n') + target.value.slice(selEndLine);
        onChange(nextVal);
        setTimeout(() => {
          target.setSelectionRange(selStartLine, Math.max(selStartLine, end + diffTotal));
        }, 10);
      }
      return;
    }

    // Enter key: Notion-style smart list auto-continuation or empty item outdent/exit
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'Enter') {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const lineStart = target.value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = target.value.slice(lineStart, start);

      const match = currentLine.match(/^(\s*)(?:(\d+)\.\s|(- \[[ xX]\]\s)|([*+-]\s))(.*)$/);
      if (match) {
        const indent = match[1];
        const num = match[2];
        const task = match[3];
        const bullet = match[4];
        const contentAfterMarker = match[5];

        // Empty list item: Enter outdents or exits list
        if (contentAfterMarker.trim() === '') {
          e.preventDefault();
          if (indent.length >= 2) {
            const outdentedIndent = indent.slice(2);
            const marker = num !== undefined ? `${num}. ` : task !== undefined ? task : bullet;
            const nextVal = target.value.slice(0, lineStart) + outdentedIndent + marker + target.value.slice(start);
            onChange(nextVal);
            setTimeout(() => {
              const newPos = lineStart + outdentedIndent.length + marker.length;
              target.setSelectionRange(newPos, newPos);
            }, 10);
          } else {
            // Exit list on empty item
            const nextVal = target.value.slice(0, lineStart) + target.value.slice(start);
            onChange(nextVal);
            setTimeout(() => {
              target.setSelectionRange(lineStart, lineStart);
            }, 10);
          }
          return;
        }

        // List item has content: continue list on next line
        e.preventDefault();
        let nextMarker = '';
        if (num !== undefined) {
          nextMarker = `${indent}${parseInt(num, 10) + 1}. `;
        } else if (task !== undefined) {
          nextMarker = `${indent}- [ ] `;
        } else if (bullet !== undefined) {
          nextMarker = `${indent}${bullet}`;
        }

        const nextVal = target.value.slice(0, start) + '\n' + nextMarker + target.value.slice(start);
        onChange(nextVal);
        setTimeout(() => {
          const nextPos = start + 1 + nextMarker.length;
          target.setSelectionRange(nextPos, nextPos);
        }, 10);
        return;
      }
    }

    // Backspace on empty list marker: outdent or exit
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'Backspace') {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start === end) {
        const lineStart = target.value.lastIndexOf('\n', start - 1) + 1;
        const currentLine = target.value.slice(lineStart, start);
        const match = currentLine.match(/^(\s*)(?:(\d+)\.\s|(- \[[ xX]\]\s)|([*+-]\s))$/);
        if (match) {
          e.preventDefault();
          const indent = match[1];
          const marker = match[2] ? `${match[2]}. ` : match[3] || match[4];
          if (indent.length >= 2) {
            const outdentedIndent = indent.slice(2);
            const nextVal = target.value.slice(0, lineStart) + outdentedIndent + marker + target.value.slice(start);
            onChange(nextVal);
            setTimeout(() => {
              const newPos = lineStart + outdentedIndent.length + marker.length;
              target.setSelectionRange(newPos, newPos);
            }, 10);
          } else {
            const nextVal = target.value.slice(0, lineStart) + target.value.slice(start);
            onChange(nextVal);
            setTimeout(() => {
              target.setSelectionRange(lineStart, lineStart);
            }, 10);
          }
          return;
        }
      }
    }

    // Ctrl+E: Inline code
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const sel = target.value.slice(start, end);
      const rep = `\`${sel || 'code'}\``;
      const next = target.value.slice(0, start) + rep + target.value.slice(end);
      onChange(next);
      setTimeout(() => {
        target.setSelectionRange(start + 1, start + 1 + (sel ? sel.length : 4));
      }, 10);
      return;
    }

    // Ctrl+Shift+S: Strikethrough
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const sel = target.value.slice(start, end);
      const rep = `~~${sel || 'strikethrough'}~~`;
      const next = target.value.slice(0, start) + rep + target.value.slice(end);
      onChange(next);
      setTimeout(() => {
        target.setSelectionRange(start + 2, start + 2 + (sel ? sel.length : 13));
      }, 10);
      return;
    }

    // Ctrl+Shift+M: Add comment
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const sel = target.value.slice(start, end);
      const rep = `<!-- ${sel || 'Comment'} -->`;
      const next = target.value.slice(0, start) + rep + target.value.slice(end);
      onChange(next);
      return;
    }

    // Ctrl+Shift+1 through 9
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const lineStart = target.value.lastIndexOf('\n', start - 1) + 1;
      let prefix = '';
      if (e.key === '!' || e.key === '1') prefix = '# ';
      else if (e.key === '@' || e.key === '2') prefix = '## ';
      else if (e.key === '#' || e.key === '3') prefix = '### ';
      else if (e.key === '$' || e.key === '4') prefix = '- [ ] ';
      else if (e.key === '%' || e.key === '5') prefix = '- ';
      else if (e.key === '^' || e.key === '6') prefix = '1. ';
      else if (e.key === '*' || e.key === '8') prefix = '```\n';

      if (prefix) {
        e.preventDefault();
        const next = target.value.slice(0, lineStart) + prefix + target.value.slice(lineStart);
        onChange(next);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      onOpenNotionAI?.(selectedText);
      return;
    }
  };

  const isInsideTable = editor?.isActive('table') ?? false;

  // Full Preview Mode
  if (effectiveViewMode === 'preview') {
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

      {/* Floating In-Page Search Bar (Ctrl+F) */}
      <FindInPageBar
        content={value}
        isOpen={findBarOpen}
        onClose={() => setFindBarOpen(false)}
        onSelectMatch={(start, end) => {
          if (editorMode === 'source' && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start, end);
          }
        }}
      />

      {/* Floating Slash Command Suggestions Menu */}
      {slashMenu.open && (
        <SlashCommandMenu
          query={slashMenu.query}
          selectedIndex={slashMenu.selectedIndex}
          position={slashMenu.position}
          onSelect={(cmdId) => {
            if (editorMode === 'dynamic') {
              executeSlashCommand(cmdId);
            } else {
              executeSlashCommandTextarea(cmdId);
            }
          }}
          onClose={() => setSlashMenu((prev) => ({ ...prev, open: false }))}
        />
      )}

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
            title="Heading 1 (Ctrl+Shift+1 or Type '# ' or '/h1')"
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
            title="Heading 2 (Ctrl+Shift+2 or Type '## ' or '/h2')"
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
            title="Heading 3 (Ctrl+Shift+3 or Type '### ' or '/h3')"
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
            title="Bold (Ctrl+B)"
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
            title="Italic (Ctrl+I)"
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
            title="Strikethrough (Ctrl+Shift+S)"
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
            title="Inline Code (Ctrl+E)"
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
            title="Bulleted List (Ctrl+Shift+5 or Type '- ' or '/bullet')"
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
            title="Numbered List (Ctrl+Shift+6 or Type '1. ' or '/number')"
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
            title="Task List / Checkbox (Ctrl+Shift+4 or Type '[ ] ' or '/todo')"
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
            title="Blockquote (Type '> ' or '/quote')"
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
            title="Code Block (Ctrl+Shift+8 or Type '```' or '/code')"
          >
            <FileCode size={13} />
          </button>

          {/* Horizontal Rule Divider */}
          <button
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={!editor}
            className="rounded-lg p-1.5 transition text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text"
            title="Divider / Horizontal Rule (Type '---' or '/divider')"
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
              title="Insert Table (/table)"
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

        {/* Right side controls: Find, Zoom, Document Width, View Mode, Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Find In Page Button (Ctrl+F) */}
          <button
            onClick={() => setFindBarOpen((o) => !o)}
            className={`flex items-center gap-1 rounded-lg border border-sloth-border bg-sloth-surface/70 px-2 py-0.5 text-[11px] transition ${
              findBarOpen
                ? 'text-sloth-accent border-sloth-accent/40 bg-sloth-accent/10'
                : 'text-sloth-subtle hover:text-sloth-text'
            }`}
            title="Search within page (Ctrl+F)"
          >
            <Search size={12} />
            <span>Find</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-sloth-border bg-sloth-surface/70 p-0.5 text-[11px]">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-sloth-subtle hover:text-sloth-text transition"
              title="Zoom out (Ctrl+-)"
            >
              <ZoomOut size={12} />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-1 font-mono text-[10px] text-sloth-subtle hover:text-sloth-text"
              title="Reset zoom (Ctrl+0)"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-sloth-subtle hover:text-sloth-text transition"
              title="Zoom in (Ctrl++)"
            >
              <ZoomIn size={12} />
            </button>
          </div>

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
                  (effectiveViewMode as EditorViewMode) === 'preview'
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
            title="Ask Notion AI (Ctrl+J or type '/ai')"
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

      {/* Editor Body with Zoom Scale */}
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={zoomLevel !== 100 ? { zoom: `${zoomLevel}%` } : undefined}
      >
        {effectiveViewMode === 'split' ? (
          /* Split View: Side-by-side (Left: Editor, Right: Live Rendered Preview) */
          <div className="flex-1 min-h-0 flex overflow-hidden divide-x divide-sloth-border">
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
                  onChange={handleTextareaChange}
                  onSelect={handleTextareaSelect}
                  onKeyUp={handleTextareaSelect}
                  onMouseUp={handleTextareaSelect}
                  onKeyDown={handleTextareaKeyDown}
                  spellCheck={false}
                  className="h-full w-full min-h-[calc(100vh-200px)] resize-none bg-transparent px-8 py-6 font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
                  placeholder="# Start writing in Markdown... (Type '/' for commands or Ctrl+J for Notion AI)"
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div
              className={`min-h-full w-full cursor-text ${
                widthMode === 'centered' ? 'flex justify-center' : ''
              }`}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  editor?.commands.focus();
                }
              }}
            >
              <div
                className={`w-full ${
                  widthMode === 'centered' ? 'max-w-4xl px-8 py-6' : 'px-10 py-6'
                }`}
                onClick={() => editor?.commands.focus()}
              >
                {editorMode === 'dynamic' ? (
                  <EditorContent editor={editor} className="min-h-full" />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleTextareaChange}
                    onSelect={handleTextareaSelect}
                    onKeyUp={handleTextareaSelect}
                    onMouseUp={handleTextareaSelect}
                    onKeyDown={handleTextareaKeyDown}
                    spellCheck={false}
                    className="h-full w-full min-h-[calc(100vh-200px)] resize-none bg-transparent font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
                    placeholder="# Start writing in Markdown... (Type '/' for commands or Ctrl+J for Notion AI)"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

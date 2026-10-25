import { useEffect, useRef } from 'react';
import {
  Bell,
  Calendar,
  CheckSquare,
  ChevronRight,
  Columns3,
  Copy,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  HelpCircle,
  Highlighter,
  Image as ImageIcon,
  Link,
  List,
  ListOrdered,
  Minus,
  MousePointerClick,
  Paperclip,
  Quote,
  Sigma,
  Smile,
  Sparkles,
  Table as TableIcon,
  Video,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  category: 'AI' | 'Basic Blocks' | 'Media & Data' | 'Advanced & Templates';
  icon: React.ReactNode;
  keywords: string[];
}

export const SLASH_COMMANDS: CommandItem[] = [
  {
    id: 'ai',
    title: 'Ask Notion AI',
    description: 'Ask AI to write, summarize, brainstorm, or outline',
    badge: 'Ctrl+J',
    category: 'AI',
    icon: <Sparkles size={16} className="text-purple-500" />,
    keywords: ['ai', 'notion', 'ask', 'generate', 'write', 'prompt'],
  },
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Big section heading (auto 30px bold)',
    badge: '#',
    category: 'Basic Blocks',
    icon: <Heading1 size={16} className="text-sloth-accent" />,
    keywords: ['h1', 'heading', 'title', 'large', 'big', 'header', '1'],
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading (auto 24px bold)',
    badge: '##',
    category: 'Basic Blocks',
    icon: <Heading2 size={16} className="text-sloth-accent" />,
    keywords: ['h2', 'heading', 'subtitle', 'medium', 'header', '2'],
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small section heading (auto 20px semibold)',
    badge: '###',
    category: 'Basic Blocks',
    icon: <Heading3 size={16} className="text-sloth-accent" />,
    keywords: ['h3', 'heading', 'small', 'subheading', 'header', '3'],
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with an interactive checkbox',
    badge: '[ ]',
    category: 'Basic Blocks',
    icon: <CheckSquare size={16} className="text-emerald-500" />,
    keywords: ['todo', 'task', 'check', 'checkbox', 'list', 'done', '4'],
  },
  {
    id: 'bullet',
    title: 'Bulleted List',
    description: 'Create a simple bulleted list',
    badge: '-',
    category: 'Basic Blocks',
    icon: <List size={16} className="text-amber-500" />,
    keywords: ['bullet', 'list', 'ul', 'points', '5'],
  },
  {
    id: 'number',
    title: 'Numbered List',
    description: 'Create a list with ordered numbering',
    badge: '1.',
    category: 'Basic Blocks',
    icon: <ListOrdered size={16} className="text-amber-500" />,
    keywords: ['number', 'ordered', 'ol', '1', 'list', '6'],
  },
  {
    id: 'toggle',
    title: 'Toggle List',
    description: 'Collapsible toggle list block (<details>)',
    badge: '>',
    category: 'Basic Blocks',
    icon: <ChevronRight size={16} className="text-indigo-500" />,
    keywords: ['toggle', 'collapsible', 'details', 'accordion', '7'],
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture an accented blockquote',
    badge: '"',
    category: 'Basic Blocks',
    icon: <Quote size={16} className="text-indigo-400" />,
    keywords: ['quote', 'blockquote', 'cite'],
  },
  {
    id: 'callout',
    title: 'Callout',
    description: 'Make writing stand out with an emoji icon box',
    badge: '💡',
    category: 'Basic Blocks',
    icon: <HelpCircle size={16} className="text-amber-400" />,
    keywords: ['callout', 'box', 'highlight', 'note', 'alert'],
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide sections with a horizontal rule',
    badge: '---',
    category: 'Basic Blocks',
    icon: <Minus size={16} className="text-sloth-subtle" />,
    keywords: ['divider', 'hr', 'line', 'horizontal', 'rule', 'split', 'div'],
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Code snippet with monospace typography',
    badge: '```',
    category: 'Basic Blocks',
    icon: <FileCode size={16} className="text-cyan-500" />,
    keywords: ['code', 'block', 'snippet', 'pre', 'programming', '8'],
  },
  {
    id: 'math',
    title: 'Math Equation',
    description: 'LaTeX math equation block ($$...$$)',
    badge: '$$',
    category: 'Media & Data',
    icon: <Sigma size={16} className="text-violet-500" />,
    keywords: ['math', 'equation', 'latex', 'formula'],
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Interactive 3x3 table with header row',
    badge: '|',
    category: 'Media & Data',
    icon: <TableIcon size={16} className="text-blue-500" />,
    keywords: ['table', 'grid', 'column', 'row', 'cells', 'spreadsheet', 'database'],
  },
  {
    id: 'board',
    title: 'Kanban Board',
    description: 'Visual project board with To Do, In Progress, and Done',
    badge: 'Board',
    category: 'Media & Data',
    icon: <Columns3 size={16} className="text-sky-500" />,
    keywords: ['board', 'kanban', 'tasks', 'status', 'project', 'pipeline'],
  },
  {
    id: 'calendar',
    title: 'Calendar Sprint View',
    description: 'Sprint planning calendar table view',
    badge: 'Cal',
    category: 'Media & Data',
    icon: <Calendar size={16} className="text-rose-500" />,
    keywords: ['calendar', 'sprint', 'schedule', 'dates', 'month'],
  },
  {
    id: 'toc',
    title: 'Table of Contents',
    description: 'Auto-generate Table of Contents from headings',
    badge: 'TOC',
    category: 'Advanced & Templates',
    icon: <FileText size={16} className="text-emerald-500" />,
    keywords: ['toc', 'table of contents', 'outline', 'index'],
  },
  {
    id: 'today',
    title: "Today's Date",
    description: "Insert today's formatted date (@today)",
    badge: '@today',
    category: 'Advanced & Templates',
    icon: <Calendar size={16} className="text-blue-400" />,
    keywords: ['today', 'date', 'calendar', 'time', 'now'],
  },
  {
    id: 'remind',
    title: 'Reminder',
    description: 'Insert a reminder milestone tag (@remind)',
    badge: '@remind',
    category: 'Advanced & Templates',
    icon: <Bell size={16} className="text-amber-500" />,
    keywords: ['remind', 'reminder', 'alert', 'due', 'deadline'],
  },
  {
    id: 'wikilink',
    title: 'Link to Page',
    description: 'Link an existing vault page ([[page]])',
    badge: '[[ ]]',
    category: 'Advanced & Templates',
    icon: <Link size={16} className="text-indigo-400" />,
    keywords: ['link', 'page', 'wikilink', 'mention'],
  },
  {
    id: 'page',
    title: 'Subpage',
    description: 'Create and link a new subpage',
    badge: '/page',
    category: 'Advanced & Templates',
    icon: <FileText size={16} className="text-teal-500" />,
    keywords: ['page', 'subpage', 'document', 'note'],
  },
  {
    id: 'duplicate',
    title: 'Duplicate Block',
    description: 'Duplicate current block or line (Ctrl+D)',
    badge: 'Ctrl+D',
    category: 'Advanced & Templates',
    icon: <Copy size={16} className="text-sloth-subtle" />,
    keywords: ['duplicate', 'copy', 'clone'],
  },
  {
    id: 'color',
    title: 'Highlight Color',
    description: 'Highlight text with yellow accent marker',
    badge: '==',
    category: 'Basic Blocks',
    icon: <Highlighter size={16} className="text-amber-400" />,
    keywords: ['color', 'highlight', 'mark', 'yellow'],
  },
  {
    id: 'emoji',
    title: 'Insert Emoji',
    description: 'Insert an emoji (:rocket:, :fire:, :sloth:)',
    badge: ':emoji:',
    category: 'Basic Blocks',
    icon: <Smile size={16} className="text-amber-500" />,
    keywords: ['emoji', 'emoticon', 'smile', 'icon'],
  },
  {
    id: 'button',
    title: 'Button',
    description: 'Call-to-action link button',
    badge: 'Btn',
    category: 'Advanced & Templates',
    icon: <MousePointerClick size={16} className="text-cyan-500" />,
    keywords: ['button', 'action', 'cta', 'link'],
  },
  {
    id: 'embed',
    title: 'Embed Website',
    description: 'Embed an interactive web widget or iframe',
    badge: 'Embed',
    category: 'Media & Data',
    icon: <ExternalLink size={16} className="text-purple-400" />,
    keywords: ['embed', 'iframe', 'website', 'url'],
  },
  {
    id: 'file',
    title: 'File Attachment',
    description: 'Link an external file or attachment',
    badge: 'File',
    category: 'Media & Data',
    icon: <Paperclip size={16} className="text-slate-400" />,
    keywords: ['file', 'attachment', 'upload', 'pdf'],
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Insert an image with caption',
    badge: 'Img',
    category: 'Media & Data',
    icon: <ImageIcon size={16} className="text-emerald-400" />,
    keywords: ['image', 'picture', 'photo', 'media'],
  },
  {
    id: 'video',
    title: 'Video',
    description: 'Embed a video player or link',
    badge: 'Video',
    category: 'Media & Data',
    icon: <Video size={16} className="text-red-400" />,
    keywords: ['video', 'media', 'youtube', 'mp4'],
  },
  {
    id: 'template-daily',
    title: 'Daily Standup Template',
    description: 'Template for daily updates, blockers, and goals',
    badge: 'Template',
    category: 'Advanced & Templates',
    icon: <FileSpreadsheet size={16} className="text-purple-500" />,
    keywords: ['template', 'daily', 'standup', 'scrum'],
  },
  {
    id: 'template-prd',
    title: 'PRD Feature Spec Template',
    description: 'Template with problem, solution, metrics, and phases',
    badge: 'Template',
    category: 'Advanced & Templates',
    icon: <FileText size={16} className="text-purple-500" />,
    keywords: ['template', 'prd', 'spec', 'product', 'feature'],
  },
  {
    id: 'template-meeting',
    title: 'Meeting Notes Template',
    description: 'Template with attendees, agenda, discussion, and action items',
    badge: 'Template',
    category: 'Advanced & Templates',
    icon: <FileSpreadsheet size={16} className="text-pink-500" />,
    keywords: ['template', 'meeting', 'notes', 'agenda', 'minutes'],
  },
];

interface SlashCommandMenuProps {
  query: string;
  selectedIndex: number;
  onSelect: (commandId: string) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

export function SlashCommandMenu({
  query,
  selectedIndex,
  onSelect,
  position,
  onClose,
}: SlashCommandMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands by query matching title or keywords
  const cleanQuery = query.toLowerCase().trim();
  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!cleanQuery) return true;
    return (
      cmd.title.toLowerCase().includes(cleanQuery) ||
      cmd.id.toLowerCase().includes(cleanQuery) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  });

  // Keep selected item visible in scroll
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView?.({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{ top: position.top, left: position.left }}
        className="fixed z-50 w-72 rounded-xl border border-sloth-border bg-sloth-panel/95 p-3 shadow-2xl backdrop-blur-md select-none text-xs"
      >
        <p className="text-sloth-subtle text-center py-2">
          No matching commands for &quot;/{query}&quot;
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-84 max-h-88 overflow-y-auto rounded-xl border border-sloth-border bg-sloth-panel/95 p-1.5 shadow-2xl backdrop-blur-md select-none text-xs animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sloth-subtle flex items-center justify-between border-b border-sloth-border/50 mb-1">
        <span>Notion Commands</span>
        {query ? (
          <span className="text-sloth-accent lowercase font-mono">/{query}</span>
        ) : (
          <span className="text-[9px] text-sloth-subtle/80">↑↓ to navigate · ↵ to select</span>
        )}
      </div>

      <div className="space-y-0.5">
        {filteredCommands.map((cmd, idx) => {
          const isSelected = idx === selectedIndex % filteredCommands.length;
          return (
            <button
              key={cmd.id}
              data-active={isSelected}
              onClick={() => onSelect(cmd.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-sloth-accent/15 text-sloth-text font-medium'
                  : 'text-sloth-text hover:bg-sloth-surface/70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sloth-border/70 ${
                    isSelected ? 'bg-sloth-panel shadow-sm' : 'bg-sloth-surface'
                  }`}
                >
                  {cmd.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight truncate">{cmd.title}</p>
                  <p className="text-[11px] text-sloth-subtle leading-tight truncate mt-0.5">
                    {cmd.description}
                  </p>
                </div>
              </div>

              {cmd.badge && (
                <span className="shrink-0 rounded bg-sloth-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-sloth-subtle border border-sloth-border/50">
                  {cmd.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import {
  CheckSquare,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  category: 'AI' | 'Basic Blocks' | 'Media & Data';
  icon: React.ReactNode;
  keywords: string[];
}

export const SLASH_COMMANDS: Omit<CommandItem, 'action'>[] = [
  {
    id: 'ai',
    title: 'Ask Notion AI',
    description: 'Ask AI to write, summarize, or draft',
    badge: 'AI',
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
    keywords: ['h1', 'heading', 'title', 'large', 'big', 'header'],
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading (auto 24px bold)',
    badge: '##',
    category: 'Basic Blocks',
    icon: <Heading2 size={16} className="text-sloth-accent" />,
    keywords: ['h2', 'heading', 'subtitle', 'medium', 'header'],
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small section heading (auto 20px semibold)',
    badge: '###',
    category: 'Basic Blocks',
    icon: <Heading3 size={16} className="text-sloth-accent" />,
    keywords: ['h3', 'heading', 'small', 'subheading', 'header'],
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Interactive 3x3 table with header row',
    badge: '|',
    category: 'Media & Data',
    icon: <TableIcon size={16} className="text-blue-500" />,
    keywords: ['table', 'grid', 'column', 'row', 'cells', 'spreadsheet'],
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with an interactive checkbox',
    badge: '[ ]',
    category: 'Basic Blocks',
    icon: <CheckSquare size={16} className="text-emerald-500" />,
    keywords: ['todo', 'task', 'check', 'checkbox', 'list', 'done'],
  },
  {
    id: 'bullet',
    title: 'Bulleted List',
    description: 'Create a simple bulleted list',
    badge: '-',
    category: 'Basic Blocks',
    icon: <List size={16} className="text-amber-500" />,
    keywords: ['bullet', 'list', 'ul', 'points'],
  },
  {
    id: 'number',
    title: 'Numbered List',
    description: 'Create a list with ordered numbering',
    badge: '1.',
    category: 'Basic Blocks',
    icon: <ListOrdered size={16} className="text-amber-500" />,
    keywords: ['number', 'ordered', 'ol', '1', 'list'],
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture an accented blockquote',
    badge: '>',
    category: 'Basic Blocks',
    icon: <Quote size={16} className="text-indigo-400" />,
    keywords: ['quote', 'blockquote', 'cite', 'callout'],
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Code snippet with monospace typography',
    badge: '```',
    category: 'Basic Blocks',
    icon: <FileCode size={16} className="text-cyan-500" />,
    keywords: ['code', 'block', 'snippet', 'pre', 'programming'],
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide sections with a horizontal rule',
    badge: '---',
    category: 'Basic Blocks',
    icon: <Minus size={16} className="text-sloth-subtle" />,
    keywords: ['divider', 'hr', 'line', 'horizontal', 'rule', 'split'],
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
      className="fixed z-50 w-80 max-h-80 overflow-y-auto rounded-xl border border-sloth-border bg-sloth-panel/95 p-1.5 shadow-2xl backdrop-blur-md select-none text-xs animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sloth-subtle flex items-center justify-between border-b border-sloth-border/50 mb-1">
        <span>Commands</span>
        {query && <span className="text-sloth-accent lowercase font-mono">/{query}</span>}
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
                <kbd className="shrink-0 rounded border border-sloth-border/80 bg-sloth-surface px-1.5 py-0.5 text-[10px] font-mono text-sloth-subtle">
                  {cmd.badge}
                </kbd>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

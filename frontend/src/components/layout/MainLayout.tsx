import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface MainLayoutProps {
  sidebar: ReactNode;
  editor: ReactNode;
  statusBar: ReactNode;
}

export function MainLayout({ sidebar, editor, statusBar }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`relative flex h-full flex-col border-r border-sloth-border bg-sloth-panel transition-all duration-200 ${
            collapsed ? 'w-0' : 'w-[280px]'
          }`}
        >
          <div className={`${collapsed ? 'hidden' : 'flex'} h-full flex-col`}>{sidebar}</div>
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="absolute -right-3 top-6 rounded-full border border-sloth-border bg-sloth-panel p-1 text-sloth-subtle transition hover:text-sloth-text"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col bg-sloth-bg">{editor}</main>
      </div>
      {statusBar}
    </div>
  );
}

import { FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { VaultNode } from '../../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { RenameModal } from './RenameModal';

interface FileTreeNodeProps {
  node: VaultNode;
  depth: number;
  active: boolean;
  onOpen: (path: string) => void;
  onChanged: () => void;
}

export function FileTreeNode({ node, depth, active, onOpen, onChanged }: FileTreeNodeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Hide unwanted marker: strip redundant .md extension from display label
  const displayName = node.name.replace(/\.md$/i, '');
  const tooltip = `${node.path}${node.size ? ` • ${(node.size / 1024).toFixed(1)} KB` : ''}`;

  return (
    <>
      <div
        className={`group flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
          active
            ? 'bg-sloth-accent/15 text-sloth-accent font-medium'
            : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
        }`}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
      >
        <button
          onClick={() => onOpen(node.path)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={tooltip}
        >
          <FileText size={13} className={active ? 'text-sloth-accent' : 'text-sloth-subtle'} />
          <span className="truncate">{displayName}</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-sloth-surface text-sloth-subtle hover:text-sloth-text"
            aria-label="Note actions"
          >
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-lg border border-sloth-border bg-sloth-panel shadow-xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-sloth-text hover:bg-sloth-surface"
              >
                <Pencil size={13} />
                Rename
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-sloth-danger hover:bg-sloth-surface"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <RenameModal
        open={renameOpen}
        node={node}
        onClose={() => setRenameOpen(false)}
        onRenamed={onChanged}
      />
      <DeleteConfirmModal
        open={deleteOpen}
        node={node}
        onClose={() => setDeleteOpen(false)}
        onDeleted={onChanged}
      />
    </>
  );
}

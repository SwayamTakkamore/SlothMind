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

  return (
    <>
      <div
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition ${
          active ? 'bg-sloth-accent/20 text-sloth-text' : 'text-sloth-subtle hover:bg-sloth-surface hover:text-sloth-text'
        }`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
      >
        <button onClick={() => onOpen(node.path)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <FileText size={14} />
          <span className="truncate">{node.name}</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1 opacity-0 transition group-hover:opacity-100"
            aria-label="Note actions"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 w-36 overflow-hidden rounded-lg border border-sloth-border bg-sloth-panel shadow-xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-sloth-surface"
              >
                <Pencil size={14} />
                Rename
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-red-300 hover:bg-sloth-surface"
              >
                <Trash2 size={14} />
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

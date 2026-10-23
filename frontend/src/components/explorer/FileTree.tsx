import { ChevronDown, ChevronRight, Folder, FolderOpen, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { VaultNode } from '../../types';
import { FileTreeNode } from './FileTreeNode';
import { useVaultContext } from '../../App';

interface FileTreeProps {
  onRefresh: () => void;
}

export function FileTree({ onRefresh }: FileTreeProps) {
  const { activeNotePath, setActiveNotePath } = useVaultContext();
  const [tree, setTree] = useState<VaultNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await api.listTree();
      setTree(result.tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the file tree.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: VaultNode, depth: number) => {
    if (node.type === 'folder') {
      const open = expanded.has(node.path);
      return (
        <div key={node.path}>
          <button
            onClick={() => toggle(node.path)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {open ? <FolderOpen size={14} /> : <Folder size={14} />}
            <span className="truncate">{node.name}</span>
          </button>
          {open && node.children?.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }
    return (
      <FileTreeNode
        key={node.path}
        node={node}
        depth={depth}
        active={activeNotePath === node.path}
        onOpen={(path) => setActiveNotePath(path)}
        onChanged={() => {
          void load();
          onRefresh();
        }}
      />
    );
  };

  if (loading) {
    return <p className="px-2 py-2 text-sm text-sloth-subtle">Loading...</p>;
  }
  if (error) {
    return (
      <div className="px-2 py-2 text-sm">
        <p className="text-red-400">{error}</p>
        <button onClick={() => void load()} className="mt-2 flex items-center gap-1 text-sloth-subtle hover:text-sloth-text">
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }
  if (tree.length === 0) {
    return <p className="px-2 py-2 text-sm text-sloth-subtle">This vault is empty.</p>;
  }

  return <div className="flex flex-col gap-0.5">{tree.map((node) => renderNode(node, 0))}</div>;
}

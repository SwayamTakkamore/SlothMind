import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { VaultNode } from '../../types';
import { Modal } from '../common/Modal';

interface RenameModalProps {
  open: boolean;
  node: VaultNode;
  onClose: () => void;
  onRenamed: () => void;
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

function nameWithoutExtension(name: string): string {
  return name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
}

function withExtension(name: string): string {
  return name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
}

export function RenameModal({ open, node, onClose, onRenamed }: RenameModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(nameWithoutExtension(node.name));
      setError(null);
    }
  }, [node.name, open]);

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);
      const trimmed = value.trim();
      if (!trimmed) throw new Error('Name cannot be empty.');
      const nextName = node.type === 'note' ? withExtension(trimmed) : trimmed;
      const parent = parentOf(node.path);
      const to = parent === '' ? nextName : `${parent}/${nextName}`;
      await api.renameEntry(node.path, to);
      onRenamed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={node.type === 'note' ? 'Rename note' : 'Rename folder'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-sloth-subtle hover:text-sloth-text">
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-md bg-sloth-accent px-3 py-1.5 text-sm text-white transition hover:bg-sloth-accentHover disabled:opacity-50"
          >
            {saving ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      }
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit();
        }}
        className="w-full rounded-md border border-sloth-border bg-sloth-bg px-3 py-2 text-sm outline-none focus:border-sloth-accent"
        autoFocus
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}

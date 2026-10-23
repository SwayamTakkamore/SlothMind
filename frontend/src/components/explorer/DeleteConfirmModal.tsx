import { useState } from 'react';
import { api } from '../../services/api';
import type { VaultNode } from '../../types';
import { Modal } from '../common/Modal';

interface DeleteConfirmModalProps {
  open: boolean;
  node: VaultNode;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmModal({ open, node, onClose, onDeleted }: DeleteConfirmModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    try {
      setDeleting(true);
      setError(null);
      await api.deleteEntry(node.path);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Delete item"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-sloth-subtle hover:text-sloth-text">
            Cancel
          </button>
          <button
            onClick={() => void remove()}
            disabled={deleting}
            className="rounded-md bg-red-500/80 px-3 py-1.5 text-sm text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? 'Moving to trash...' : 'Move to .trash'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-sloth-text">
        Move <span className="font-medium">{node.name}</span> to the vault&apos;s recoverable{' '}
        <span className="font-mono">.trash</span> folder?
      </p>
      <p className="mt-1 text-sm text-sloth-subtle">This keeps it recoverable and avoids permanent deletion.</p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}

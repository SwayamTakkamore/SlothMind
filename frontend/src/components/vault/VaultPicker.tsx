import { Folder, FolderPlus, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { DirectoryListing } from '../../types';
import type { RecentVault } from '../../services/storage';
import { Modal } from '../common/Modal';

interface VaultPickerProps {
  open: boolean;
  onClose: () => void;
  recent: RecentVault[];
  onOpen: (path: string) => Promise<void>;
  onCreate: (parent: string, name: string) => Promise<void>;
}

export function VaultPicker({ open, onClose, recent, onOpen, onCreate }: VaultPickerProps) {
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [home, setHome] = useState<string>('');
  const [mode, setMode] = useState<'open' | 'create'>('open');
  const [createName, setCreateName] = useState('SlothMind Vault');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (path?: string) => {
    try {
      setError(null);
      const [dirs, h] = await Promise.all([api.listDirectories(path), api.getHome()]);
      setListing(dirs);
      setHome(h.home);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to browse folders.');
    }
  };

  useEffect(() => {
    if (open) {
      setMode('open');
      setCreateName('SlothMind Vault');
      setError(null);
      void load();
    }
  }, [open]);

  const doOpen = async (path: string) => {
    try {
      setBusy(true);
      setError(null);
      await onOpen(path);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open vault.');
    } finally {
      setBusy(false);
    }
  };

  const doCreate = async () => {
    if (!listing?.path) return;
    try {
      setBusy(true);
      setError(null);
      await onCreate(listing.path, createName.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Open or create a local vault"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setMode('open')}
              className={`rounded-md px-2 py-1 text-sm ${mode === 'open' ? 'bg-sloth-surface text-sloth-text' : 'text-sloth-subtle'}`}
            >
              Open existing
            </button>
            <button
              onClick={() => setMode('create')}
              className={`rounded-md px-2 py-1 text-sm ${mode === 'create' ? 'bg-sloth-surface text-sloth-text' : 'text-sloth-subtle'}`}
            >
              Create new
            </button>
          </div>
          {mode === 'create' && (
            <button
              onClick={() => void doCreate()}
              disabled={busy}
              className="rounded-md bg-sloth-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {busy ? 'Creating...' : 'Create vault here'}
            </button>
          )}
        </div>
      }
    >
      {recent.length > 0 && mode === 'open' && (
        <div className="mb-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-sloth-subtle">Recent</p>
          <div className="flex flex-col gap-1">
            {recent.map((item) => (
              <button
                key={item.path}
                onClick={() => void doOpen(item.path)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sloth-surface"
              >
                <Folder size={16} className="text-sloth-subtle" />
                <div className="min-w-0">
                  <p className="truncate">{item.name}</p>
                  <p className="truncate text-xs text-sloth-subtle">{item.path}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mb-2 flex items-center gap-2 text-sm">
        <button onClick={() => void load(home)} className="flex items-center gap-1 text-sloth-subtle hover:text-sloth-text">
          <Home size={14} />
          Home
        </button>
        {listing?.parent && (
          <button onClick={() => void load(listing.parent!)} className="text-sloth-subtle hover:text-sloth-text">
            Up
          </button>
        )}
        <p className="ml-auto truncate text-xs text-sloth-subtle">{listing?.path}</p>
      </div>
      {mode === 'create' && (
        <div className="mb-3 flex items-center gap-2">
          <FolderPlus size={16} className="text-sloth-subtle" />
          <input
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            className="w-full rounded-md border border-sloth-border bg-sloth-bg px-2 py-1.5 text-sm outline-none focus:border-sloth-accent"
          />
        </div>
      )}
      <div className="max-h-72 overflow-y-auto rounded-lg border border-sloth-border">
        {listing?.directories.map((dir) => (
          <button
            key={dir.path}
            onClick={() => (mode === 'open' ? void doOpen(dir.path) : void load(dir.path))}
            className="flex w-full items-center gap-2 border-b border-sloth-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-sloth-surface"
          >
            <Folder size={16} className="text-sloth-subtle" />
            <span className="truncate">{dir.name}</span>
          </button>
        ))}
        {listing && listing.directories.length === 0 && (
          <p className="px-3 py-2 text-sm text-sloth-subtle">No subfolders here.</p>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </Modal>
  );
}

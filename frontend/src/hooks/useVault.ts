import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { getLastVaultPath, getRecentVaults, rememberVault } from '../services/storage';
import type { HealthResponse, VaultSummary } from '../types';
import type { RecentVault } from '../services/storage';

export function useVault() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<VaultSummary>({ vault: null, indexedNotes: 0 });
  const [recent, setRecent] = useState<RecentVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [h, s] = await Promise.all([api.health(), api.getSession()]);
      setHealth(h);
      setSummary(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the vault service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRecent(getRecentVaults());
    void refresh();
  }, [refresh]);

  const openVault = useCallback(async (path: string) => {
    const result = await api.openVault(path);
    rememberVault(result.vault);
    setRecent(getRecentVaults());
    await refresh();
    return result;
  }, [refresh]);

  const createVault = useCallback(async (parent: string, name: string) => {
    const result = await api.createVault(parent, name);
    rememberVault(result.vault);
    setRecent(getRecentVaults());
    await refresh();
    return result;
  }, [refresh]);

  const lastPath = getLastVaultPath();

  return {
    health,
    summary,
    recent,
    loading,
    error,
    openVault,
    createVault,
    refresh,
    lastPath,
    hasVault: Boolean(summary.vault),
  };
}

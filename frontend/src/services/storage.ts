import type { VaultInfo } from '../types';

const RECENT_VAULTS_KEY = 'slothmind.recentVaults.v1';
const LAST_VAULT_KEY = 'slothmind.lastVault.v1';
const THEME_KEY = 'slothmind.theme.v1';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface RecentVault extends VaultInfo {
  lastOpened: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / private mode failures.
  }
}

export function getRecentVaults(): RecentVault[] {
  const items = read<RecentVault[]>(RECENT_VAULTS_KEY, []);
  return items
    .filter((item) => item && typeof item.path === 'string' && typeof item.name === 'string')
    .slice(0, 8);
}

export function rememberVault(vault: VaultInfo): void {
  const now = new Date().toISOString();
  const existing = getRecentVaults().filter((item) => item.path !== vault.path);
  const updated: RecentVault[] = [{ ...vault, lastOpened: now }, ...existing].slice(0, 8);
  write(RECENT_VAULTS_KEY, updated);
  write(LAST_VAULT_KEY, vault.path);
}

export function getLastVaultPath(): string | null {
  return read<string | null>(LAST_VAULT_KEY, null);
}

export function clearLastVault(): void {
  try {
    localStorage.removeItem(LAST_VAULT_KEY);
  } catch {
    // ignore
  }
}

export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch {
    // ignore
  }
  return 'dark';
}

export function setStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

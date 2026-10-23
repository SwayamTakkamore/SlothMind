import { describe, it, expect, beforeEach } from 'vitest';
import { rememberVault, getRecentVaults, getLastVaultPath, clearLastVault } from '../src/services/storage';

describe('Storage service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves recent vaults', () => {
    expect(getRecentVaults()).toEqual([]);

    rememberVault({
      name: 'Vault Alpha',
      path: '/path/to/alpha',
      notesCount: 5,
    });

    const recent = getRecentVaults();
    expect(recent.length).toBe(1);
    expect(recent[0].name).toBe('Vault Alpha');
    expect(recent[0].path).toBe('/path/to/alpha');
    expect(getLastVaultPath()).toBe('/path/to/alpha');
  });

  it('deduplicates vaults and moves latest to the top', () => {
    rememberVault({ name: 'Alpha', path: '/alpha', notesCount: 1 });
    rememberVault({ name: 'Beta', path: '/beta', notesCount: 2 });
    rememberVault({ name: 'Alpha', path: '/alpha', notesCount: 3 });

    const recent = getRecentVaults();
    expect(recent.length).toBe(2);
    expect(recent[0].name).toBe('Alpha');
    expect(recent[1].name).toBe('Beta');
  });

  it('clears last vault path', () => {
    rememberVault({ name: 'Alpha', path: '/alpha', notesCount: 1 });
    expect(getLastVaultPath()).toBe('/alpha');
    clearLastVault();
    expect(getLastVaultPath()).toBeNull();
  });
});

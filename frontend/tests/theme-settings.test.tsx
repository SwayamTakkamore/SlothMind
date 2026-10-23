import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeToggle } from '../src/components/common/ThemeToggle';
import { SettingsModal } from '../src/components/settings/SettingsModal';
import { getStoredTheme, setStoredTheme } from '../src/services/storage';

describe('Theme and Settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves theme mode correctly', () => {
    expect(getStoredTheme()).toBe('dark');
    setStoredTheme('light');
    expect(getStoredTheme()).toBe('light');
    setStoredTheme('system');
    expect(getStoredTheme()).toBe('system');
  });

  it('renders ThemeToggle and triggers toggle callback', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ThemeToggle isDark={true} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: /switch to light theme/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<ThemeToggle isDark={false} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeDefined();
  });

  it('renders SettingsModal with appearance options and tab switching', async () => {
    const onThemeChange = vi.fn();
    const onClose = vi.fn();
    const onOpenVaultPicker = vi.fn();

    const summary = {
      vault: {
        name: 'My Workspace',
        path: '/workspace/notes',
        openedAt: new Date().toISOString(),
      },
      indexedNotes: 8,
    };

    await act(async () => {
      render(
        <SettingsModal
          open={true}
          onClose={onClose}
          theme="dark"
          onThemeChange={onThemeChange}
          isDark={true}
          summary={summary}
          onOpenVaultPicker={onOpenVaultPicker}
        />
      );
    });

    // Verify modal title and appearance content
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeDefined();
    expect(screen.getByText('Theme & Palette')).toBeDefined();

    // Click Light mode button
    const lightBtn = screen.getByText('Paper Minimal').closest('button');
    expect(lightBtn).toBeDefined();
    if (lightBtn) fireEvent.click(lightBtn);
    expect(onThemeChange).toHaveBeenCalledWith('light');

    // Switch to Vault & Storage tab
    const vaultTab = screen.getByRole('button', { name: /vault & storage/i });
    fireEvent.click(vaultTab);
    expect(screen.getByText('My Workspace')).toBeDefined();
    expect(screen.getByText('8 notes')).toBeDefined();

    // Switch to Local AI tab
    const aiTab = screen.getByRole('button', { name: /local ai/i });
    fireEvent.click(aiTab);
    expect(screen.getByText(/NVIDIA RTX 3050 Laptop GPU/i)).toBeDefined();
    expect(screen.getByText(/SmolLM-135M-Instruct/i)).toBeDefined();

    // Switch to Shortcuts tab
    const shortcutsTab = screen.getByRole('button', { name: /shortcuts/i });
    fireEvent.click(shortcutsTab);
    expect(screen.getByText('Ctrl + Shift + L')).toBeDefined();
    expect(screen.getByText('Ctrl + ,')).toBeDefined();
  });
});

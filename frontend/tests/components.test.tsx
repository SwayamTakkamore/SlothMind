import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StatusBar } from '../src/components/layout/StatusBar';

const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'ok', provider: 'huggingface-local', device: 'cuda:0', gpu: 'NVIDIA GeForce RTX 3050 Laptop GPU' }),
  })
);

Object.assign(global, { fetch: mockFetch });

describe('StatusBar Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const baseSummary = {
    vault: {
      name: 'Test Vault',
      path: '/path/test',
      openedAt: new Date().toISOString(),
    },
    indexedNotes: 3,
  };

  it('renders vault name and indexed notes count', async () => {
    await act(async () => {
      render(<StatusBar summary={baseSummary} saveStatus="saved" activeNote="Welcome.md" />);
    });

    expect(screen.getByText('Test Vault')).toBeDefined();
    expect(screen.getByText('3 indexed notes')).toBeDefined();
    expect(screen.getByText(/Welcome\.md/)).toBeDefined();
    expect(screen.getByText('Saved')).toBeDefined();
    expect(screen.getByText('Local-first')).toBeDefined();
  });

  it('displays saving status when saving is in progress', async () => {
    await act(async () => {
      render(<StatusBar summary={baseSummary} saveStatus="saving" activeNote="Note.md" />);
    });
    expect(screen.getByText('Saving...')).toBeDefined();
  });

  it('displays unsaved changes status', async () => {
    await act(async () => {
      render(<StatusBar summary={baseSummary} saveStatus="unsaved" activeNote="Note.md" />);
    });
    expect(screen.getByText('Unsaved changes')).toBeDefined();
  });

  it('displays error status when save fails', async () => {
    await act(async () => {
      render(<StatusBar summary={baseSummary} saveStatus="error" activeNote="Note.md" />);
    });
    expect(screen.getByText('Save error')).toBeDefined();
  });
});

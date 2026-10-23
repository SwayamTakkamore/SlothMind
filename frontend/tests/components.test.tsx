import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../src/components/layout/StatusBar';

describe('StatusBar Component', () => {
  const baseSummary = {
    hasActiveVault: true,
    vault: {
      name: 'Test Vault',
      path: '/path/test',
      notesCount: 3,
    },
    indexedNotes: 3,
  };

  it('renders vault name and indexed notes count', () => {
    render(<StatusBar summary={baseSummary} saveStatus="saved" activeNote="Welcome.md" />);

    expect(screen.getByText('Test Vault')).toBeDefined();
    expect(screen.getByText('3 indexed notes')).toBeDefined();
    expect(screen.getByText(/Welcome\.md/)).toBeDefined();
    expect(screen.getByText('Saved')).toBeDefined();
    expect(screen.getByText('Local-first')).toBeDefined();
  });

  it('displays saving status when saving is in progress', () => {
    render(<StatusBar summary={baseSummary} saveStatus="saving" activeNote="Note.md" />);
    expect(screen.getByText('Saving...')).toBeDefined();
  });

  it('displays unsaved changes status', () => {
    render(<StatusBar summary={baseSummary} saveStatus="unsaved" activeNote="Note.md" />);
    expect(screen.getByText('Unsaved changes')).toBeDefined();
  });

  it('displays error status when save fails', () => {
    render(<StatusBar summary={baseSummary} saveStatus="error" activeNote="Note.md" />);
    expect(screen.getByText('Save error')).toBeDefined();
  });
});

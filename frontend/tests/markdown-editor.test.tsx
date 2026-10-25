import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor } from '../src/components/editor/MarkdownEditor';

describe('MarkdownEditor Component', () => {
  it('renders in Dynamic mode by default with quick format bar', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="# Hello World"
          onChange={vi.fn()}
          preview={false}
        />
      );
    });

    // Formatting bar buttons
    expect(screen.getByTitle(/Heading 1/i)).toBeDefined();
    expect(screen.getByTitle(/Heading 2/i)).toBeDefined();
    expect(screen.getByTitle(/Heading 3/i)).toBeDefined();
    expect(screen.getByTitle(/Bold/i)).toBeDefined();
    expect(screen.getByTitle(/Italic/i)).toBeDefined();
    expect(screen.getByTitle(/Blockquote/i)).toBeDefined();

    // Mode toggles
    expect(screen.getByText('Dynamic')).toBeDefined();
    expect(screen.getByText('Raw')).toBeDefined();
  });

  it('can switch between Dynamic and Raw source mode', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="Initial note body"
          onChange={vi.fn()}
          preview={false}
        />
      );
    });

    const rawButton = screen.getByTitle(/Raw Markdown Source/i);
    await act(async () => {
      fireEvent.click(rawButton);
    });

    // In Raw mode, the textarea is rendered
    const textarea = screen.getByPlaceholderText(/Start writing in Markdown/i);
    expect(textarea).toBeDefined();

    const dynamicButton = screen.getByTitle(/Dynamic Markdown Editor/i);
    await act(async () => {
      fireEvent.click(dynamicButton);
    });

    // Back in dynamic mode
    expect(screen.queryByPlaceholderText(/Start writing in Markdown/i)).toBeNull();
  });

  it('renders preview mode when preview prop is true', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="# Preview Title"
          onChange={vi.fn()}
          preview={true}
        />
      );
    });

    // Should render an article with the heading
    expect(screen.getByText('Preview Title')).toBeDefined();
    expect(screen.queryByTitle(/Heading 1/i)).toBeNull();
  });
});

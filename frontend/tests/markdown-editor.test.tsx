import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor } from '../src/components/editor/MarkdownEditor';

describe('MarkdownEditor Component', () => {
  it('renders in Dynamic mode by default with full quick format bar including tables and dividers', async () => {
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
    expect(screen.getByTitle(/Underline/i)).toBeDefined();
    expect(screen.getByTitle(/Insert Link/i)).toBeDefined();
    expect(screen.getByTitle(/Task List/i)).toBeDefined();
    expect(screen.getByTitle(/Divider/i)).toBeDefined();
    expect(screen.getByTitle(/Insert Table/i)).toBeDefined();
    expect(screen.getByTitle(/Blockquote/i)).toBeDefined();

    // Mode toggles
    expect(screen.getByText('Dynamic')).toBeDefined();
    expect(screen.getByText('Raw')).toBeDefined();
    expect(screen.getByText(/Centered/i)).toBeDefined();
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

  it('can toggle between centered document width and full width', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="Body text"
          onChange={vi.fn()}
          preview={false}
        />
      );
    });

    const widthButton = screen.getByText(/Centered/i);
    await act(async () => {
      fireEvent.click(widthButton);
    });

    expect(screen.getByText(/Full/i)).toBeDefined();
  });

  it('renders split view with both editor and live rendered preview side-by-side', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="# Split Title"
          onChange={vi.fn()}
          viewMode="split"
        />
      );
    });

    // Should display the live rendered preview column alongside the editor
    expect(screen.getByText(/Live Rendered Preview/i)).toBeDefined();
    // One in editor, one in live preview column
    expect(screen.getAllByText('Split Title').length).toBeGreaterThanOrEqual(2);
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

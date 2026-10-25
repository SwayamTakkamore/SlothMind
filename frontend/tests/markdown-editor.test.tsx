import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor } from '../src/components/editor/MarkdownEditor';
import { SlashCommandMenu } from '../src/components/editor/SlashCommandMenu';

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

  it('renders slash command suggestions menu with all commands', async () => {
    const handleSelect = vi.fn();
    await act(async () => {
      render(
        <SlashCommandMenu
          query=""
          selectedIndex={0}
          onSelect={handleSelect}
          position={{ top: 100, left: 100 }}
          onClose={vi.fn()}
        />
      );
    });

    // All core block commands should be available
    expect(screen.getByText('Ask Notion AI')).toBeDefined();
    expect(screen.getByText('Heading 1')).toBeDefined();
    expect(screen.getByText('Heading 2')).toBeDefined();
    expect(screen.getByText('Heading 3')).toBeDefined();
    expect(screen.getByText('Table')).toBeDefined();
    expect(screen.getByText('To-do List')).toBeDefined();
    expect(screen.getByText('Bulleted List')).toBeDefined();
    expect(screen.getByText('Numbered List')).toBeDefined();
    expect(screen.getByText('Quote')).toBeDefined();
    expect(screen.getByText('Code Block')).toBeDefined();
    expect(screen.getByText('Divider')).toBeDefined();

    // Selecting an item calls onSelect
    const h1Item = screen.getByText('Heading 1');
    await act(async () => {
      fireEvent.click(h1Item);
    });
    expect(handleSelect).toHaveBeenCalledWith('h1');
  });

  it('filters slash commands based on query', async () => {
    await act(async () => {
      render(
        <SlashCommandMenu
          query="tab"
          selectedIndex={0}
          onSelect={vi.fn()}
          position={{ top: 100, left: 100 }}
          onClose={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Table')).toBeDefined();
    expect(screen.queryByText('Heading 1')).toBeNull();
  });
});

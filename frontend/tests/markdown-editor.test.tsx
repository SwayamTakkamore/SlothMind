import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarkdownEditor, indentMarkdownLine, outdentMarkdownLine } from '../src/components/editor/MarkdownEditor';
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

    // Mode toggles & Find/Zoom
    expect(screen.getByText('Dynamic')).toBeDefined();
    expect(screen.getByText('Raw')).toBeDefined();
    expect(screen.getByText(/Centered/i)).toBeDefined();
    expect(screen.getByTitle(/Search within page/i)).toBeDefined();
    expect(screen.getByTitle(/Zoom in/i)).toBeDefined();
    expect(screen.getByTitle(/Zoom out/i)).toBeDefined();
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

  it('can toggle in-page find bar and search content', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="Quick brown sloth jumps over the lazy dog"
          onChange={vi.fn()}
          preview={false}
        />
      );
    });

    const findBtn = screen.getByTitle(/Search within page/i);
    await act(async () => {
      fireEvent.click(findBtn);
    });

    const searchInput = screen.getByPlaceholderText(/Find in page/i);
    expect(searchInput).toBeDefined();

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'sloth' } });
    });

    expect(screen.getByText(/1 of 1/i)).toBeDefined();
  });

  it('can zoom in and out and reset zoom level', async () => {
    await act(async () => {
      render(
        <MarkdownEditor
          value="Sample zoomable text"
          onChange={vi.fn()}
          preview={false}
        />
      );
    });

    const zoomInBtn = screen.getByTitle(/Zoom in/i);
    const zoomOutBtn = screen.getByTitle(/Zoom out/i);
    const zoomResetBtn = screen.getByTitle(/Reset zoom/i);

    expect(zoomResetBtn.textContent).toContain('100%');

    await act(async () => {
      fireEvent.click(zoomInBtn);
    });
    expect(zoomResetBtn.textContent).toContain('110%');

    await act(async () => {
      fireEvent.click(zoomOutBtn);
      fireEvent.click(zoomOutBtn);
    });
    expect(zoomResetBtn.textContent).toContain('90%');

    await act(async () => {
      fireEvent.click(zoomResetBtn);
    });
    expect(zoomResetBtn.textContent).toContain('100%');
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

  it('supports raw mode Notion shortcuts: duplicate, toggle checkbox, and code formatting', async () => {
    const handleChange = vi.fn();
    await act(async () => {
      render(
        <MarkdownEditor
          value="- [ ] Task item to toggle"
          onChange={handleChange}
          preview={false}
        />
      );
    });

    // Switch to Raw mode
    await act(async () => {
      fireEvent.click(screen.getByTitle(/Raw Markdown Source/i));
    });

    const textarea = screen.getByPlaceholderText(/Start writing in Markdown/i) as HTMLTextAreaElement;
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;

    // Test Ctrl+Enter to toggle task checkbox
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    });

    expect(handleChange).toHaveBeenCalledWith('- [x] Task item to toggle');

    // Test Ctrl+D to duplicate line
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'd', ctrlKey: true });
    });

    expect(handleChange).toHaveBeenCalledWith('- [ ] Task item to toggle\n- [ ] Task item to toggle');
  });

  it('Notion lists: Tab indents and nests, Shift+Tab outdents, and numbered lists reset sub-level to 1', () => {
    // Numbered list indent / nest
    expect(indentMarkdownLine('2. Sub item')).toBe('  1. Sub item');
    expect(indentMarkdownLine('  3. Deep nested')).toBe('    1. Deep nested');

    // Bulleted list indent / nest
    expect(indentMarkdownLine('- Bullet point')).toBe('  - Bullet point');
    expect(indentMarkdownLine('  * Nested star')).toBe('    * Nested star');

    // To-Do list indent / nest
    expect(indentMarkdownLine('- [ ] Buy groceries')).toBe('  - [ ] Buy groceries');
    expect(indentMarkdownLine('  - [x] Done task')).toBe('    - [x] Done task');

    // Outdent
    expect(outdentMarkdownLine('  1. Sub item')).toBe('1. Sub item');
    expect(outdentMarkdownLine('  - Bullet point')).toBe('- Bullet point');
    expect(outdentMarkdownLine('    - [ ] Task')).toBe('  - [ ] Task');
  });

  it('Notion lists: pressing Enter in textarea continues the list, and Tab indents numbered item', async () => {
    const handleChange = vi.fn();
    const { unmount } = render(
      <MarkdownEditor
        value="1. First item"
        onChange={handleChange}
        preview={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTitle(/Raw Markdown Source/i));
    });

    const textarea = screen.getByPlaceholderText(/Start writing in Markdown/i) as HTMLTextAreaElement;
    textarea.selectionStart = 13;
    textarea.selectionEnd = 13;

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });

    expect(handleChange).toHaveBeenCalledWith('1. First item\n2. ');

    unmount();

    const handleTabChange = vi.fn();
    render(
      <MarkdownEditor
        value="2. Second item"
        onChange={handleTabChange}
        preview={false}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTitle(/Raw Markdown Source/i));
    });

    const activeTextarea = screen.getByPlaceholderText(/Start writing in Markdown/i) as HTMLTextAreaElement;
    activeTextarea.selectionStart = 2;
    activeTextarea.selectionEnd = 2;

    await act(async () => {
      fireEvent.keyDown(activeTextarea, { key: 'Tab' });
    });

    expect(handleTabChange).toHaveBeenCalledWith('  1. Second item');
  });

  it('renders slash command suggestions menu with all Notion commands', async () => {
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

    // All core Notion commands should be available
    expect(screen.getByText('Ask Notion AI')).toBeDefined();
    expect(screen.getByText('Heading 1')).toBeDefined();
    expect(screen.getByText('Heading 2')).toBeDefined();
    expect(screen.getByText('Heading 3')).toBeDefined();
    expect(screen.getByText('Table')).toBeDefined();
    expect(screen.getByText('Kanban Board')).toBeDefined();
    expect(screen.getByText('Calendar Sprint View')).toBeDefined();
    expect(screen.getByText('To-do List')).toBeDefined();
    expect(screen.getByText('Bulleted List')).toBeDefined();
    expect(screen.getByText('Numbered List')).toBeDefined();
    expect(screen.getByText('Toggle List')).toBeDefined();
    expect(screen.getByText('Callout')).toBeDefined();
    expect(screen.getByText('Quote')).toBeDefined();
    expect(screen.getByText('Code Block')).toBeDefined();
    expect(screen.getByText('Math Equation')).toBeDefined();
    expect(screen.getByText('Table of Contents')).toBeDefined();
    expect(screen.getByText("Today's Date")).toBeDefined();
    expect(screen.getByText('Reminder')).toBeDefined();
    expect(screen.getByText('Daily Standup Template')).toBeDefined();
    expect(screen.getByText('PRD Feature Spec Template')).toBeDefined();
    expect(screen.getByText('Meeting Notes Template')).toBeDefined();

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
          query="kanban"
          selectedIndex={0}
          onSelect={vi.fn()}
          position={{ top: 100, left: 100 }}
          onClose={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Kanban Board')).toBeDefined();
    expect(screen.queryByText('Heading 1')).toBeNull();
  });
});

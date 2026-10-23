import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview: boolean;
}

export function MarkdownEditor({ value, onChange, preview }: MarkdownEditorProps) {
  if (preview) {
    return (
      <div className="h-full overflow-y-auto px-10 py-8">
        <article className="prose prose-sloth mx-auto max-w-3xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*Nothing to preview yet.*'}</ReactMarkdown>
        </article>
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      className="h-full w-full resize-none bg-transparent px-10 py-8 font-mono text-sm leading-7 text-sloth-text outline-none placeholder:text-sloth-subtle"
      placeholder="# Start writing in Markdown..."
    />
  );
}

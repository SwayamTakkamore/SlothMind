import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-24">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-sloth-border bg-sloth-panel shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-sloth-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-sloth-subtle transition hover:bg-sloth-surface hover:text-sloth-text"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>
        <div className="px-4 py-3">{children}</div>
        {footer && <footer className="border-t border-sloth-border px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

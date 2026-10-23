import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToastProps {
  tone: 'info' | 'success' | 'error';
  message: ReactNode;
}

export function Toast({ tone, message }: ToastProps) {
  const styles =
    tone === 'success'
      ? 'border-emerald-400/40 text-emerald-200'
      : tone === 'error'
        ? 'border-red-400/40 text-red-200'
        : 'border-sloth-accent/40 text-sloth-text';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-lg border bg-sloth-panel/95 px-3 py-2 text-sm shadow-lg backdrop-blur ${styles}`}
    >
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}

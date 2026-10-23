import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { SaveStatus } from '../types';

interface UseAutosaveOptions {
  path: string | null;
  content: string;
  original: string;
  delay?: number;
}

export function useAutosave({ path, content, original, delay = 800 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const isDirty = path !== null && content !== original;

  useEffect(() => {
    if (!path) {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setStatus('saved');
      return;
    }
    if (!isDirty) {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (!savingRef.current) setStatus('saved');
      return;
    }
    setStatus('unsaved');
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      void save();
    }, delay);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, content, original, delay, isDirty]);

  const save = async () => {
    if (!path || savingRef.current) return;
    if (contentRef.current === original && status !== 'error') return;
    savingRef.current = true;
    setStatus('saving');
    try {
      await api.writeNote(path, contentRef.current);
      setStatus('saved');
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      console.error('Autosave failed', err);
      setStatus('error');
    } finally {
      savingRef.current = false;
    }
  };

  const saveNow = async () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    await save();
  };

  return { status, isDirty, saveNow, lastSavedAt };
}

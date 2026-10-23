import { useCallback, useEffect, useState } from 'react';
import { getStoredTheme, setStoredTheme } from '../services/storage';
import type { ThemeMode } from '../services/storage';

export type ResolvedTheme = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  const applyTheme = useCallback((mode: ThemeMode) => {
    let active: ResolvedTheme = 'dark';
    if (mode === 'system') {
      const isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      active = isDark ? 'dark' : 'light';
    } else {
      active = mode;
    }

    setResolvedTheme(active);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (active === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      }
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Initial setup & system preference listener
  useEffect(() => {
    applyTheme(theme);

    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme, applyTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}

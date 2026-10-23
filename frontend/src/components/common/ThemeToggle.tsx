import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ isDark, onToggle, className = '', showLabel = false }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`group relative flex items-center justify-center rounded-lg p-2 text-sloth-subtle transition-all duration-300 hover:bg-sloth-surface hover:text-sloth-text active:scale-95 ${className}`}
      title={isDark ? 'Switch to Light theme (Ctrl+Shift+L)' : 'Switch to Dark theme (Ctrl+Shift+L)'}
      aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
    >
      <div className="relative h-4 w-4">
        {/* Sun Icon (Visible in Light mode, rotated/scaled out in Dark mode) */}
        <Sun
          size={16}
          className={`absolute inset-0 text-amber-500 transition-all duration-500 ease-spring ${
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        {/* Moon Icon (Visible in Dark mode, rotated/scaled out in Light mode) */}
        <Moon
          size={16}
          className={`absolute inset-0 text-sloth-accent transition-all duration-500 ease-spring ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-xs font-medium">
          {isDark ? 'Dark mode' : 'Light mode'}
        </span>
      )}
    </button>
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sloth: {
          bg: 'rgb(var(--sloth-bg) / <alpha-value>)',
          panel: 'rgb(var(--sloth-panel) / <alpha-value>)',
          surface: 'rgb(var(--sloth-surface) / <alpha-value>)',
          border: 'rgb(var(--sloth-border) / <alpha-value>)',
          text: 'rgb(var(--sloth-text) / <alpha-value>)',
          subtle: 'rgb(var(--sloth-subtle) / <alpha-value>)',
          accent: 'rgb(var(--sloth-accent) / <alpha-value>)',
          accentHover: 'rgb(var(--sloth-accent-hover) / <alpha-value>)',
          success: 'rgb(var(--sloth-success) / <alpha-value>)',
          warning: 'rgb(var(--sloth-warning) / <alpha-value>)',
          danger: 'rgb(var(--sloth-danger) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

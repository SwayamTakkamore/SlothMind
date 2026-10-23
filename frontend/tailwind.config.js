/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sloth: {
          bg: '#121316',
          panel: '#1a1b20',
          surface: '#22242b',
          border: '#2f323c',
          text: '#e6e6e6',
          subtle: '#9ca0aa',
          accent: '#8b5cf6',
          accentHover: '#a78bfa',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

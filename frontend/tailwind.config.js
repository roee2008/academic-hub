/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#0B0F17',
        surface: {
          1: '#111827',
          2: '#1A2234',
          hover: '#202B42',
        },
        stroke: {
          DEFAULT: '#243048',
          subtle: '#1C2638',
          bright: '#334155',
        },
        accent: {
          indigo: '#6366F1',
          emerald: '#10B981',
          amber: '#F59E0B',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
        },
        content: {
          primary: '#F8FAFC',
          muted: '#94A3B8',
          dim: '#64748B',
        },
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        'modal': '0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px #243048',
        'subtle': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
      },
    },
  },
  plugins: [],
}

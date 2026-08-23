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
        brand: {
          DEFAULT: '#84ce19',
          hover: '#73b814',
        },
        theme: {
          main: 'var(--bg-main)',
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
          border: 'var(--border-color)',
          borderSubtle: 'var(--border-subtle)',
          text: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          sub: 'var(--text-sub)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}

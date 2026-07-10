import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [resolve(here, 'index.html'), resolve(here, 'src/**/*.{js,ts,jsx,tsx}')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec3ff',
          400: '#59a1ff',
          500: '#2f7df5',
          600: '#1a5fe0',
          700: '#1644cc',
          800: '#1842a3',
          900: '#1a3b80',
        },
        teal: {
          500: '#0ea5a4',
          600: '#0d9488',
        },
        // ⚠️ Garder une seule clé `colors` : une clé dupliquée écrase la précédente.
        surface: '#F8FAFC',
        surfaceAccent: '#FFFFFF',
        border: '#E2E8F0',
        textMuted: '#64748B',
        textStrong: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 50px -30px rgba(15, 23, 42, 0.3)',
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.75rem',
      },
    },
  },
  plugins: [],
};

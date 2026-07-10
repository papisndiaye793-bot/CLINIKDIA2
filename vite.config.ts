import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(here, './src'),
    },
  },
  css: {
    // Chemin explicite vers postcss.config.js (indépendant du CWD de lancement).
    // Ne PAS passer d'instance de plugin inline : cela casse la re-génération
    // Tailwind à chaud (les nouvelles classes ne sont plus détectées).
    postcss: here,
  },
  server: {
    port: 5180,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

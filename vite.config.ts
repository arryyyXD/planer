import { defineConfig } from 'vite';
import React from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [React()],
  server: {
    proxy: {
      '/api': {
        target: 'https://app-planer.online',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
});

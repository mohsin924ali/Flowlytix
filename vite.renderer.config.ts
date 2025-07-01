import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@/components': path.resolve(__dirname, 'src/renderer/components'),
      '@/pages': path.resolve(__dirname, 'src/renderer/pages'),
      '@/hooks': path.resolve(__dirname, 'src/renderer/hooks'),
      '@/services': path.resolve(__dirname, 'src/renderer/services'),
      '@/store': path.resolve(__dirname, 'src/renderer/store'),
      '@/types': path.resolve(__dirname, 'src/renderer/types'),
      '@/utils': path.resolve(__dirname, 'src/renderer/utils'),
      '@/mocks': path.resolve(__dirname, 'src/renderer/mocks'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
    host: true,
  },
});

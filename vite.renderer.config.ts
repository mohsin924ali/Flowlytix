import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    target: 'chrome120',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    strictPort: true,
    host: '127.0.0.1',
  },
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
});

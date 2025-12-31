import { defineConfig } from 'vite';

export default defineConfig({
  root: 'test-page',
  server: {
    port: 5173,
    open: false
  },
  build: {
    outDir: '../dist/test-page'
  }
});

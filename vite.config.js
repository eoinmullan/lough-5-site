import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        location: resolve(__dirname, 'location.html'),
        course: resolve(__dirname, 'course.html'),
        results: resolve(__dirname, 'results.html'),
        records: resolve(__dirname, 'records.html'),
        'runner-search': resolve(__dirname, 'runner-search.html'),
        'runner-stats': resolve(__dirname, 'runner-stats.html'),
        guidelines: resolve(__dirname, 'guidelines.html'),
      },
    },
  },
  publicDir: 'assets',
});

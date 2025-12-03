import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SankeyHandLayout',
      fileName: (format) => `sankey-hand-layout.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    cssFileName: 'style',
  },
});

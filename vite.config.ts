import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SankeyHandLayout',
      fileName: (format) => `sankey-hand-layout.${format === 'es' ? 'js' : 'umd.cjs'}`,
      formats: ['es', 'umd'],
      // Emit the bundled CSS as dist/style.css to match the "./style.css" export
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
});

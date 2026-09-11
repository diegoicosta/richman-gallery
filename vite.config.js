import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} */`;

export default defineConfig({
  define: {
    __RMG_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    lib: {
      entry: 'src/ts/richman-gallery.ts',
      name: 'RichmanGallery',
      formats: ['es', 'iife'],
      fileName: (format) =>
        format === 'es' ? 'richman-gallery.esm.js' : 'richman-gallery.min.js'
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        banner
      }
    }
  }
});

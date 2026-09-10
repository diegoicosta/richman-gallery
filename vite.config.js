import { defineConfig } from 'vite';

export default defineConfig({
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
    sourcemap: false
  }
});
